-- GuessWhat: Production Launch Hardening Migration
-- Fixes the 3 pre-launch scalability, bandwidth, and real-money safety bottlenecks:
--   1. Atomic Postgres RPCs for unlimited-scale live leaderboard & crowd feedback
--      (removes PostgREST 1,000-row truncation and N+1 HTTP updates).
--   2. Public CDN-cached Supabase Storage buckets (`avatars`, `media`) with strict RLS.
--   3. Row-locked, idempotent wallet payout & coin top-up RPCs (`payout_requests`,
--      `process_payout_withdrawal`, `credit_wallet_topup`) restricted to service_role.

-- ========================================================= 1. Performance Indexes
create index if not exists idx_audit_logs_target_action
  on public.audit_logs (target_id, action);

create index if not exists idx_audit_logs_actor_target_action
  on public.audit_logs (actor_id, target_id, action);

alter table public.wallet_transactions
  add column if not exists idempotency_key text;

create unique index if not exists idx_wallet_txns_idempotency_key
  on public.wallet_transactions (idempotency_key)
  where idempotency_key is not null;

-- ========================================================= 2. Supabase Storage Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'media',
    'media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_avatars_and_media" on storage.objects;
create policy "public_read_avatars_and_media"
  on storage.objects for select
  using (bucket_id in ('avatars', 'media'));

drop policy if exists "users_manage_own_avatars" on storage.objects;
create policy "users_manage_own_avatars"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff_manage_media" on storage.objects;
create policy "staff_manage_media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

-- ========================================================= 3. Idempotent Payout Ledger & Wallet RPCs
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  reference text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 500),
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null,
  provider text not null default 'paystack',
  provider_transfer_code text,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed', 'reversed')),
  wallet_txn_id bigint references public.wallet_transactions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payout_requests_user_created
  on public.payout_requests (user_id, created_at desc);

alter table public.payout_requests enable row level security;

drop policy if exists "own_or_staff_payout_requests_read" on public.payout_requests;
create policy "own_or_staff_payout_requests_read"
  on public.payout_requests for select
  using (user_id = auth.uid() or public.is_staff());

create or replace function public.process_payout_withdrawal(
  p_user_id uuid,
  p_amount numeric(14, 2),
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_idempotency_key text,
  p_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.payout_requests%rowtype;
  v_user_status public.user_status;
  v_wallet public.wallets%rowtype;
  v_available numeric(14, 2);
  v_new_reward numeric(14, 2);
  v_new_withdrawable numeric(14, 2);
  v_ref text;
  v_txn_id bigint;
  v_payout_id uuid;
  v_settled_at timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required';
  end if;
  if p_amount is null or p_amount < 500 then
    raise exception 'Minimum withdrawal is 500 NGN';
  end if;
  if p_account_number is null or p_account_number !~ '^[0-9]{10}$' then
    raise exception 'Enter a valid 10-digit NUBAN account number';
  end if;

  perform pg_advisory_xact_lock(hashtext('gw_payout_' || p_user_id::text));

  select * into v_existing
  from public.payout_requests
  where idempotency_key = btrim(p_idempotency_key)
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'payoutId', v_existing.id,
      'reference', v_existing.reference,
      'amount', v_existing.amount,
      'bankName', v_existing.bank_name,
      'accountNumber', v_existing.account_number,
      'accountName', v_existing.account_name,
      'status', v_existing.status,
      'settledAt', v_existing.created_at
    );
  end if;

  select status into v_user_status
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Player profile not found';
  end if;
  if v_user_status <> 'active' then
    raise exception 'Withdrawals are paused on this account. Please contact Support.';
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  v_available := coalesce(v_wallet.withdrawable_balance, 0);
  if v_available < p_amount then
    raise exception 'Insufficient withdrawable balance (available: % NGN)', v_available;
  end if;

  v_new_withdrawable := v_available - p_amount;
  v_new_reward := greatest(0, coalesce(v_wallet.reward_balance, 0) - p_amount);
  v_ref := coalesce(
    nullif(btrim(p_reference), ''),
    'NIP-OUT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  );

  update public.wallets
  set withdrawable_balance = v_new_withdrawable,
      reward_balance = v_new_reward,
      updated_at = v_settled_at
  where user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id,
    type,
    coin_delta,
    reward_delta,
    coin_balance_after,
    reward_balance_after,
    reference,
    idempotency_key,
    note
  ) values (
    p_user_id,
    'withdrawal',
    0,
    -p_amount,
    v_wallet.coin_balance,
    v_new_reward,
    v_ref,
    btrim(p_idempotency_key),
    'NIP Payout to ' || btrim(p_bank_name) || ' (' || p_account_number || ' · ' || btrim(p_account_name) || ')'
  )
  returning id into v_txn_id;

  insert into public.payout_requests (
    idempotency_key,
    reference,
    user_id,
    amount,
    bank_name,
    account_number,
    account_name,
    status,
    wallet_txn_id,
    created_at,
    updated_at
  ) values (
    btrim(p_idempotency_key),
    v_ref,
    p_user_id,
    p_amount,
    btrim(p_bank_name),
    p_account_number,
    btrim(p_account_name),
    'completed',
    v_txn_id,
    v_settled_at,
    v_settled_at
  )
  returning id into v_payout_id;

  return jsonb_build_object(
    'ok', true,
    'idempotentReplay', false,
    'payoutId', v_payout_id,
    'reference', v_ref,
    'amount', p_amount,
    'bankName', btrim(p_bank_name),
    'accountNumber', p_account_number,
    'accountName', btrim(p_account_name),
    'withdrawableBalanceAfter', v_new_withdrawable,
    'rewardBalanceAfter', v_new_reward,
    'status', 'completed',
    'settledAt', v_settled_at
  );
end;
$$;

create or replace function public.credit_wallet_topup(
  p_user_id uuid,
  p_coins bigint,
  p_reference text,
  p_idempotency_key text,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_txn public.wallet_transactions%rowtype;
  v_wallet public.wallets%rowtype;
  v_new_coins bigint;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_coins is null or p_coins <= 0 or p_coins > 100000 then
    raise exception 'Invalid coin amount';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required';
  end if;

  perform pg_advisory_xact_lock(hashtext('gw_topup_' || p_user_id::text));

  select * into v_existing_txn
  from public.wallet_transactions
  where idempotency_key = btrim(p_idempotency_key)
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'coinBalanceAfter', v_existing_txn.coin_balance_after,
      'reference', v_existing_txn.reference
    );
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  v_new_coins := coalesce(v_wallet.coin_balance, 0) + p_coins;

  update public.wallets
  set coin_balance = v_new_coins,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id,
    type,
    coin_delta,
    reward_delta,
    coin_balance_after,
    reward_balance_after,
    reference,
    idempotency_key,
    note
  ) values (
    p_user_id,
    'subscription_grant',
    p_coins,
    0,
    v_new_coins,
    coalesce(v_wallet.reward_balance, 0),
    p_reference,
    btrim(p_idempotency_key),
    p_note
  );

  return jsonb_build_object(
    'ok', true,
    'idempotentReplay', false,
    'coinBalanceAfter', v_new_coins,
    'reference', p_reference
  );
end;
$$;

-- ========================================================= 4. Unlimited-Scale Leaderboard & Feedback RPCs
create or replace function public.get_session_guess_count(p_session_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::bigint from public.answers where session_id = p_session_id)
    + coalesce((
      select sum(
        case
          when jsonb_typeof(detail -> 'answers') = 'array' then jsonb_array_length(detail -> 'answers')
          else coalesce((detail ->> 'questions_answered')::int, 0)
        end
      )::bigint
      from public.audit_logs
      where target_id = p_session_id::text
        and action = 'gameplay_attempt_archived'
    ), 0);
$$;

create or replace function public.recalculate_session_leaderboard(
  p_session_id uuid,
  p_entry_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize_structure jsonb;
  v_total_players int := 0;
  v_my_entry jsonb := null;
begin
  if p_session_id is null then
    return jsonb_build_object('totalPlayers', 0, 'myEntry', null);
  end if;

  -- Serialize concurrent leaderboard writes per session so parallel answers never deadlock
  perform pg_advisory_xact_lock(hashtext('gw_lb_' || p_session_id::text));

  if not exists (select 1 from public.session_entries where session_id = p_session_id) then
    delete from public.leaderboards where session_id = p_session_id;
    return jsonb_build_object('totalPlayers', 0, 'myEntry', null);
  end if;

  select
    case
      when jsonb_typeof(prize_structure) = 'array' and jsonb_array_length(prize_structure) > 0
        then prize_structure
      else '[{"rank_from":1,"rank_to":1,"amount":100000},{"rank_from":2,"rank_to":2,"amount":50000},{"rank_from":3,"rank_to":3,"amount":20000},{"rank_from":4,"rank_to":36,"amount":10000}]'::jsonb
    end
  into v_prize_structure
  from public.game_sessions
  where id = p_session_id;

  v_prize_structure := coalesce(
    v_prize_structure,
    '[{"rank_from":1,"rank_to":1,"amount":100000},{"rank_from":2,"rank_to":2,"amount":50000},{"rank_from":3,"rank_to":3,"amount":20000},{"rank_from":4,"rank_to":36,"amount":10000}]'::jsonb
  );

  create temporary table tmp_lb_calc (
    entry_id uuid primary key,
    user_id uuid not null,
    best_points int not null,
    best_ms bigint not null,
    latest_points int not null,
    latest_ms bigint not null,
    attempts_count int not null,
    computed_rank int not null,
    computed_prize numeric(14, 2) not null
  ) on commit drop;

  insert into tmp_lb_calc (
    entry_id,
    user_id,
    best_points,
    best_ms,
    latest_points,
    latest_ms,
    attempts_count,
    computed_rank,
    computed_prize
  )
  with archived_logs as (
    select
      al.id as log_id,
      al.actor_id,
      nullif(al.detail ->> 'entry_id', '') as detail_entry_id,
      coalesce((al.detail ->> 'total_score')::int, 0) as stored_score,
      coalesce((al.detail ->> 'total_response_ms')::bigint, 0) as stored_ms,
      case
        when jsonb_typeof(al.detail -> 'answers') = 'array' then al.detail -> 'answers'
        else '[]'::jsonb
      end as answers_json
    from public.audit_logs al
    where al.target_id = p_session_id::text
      and al.action = 'gameplay_attempt_archived'
  ),
  archived_answers as (
    select
      al.log_id,
      (elem ->> 'question_id')::uuid as question_id,
      (elem ->> 'option_id')::uuid as option_id,
      greatest(0, coalesce((elem ->> 'response_ms')::bigint, 0)) as response_ms,
      coalesce((elem ->> 'is_locked_2x')::boolean, false) as is_locked_2x
    from archived_logs al
    cross join lateral jsonb_array_elements(al.answers_json) as elem
    where (elem ->> 'question_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and (elem ->> 'option_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  all_votes as (
    select a.question_id, a.option_id, a.response_ms::bigint as response_ms
    from public.answers a
    where a.session_id = p_session_id
    union all
    select aa.question_id, aa.option_id, aa.response_ms
    from archived_answers aa
  ),
  vote_agg as (
    select
      question_id,
      option_id,
      count(*)::bigint as picks,
      coalesce(sum(response_ms), 0)::bigint as total_ms
    from all_votes
    group by question_id, option_id
  ),
  option_universe as (
    select
      sq.question_id,
      qo.id as option_id,
      coalesce(qo.position, 0) as opt_pos
    from public.session_questions sq
    join public.question_options qo on qo.question_id = sq.question_id
    where sq.session_id = p_session_id
    union
    select
      va.question_id,
      va.option_id,
      999 as opt_pos
    from vote_agg va
  ),
  option_ranked as (
    select
      ou.question_id,
      ou.option_id,
      row_number() over (
        partition by ou.question_id
        order by
          coalesce(va.picks, 0) desc,
          case
            when coalesce(va.picks, 0) > 0 then coalesce(va.total_ms, 0)
            else 9223372036854775807
          end asc,
          ou.opt_pos asc,
          ou.option_id asc
      ) as opt_rank
    from option_universe ou
    left join vote_agg va
      on va.question_id = ou.question_id and va.option_id = ou.option_id
  ),
  option_points as (
    select
      question_id,
      option_id,
      greatest(11 - opt_rank::int, 1) as pts
    from option_ranked
  ),
  current_attempt_scores as (
    select
      a.entry_id,
      count(*)::int as ans_count,
      coalesce(
        sum(coalesce(op.pts, 1) * (case when a.is_locked_2x then 2 else 1 end)),
        0
      )::int as pts,
      coalesce(sum(a.response_ms), 0)::bigint as ms
    from public.answers a
    left join option_points op
      on op.question_id = a.question_id and op.option_id = a.option_id
    where a.session_id = p_session_id
    group by a.entry_id
  ),
  archived_attempt_dyn as (
    select
      aa.log_id,
      count(*)::int as ans_count,
      coalesce(
        sum(coalesce(op.pts, 1) * (case when aa.is_locked_2x then 2 else 1 end)),
        0
      )::int as pts,
      coalesce(sum(aa.response_ms), 0)::bigint as ms
    from archived_answers aa
    left join option_points op
      on op.question_id = aa.question_id and op.option_id = aa.option_id
    group by aa.log_id
  ),
  entry_archived_logs as (
    select
      e.id as entry_id,
      al.log_id,
      case
        when coalesce(aad.ans_count, 0) > 0 then aad.pts
        else al.stored_score
      end as pts,
      coalesce(nullif(al.stored_ms, 0), aad.ms, 0)::bigint as ms
    from public.session_entries e
    join archived_logs al
      on (al.detail_entry_id = e.id::text or al.actor_id = e.user_id)
    left join archived_attempt_dyn aad on aad.log_id = al.log_id
    where e.session_id = p_session_id
  ),
  entry_archived_counts as (
    select entry_id, count(*)::int as arch_count
    from entry_archived_logs
    group by entry_id
  ),
  candidates as (
    select entry_id, pts, ms, 1 as src_prio
    from entry_archived_logs
    where pts > 0
    union all
    select cas.entry_id, cas.pts, cas.ms, 2 as src_prio
    from current_attempt_scores cas
    where cas.ans_count > 0
    union all
    select
      e.id as entry_id,
      e.total_score as pts,
      coalesce(e.total_response_ms, 0)::bigint as ms,
      3 as src_prio
    from public.session_entries e
    left join current_attempt_scores cas on cas.entry_id = e.id
    left join entry_archived_counts eac on eac.entry_id = e.id
    where e.session_id = p_session_id
      and coalesce(cas.ans_count, 0) = 0
      and coalesce(eac.arch_count, 0) = 0
      and coalesce(e.total_score, 0) > 0
  ),
  best_per_entry as (
    select distinct on (c.entry_id)
      c.entry_id,
      c.pts as best_points,
      c.ms as best_ms
    from candidates c
    order by c.entry_id, c.pts desc, c.ms asc, c.src_prio asc
  ),
  scored_entries as (
    select
      e.id as entry_id,
      e.user_id,
      e.joined_at,
      b.best_points,
      b.best_ms,
      case when coalesce(cas.ans_count, 0) > 0 then cas.pts else b.best_points end as latest_points,
      case when coalesce(cas.ans_count, 0) > 0 then cas.ms else b.best_ms end as latest_ms,
      (
        coalesce(eac.arch_count, 0)
        + (case when coalesce(cas.ans_count, 0) > 0 then 1 else 0 end)
      )::int as attempts_count
    from public.session_entries e
    join best_per_entry b on b.entry_id = e.id
    left join current_attempt_scores cas on cas.entry_id = e.id
    left join entry_archived_counts eac on eac.entry_id = e.id
    where e.session_id = p_session_id
  ),
  ranked_entries as (
    select
      se.*,
      row_number() over (
        order by se.best_points desc, se.best_ms asc, se.joined_at asc, se.entry_id asc
      )::int as computed_rank
    from scored_entries se
  )
  select
    re.entry_id,
    re.user_id,
    re.best_points,
    re.best_ms,
    re.latest_points,
    re.latest_ms,
    re.attempts_count,
    re.computed_rank,
    coalesce((
      select (tier ->> 'amount')::numeric(14, 2)
      from jsonb_array_elements(v_prize_structure) as tier
      where re.computed_rank between (tier ->> 'rank_from')::int and (tier ->> 'rank_to')::int
      limit 1
    ), 0::numeric(14, 2)) as computed_prize
  from ranked_entries re;

  select count(*)::int into v_total_players from tmp_lb_calc;

  -- Single bulk update of session_entries (replaces N HTTP calls)
  update public.session_entries e
  set
    total_score = t.best_points,
    total_response_ms = t.best_ms,
    final_rank = t.computed_rank,
    prize_awarded = t.computed_prize
  from tmp_lb_calc t
  where e.id = t.entry_id;

  -- Atomic upsert + stale pruning on leaderboards (zero empty-table window for concurrent readers)
  delete from public.leaderboards l
  where l.session_id = p_session_id
    and not exists (select 1 from tmp_lb_calc t where t.user_id = l.user_id);

  insert into public.leaderboards (session_id, user_id, rank, points, response_ms, prize)
  select
    p_session_id,
    t.user_id,
    t.computed_rank,
    t.best_points,
    t.best_ms,
    t.computed_prize
  from tmp_lb_calc t
  on conflict (session_id, user_id) do update
  set
    rank = excluded.rank,
    points = excluded.points,
    response_ms = excluded.response_ms,
    prize = excluded.prize;

  if p_entry_id is not null then
    select jsonb_build_object(
      'entryId', t.entry_id,
      'userId', t.user_id,
      'rank', t.computed_rank,
      'points', t.best_points,
      'responseMs', t.best_ms,
      'prize', t.computed_prize,
      'latestPoints', t.latest_points,
      'latestResponseMs', t.latest_ms,
      'attemptsCount', t.attempts_count
    )
    into v_my_entry
    from tmp_lb_calc t
    where t.entry_id = p_entry_id;
  end if;

  return jsonb_build_object(
    'totalPlayers', v_total_players,
    'myEntry', v_my_entry
  );
end;
$$;

create or replace function public.get_session_feedback_summary(
  p_session_id uuid,
  p_user_id uuid default null,
  p_entry_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_option_stats jsonb;
  v_total_entries int := 0;
  v_unique_players int := 0;
  v_archived_plays int := 0;
  v_total_answers_count bigint := 0;
  v_total_answers_ms bigint := 0;
  v_my_entry_record record;
  v_has_my_entry boolean := false;
  v_my_entry jsonb := null;
  v_my_picks jsonb := '[]'::jsonb;
begin
  if p_session_id is null then
    return jsonb_build_object(
      'optionStats', '[]'::jsonb,
      'totalPlays', 0,
      'uniquePlayers', 0,
      'totalGuesses', 0,
      'avgQuestionMs', 0,
      'myEntry', null,
      'myPicks', '[]'::jsonb
    );
  end if;

  with archived_logs as (
    select
      al.id as log_id,
      case
        when jsonb_typeof(al.detail -> 'answers') = 'array' then al.detail -> 'answers'
        else '[]'::jsonb
      end as answers_json
    from public.audit_logs al
    where al.target_id = p_session_id::text
      and al.action = 'gameplay_attempt_archived'
  ),
  archived_answers as (
    select
      (elem ->> 'option_id')::uuid as option_id,
      greatest(0, coalesce((elem ->> 'response_ms')::bigint, 0)) as response_ms
    from archived_logs al
    cross join lateral jsonb_array_elements(al.answers_json) as elem
    where (elem ->> 'option_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  all_votes as (
    select a.option_id, a.response_ms::bigint as response_ms
    from public.answers a
    where a.session_id = p_session_id
    union all
    select aa.option_id, aa.response_ms
    from archived_answers aa
  ),
  agg as (
    select
      option_id,
      count(*)::bigint as selection_count,
      coalesce(sum(response_ms), 0)::bigint as total_ms
    from all_votes
    group by option_id
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'optionId', option_id,
          'selectionCount', selection_count,
          'totalMs', total_ms
        )
      ),
      '[]'::jsonb
    ),
    coalesce(sum(selection_count), 0)::bigint,
    coalesce(sum(total_ms), 0)::bigint
  into v_option_stats, v_total_answers_count, v_total_answers_ms
  from agg;

  select
    count(*)::int,
    count(distinct user_id)::int
  into v_total_entries, v_unique_players
  from public.session_entries
  where session_id = p_session_id;

  select count(*)::int
  into v_archived_plays
  from public.audit_logs
  where target_id = p_session_id::text
    and action = 'gameplay_attempt_archived';

  if p_entry_id is not null or p_user_id is not null then
    select
      e.id,
      e.user_id,
      e.total_score,
      e.total_response_ms,
      e.final_rank,
      e.prize_awarded
    into v_my_entry_record
    from public.session_entries e
    where e.session_id = p_session_id
      and (
        (p_entry_id is not null and e.id = p_entry_id)
        or (p_user_id is not null and e.user_id = p_user_id)
      )
    order by (case when p_entry_id is not null and e.id = p_entry_id then 0 else 1 end) asc
    limit 1;

    if found then
      v_has_my_entry := true;
      v_my_entry := jsonb_build_object(
        'id', v_my_entry_record.id,
        'user_id', v_my_entry_record.user_id,
        'total_score', v_my_entry_record.total_score,
        'total_response_ms', v_my_entry_record.total_response_ms,
        'final_rank', v_my_entry_record.final_rank,
        'prize_awarded', v_my_entry_record.prize_awarded
      );

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'questionId', a.question_id,
            'optionId', a.option_id,
            'responseMs', a.response_ms
          )
        ),
        '[]'::jsonb
      )
      into v_my_picks
      from public.answers a
      where a.entry_id = v_my_entry_record.id;

      if jsonb_array_length(v_my_picks) = 0 then
        select coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'questionId', elem ->> 'question_id',
                'optionId', elem ->> 'option_id',
                'responseMs', coalesce((elem ->> 'response_ms')::int, 0)
              )
            )
            from jsonb_array_elements(
              case
                when jsonb_typeof(al.detail -> 'answers') = 'array' then al.detail -> 'answers'
                else '[]'::jsonb
              end
            ) as elem
            where (elem ->> 'question_id') is not null
              and (elem ->> 'option_id') is not null
          ),
          '[]'::jsonb
        )
        into v_my_picks
        from public.audit_logs al
        where al.target_id = p_session_id::text
          and al.action = 'gameplay_attempt_archived'
          and (
            (al.detail ->> 'entry_id') = v_my_entry_record.id::text
            or al.actor_id = v_my_entry_record.user_id
          )
        order by al.created_at desc, al.id desc
        limit 1;

        v_my_picks := coalesce(v_my_picks, '[]'::jsonb);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'optionStats', coalesce(v_option_stats, '[]'::jsonb),
    'totalPlays', v_total_entries + v_archived_plays,
    'uniquePlayers', v_unique_players,
    'totalGuesses', v_total_answers_count,
    'avgQuestionMs',
      case
        when v_total_answers_count > 0 then round(v_total_answers_ms::numeric / v_total_answers_count::numeric)::int
        else 0
      end,
    'myEntry', v_my_entry,
    'myPicks', coalesce(v_my_picks, '[]'::jsonb)
  );
end;
$$;

-- Update close_session so admin/cron session closes also use unlimited-scale Best-Score + idempotent reward credits
create or replace function public.close_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.game_sessions
  set status = 'closing'
  where id = p_session_id and status in ('active', 'closing');
  if not found then return; end if;

  perform public.recalculate_session_leaderboard(p_session_id, null);

  insert into public.wallet_transactions (
    user_id,
    type,
    reward_delta,
    coin_balance_after,
    reward_balance_after,
    reference,
    idempotency_key,
    note
  )
  select
    w.user_id,
    'reward',
    l.prize,
    w.coin_balance,
    w.reward_balance + l.prize,
    p_session_id::text,
    'session_reward_' || p_session_id::text || '_' || l.user_id::text,
    'Session prize reward (Rank #' || l.rank || ')'
  from public.leaderboards l
  join public.wallets w on w.user_id = l.user_id
  where l.session_id = p_session_id
    and l.prize > 0
    and not exists (
      select 1 from public.wallet_transactions t
      where t.user_id = l.user_id
        and t.type = 'reward'
        and t.reference = p_session_id::text
    )
  on conflict (idempotency_key) where idempotency_key is not null do nothing;

  update public.wallets w
  set
    reward_balance = reward_balance + l.prize,
    withdrawable_balance = withdrawable_balance + l.prize,
    updated_at = now()
  from public.leaderboards l
  where l.session_id = p_session_id
    and l.user_id = w.user_id
    and l.prize > 0
    and exists (
      select 1 from public.wallet_transactions t
      where t.idempotency_key = 'session_reward_' || p_session_id::text || '_' || w.user_id::text
        and t.created_at > now() - interval '1 minute'
    );

  update public.game_sessions
  set status = 'completed'
  where id = p_session_id;
end;
$$;

-- ========================================================= 5. Lock DownPrivileged RPC Permissions
revoke all on function public.process_payout_withdrawal(uuid, numeric, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.process_payout_withdrawal(uuid, numeric, text, text, text, text, text) to service_role;

revoke all on function public.credit_wallet_topup(uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.credit_wallet_topup(uuid, bigint, text, text, text) to service_role;

revoke all on function public.recalculate_session_leaderboard(uuid, uuid) from public, anon, authenticated;
grant execute on function public.recalculate_session_leaderboard(uuid, uuid) to service_role;

revoke all on function public.get_session_feedback_summary(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_session_feedback_summary(uuid, uuid, uuid) to service_role;

revoke all on function public.get_session_guess_count(uuid) from public, anon, authenticated;
grant execute on function public.get_session_guess_count(uuid) to service_role;

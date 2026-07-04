-- GUESS WHAT core schema
-- Invariants:
--   1. Wallet balances change only via wallet_transactions (ledger).
--   2. Answer aggregates are unreadable until the session is completed.
--   3. Billing events are append-only and idempotent on provider_event_id.

create type user_role as enum ('player','support','moderator','finance','fraud','super_admin');
create type user_status as enum ('active','suspended','blocked');
create type question_type as enum ('text','image','number','color');
create type question_status as enum ('draft','submitted','review','approved','scheduled','published','archived');
create type session_status as enum ('upcoming','active','closing','completed');
create type subscription_plan as enum ('daily','weekly','monthly');
create type subscription_status as enum ('pending_consent','active','grace','cancelled','expired');
create type billing_event_type as enum ('consent','charge_success','charge_failed','cancel','unknown');
create type txn_type as enum ('subscription_grant','session_entry','reward','referral_bonus','promo','withdrawal','adjustment');
create type ticket_status as enum ('open','pending','resolved','closed');

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  full_name text not null,
  phone text unique, -- MSISDN, E.164; doubles as VAS billing identity
  country text,
  state text,
  date_of_birth date,
  gender text,
  avatar_url text,
  role user_role not null default 'player',
  status user_status not null default 'active',
  risk_score int not null default 0 check (risk_score between 0 and 100),
  referral_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  referred_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- wallets
create table wallets (
  user_id uuid primary key references profiles (id) on delete cascade,
  coin_balance bigint not null default 0 check (coin_balance >= 0),
  reward_balance numeric(14, 2) not null default 0 check (reward_balance >= 0),
  withdrawable_balance numeric(14, 2) not null default 0 check (withdrawable_balance >= 0),
  updated_at timestamptz not null default now()
);

create table wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id),
  type txn_type not null,
  coin_delta bigint not null default 0,
  reward_delta numeric(14, 2) not null default 0,
  coin_balance_after bigint not null,
  reward_balance_after numeric(14, 2) not null,
  reference text, -- session id, billing event id, admin action id…
  note text,
  created_at timestamptz not null default now()
);
create index on wallet_transactions (user_id, created_at desc);

-- ------------------------------------------------------------ VAS billing
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  msisdn text not null,
  carrier text not null,
  plan subscription_plan not null,
  status subscription_status not null default 'pending_consent',
  coins_per_cycle bigint not null,
  provider text not null default 'mock', -- aggregator adapter key
  provider_ref text, -- aggregator subscription id
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on subscriptions (user_id);
create unique index one_active_sub_per_msisdn on subscriptions (msisdn)
  where status in ('pending_consent', 'active', 'grace');

create table billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  subscription_id uuid references subscriptions (id),
  type billing_event_type not null,
  raw_payload jsonb not null,
  signature_valid boolean not null,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id) -- idempotency
);

-- ---------------------------------------------------------------- content
create table questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  type question_type not null default 'text',
  status question_status not null default 'draft',
  tags text[] not null default '{}',
  notes text,
  content_hash text generated always as (md5(lower(trim(title)))) stored, -- exact-duplicate detection
  author_id uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on questions (status, category);
create index on questions (content_hash);

create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  label text not null,
  media_url text,
  position int not null,
  unique (question_id, position)
);

-- --------------------------------------------------------------- sessions
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status session_status not null default 'upcoming',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  entry_fee_coins bigint not null default 100,
  prize_pool numeric(14, 2) not null default 0,
  prize_structure jsonb not null default '[]', -- [{rank_from,rank_to,amount}]
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on game_sessions (status, ends_at);

create table session_questions (
  session_id uuid not null references game_sessions (id) on delete cascade,
  question_id uuid not null references questions (id),
  position int not null,
  primary key (session_id, question_id),
  unique (session_id, position)
);

create table session_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions (id),
  user_id uuid not null references profiles (id),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score int,
  total_response_ms bigint,
  final_rank int,
  prize_awarded numeric(14, 2) not null default 0,
  unique (session_id, user_id)
);
create index on session_entries (session_id, final_rank);

create table answers (
  id bigint generated always as identity primary key,
  entry_id uuid not null references session_entries (id) on delete cascade,
  session_id uuid not null references game_sessions (id),
  question_id uuid not null references questions (id),
  option_id uuid not null references question_options (id),
  response_ms int not null check (response_ms >= 0),
  answered_at timestamptz not null default now(),
  unique (entry_id, question_id)
);
create index on answers (session_id, question_id, option_id);

-- ------------------------------------------------------------ leaderboard
create table leaderboards (
  session_id uuid not null references game_sessions (id),
  user_id uuid not null references profiles (id),
  rank int not null,
  points int not null,
  response_ms bigint not null,
  prize numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index on leaderboards (session_id, rank);

-- ---------------------------------------------------------------- support
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  subject text not null,
  status ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references support_tickets (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ misc
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);

create table fraud_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id),
  signal text not null, -- device_fingerprint, ip, vpn, emulator, referral_abuse, multi_account
  value jsonb not null,
  weight int not null default 0,
  created_at timestamptz not null default now()
);
create index on fraud_signals (user_id);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('session_defaults', '{"duration_hours":72,"questions_per_session":10,"entry_fee_coins":100}'),
  ('subscription_plans', '{"daily":{"coins":100,"price_ngn":50},"weekly":{"coins":800,"price_ngn":300},"monthly":{"coins":4000,"price_ngn":1000}}'),
  ('fraud_thresholds', '{"flag":31,"suspend":71}');

-- =========================================================== RLS policies
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table subscriptions enable row level security;
alter table billing_events enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table game_sessions enable row level security;
alter table session_questions enable row level security;
alter table session_entries enable row level security;
alter table answers enable row level security;
alter table leaderboards enable row level security;
alter table support_tickets enable row level security;
alter table ticket_messages enable row level security;
alter table notifications enable row level security;
alter table fraud_signals enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

create or replace function jwt_role() returns user_role
language sql stable as $$
  select coalesce(
    (select role from profiles where id = auth.uid()),
    'player'::user_role
  );
$$;

create or replace function is_staff() returns boolean
language sql stable as $$
  select jwt_role() in ('support','moderator','finance','fraud','super_admin');
$$;

-- profiles: self read/update; public leaderboard usernames come via views
create policy "own profile read" on profiles for select using (id = auth.uid() or is_staff());
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- wallets & ledger: read own; writes only via service role (no policy = denied)
create policy "own wallet" on wallets for select using (user_id = auth.uid() or is_staff());
create policy "own txns" on wallet_transactions for select using (user_id = auth.uid() or is_staff());

-- subscriptions: read own; mutations via service role only
create policy "own subs" on subscriptions for select using (user_id = auth.uid() or is_staff());

-- billing events: staff read only; writes via service role
create policy "staff billing read" on billing_events for select using (is_staff());

-- questions: players may read PUBLISHED questions only through sessions;
-- staff manage everything
create policy "staff questions" on questions for all using (is_staff());
create policy "published questions readable" on questions for select
  using (status = 'published');
create policy "options of published" on question_options for select
  using (exists (select 1 from questions q where q.id = question_id and (q.status = 'published' or is_staff())));
create policy "staff options" on question_options for all using (is_staff());

-- sessions: everyone can see; staff manage
create policy "sessions readable" on game_sessions for select using (true);
create policy "staff sessions" on game_sessions for insert with check (is_staff());
create policy "staff sessions upd" on game_sessions for update using (is_staff());
create policy "session questions readable" on session_questions for select using (true);
create policy "staff session questions" on session_questions for all using (is_staff());

-- entries: own only (prevents scanning who answered what)
create policy "own entries" on session_entries for select using (user_id = auth.uid() or is_staff());

-- answers: INVARIANT — a player may read only their own answers; aggregate
-- visibility before close is impossible because no select policy grants it.
create policy "own answers read" on answers for select
  using (exists (select 1 from session_entries e where e.id = entry_id and e.user_id = auth.uid()) or is_staff());

-- leaderboards: public once written (they are only written at close)
create policy "leaderboards readable" on leaderboards for select using (true);

-- support
create policy "own tickets" on support_tickets for select using (user_id = auth.uid() or is_staff());
create policy "open own ticket" on support_tickets for insert with check (user_id = auth.uid());
create policy "own ticket msgs" on ticket_messages for select
  using (exists (select 1 from support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_staff())));
create policy "send ticket msg" on ticket_messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_staff())));

-- notifications
create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- fraud & audit: staff read; writes via service role
create policy "fraud staff read" on fraud_signals for select using (is_staff());
create policy "audit staff read" on audit_logs for select using (jwt_role() = 'super_admin');

-- settings: readable by all (drives client config), writable by super admin
create policy "settings readable" on app_settings for select using (true);
create policy "settings write" on app_settings for update using (jwt_role() = 'super_admin');

-- ===================================================== gameplay functions

-- Join a session: deduct entry fee + create entry atomically.
create or replace function join_session(p_session_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_fee bigint;
  v_entry uuid;
  v_coin_after bigint;
  v_reward numeric(14,2);
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select entry_fee_coins into v_fee
  from game_sessions
  where id = p_session_id and status = 'active'
    and now() between starts_at and ends_at
  for update;
  if not found then raise exception 'session not open'; end if;

  update wallets
  set coin_balance = coin_balance - v_fee, updated_at = now()
  where user_id = v_user and coin_balance >= v_fee
  returning coin_balance, reward_balance into v_coin_after, v_reward;
  if not found then raise exception 'insufficient coins'; end if;

  insert into session_entries (session_id, user_id)
  values (p_session_id, v_user)
  returning id into v_entry;

  insert into wallet_transactions
    (user_id, type, coin_delta, coin_balance_after, reward_balance_after, reference)
  values
    (v_user, 'session_entry', -v_fee, v_coin_after, v_reward, p_session_id::text);

  return v_entry;
end;
$$;

-- Submit an answer with server-side timing authority.
create or replace function submit_answer(
  p_entry_id uuid, p_question_id uuid, p_option_id uuid, p_response_ms int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid;
begin
  select e.session_id into v_session
  from session_entries e
  join game_sessions s on s.id = e.session_id
  where e.id = p_entry_id and e.user_id = auth.uid()
    and s.status = 'active' and now() < s.ends_at;
  if not found then raise exception 'entry not open'; end if;

  if not exists (
    select 1 from session_questions sq
    join question_options o on o.question_id = sq.question_id
    where sq.session_id = v_session
      and sq.question_id = p_question_id and o.id = p_option_id
  ) then
    raise exception 'invalid question/option for session';
  end if;

  insert into answers (entry_id, session_id, question_id, option_id, response_ms)
  values (p_entry_id, v_session, p_question_id, p_option_id, least(p_response_ms, 600000));

  update session_entries e set completed_at = now()
  where e.id = p_entry_id
    and (select count(*) from answers a where a.entry_id = e.id)
      = (select count(*) from session_questions sq where sq.session_id = v_session);
end;
$$;

-- Close a session: rank options, score entries, build leaderboard, pay prizes.
-- Idempotent: re-running recomputes the same result and skips paid prizes.
create or replace function close_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update game_sessions set status = 'closing'
  where id = p_session_id and status in ('active','closing');
  if not found then return; end if;

  -- Score: option rank within each question (most picked = highest points).
  with option_counts as (
    select question_id, option_id, count(*) as picks
    from answers where session_id = p_session_id
    group by question_id, option_id
  ),
  option_points as (
    select oc.question_id, oc.option_id,
      (select count(distinct o.id) from question_options o where o.question_id = oc.question_id)
        - rank() over (partition by oc.question_id order by oc.picks desc) + 1 as points_low_base,
      rank() over (partition by oc.question_id order by oc.picks desc) as r
    from option_counts oc
  ),
  scored as (
    -- 10 points for rank 1 downwards, floor at 1
    select a.entry_id, sum(greatest(11 - op.r, 1)) as score, sum(a.response_ms) as time_ms
    from answers a
    join option_points op on op.question_id = a.question_id and op.option_id = a.option_id
    where a.session_id = p_session_id
    group by a.entry_id
  )
  update session_entries e
  set total_score = s.score, total_response_ms = s.time_ms
  from scored s where e.id = s.entry_id;

  -- Rank entries: score desc, time asc.
  with ranked as (
    select id, user_id, total_score, total_response_ms,
      rank() over (order by total_score desc, total_response_ms asc) as rnk
    from session_entries
    where session_id = p_session_id and total_score is not null
  )
  update session_entries e set final_rank = r.rnk
  from ranked r where e.id = r.id;

  delete from leaderboards where session_id = p_session_id;
  insert into leaderboards (session_id, user_id, rank, points, response_ms, prize)
  select p_session_id, e.user_id, e.final_rank, e.total_score, e.total_response_ms,
    coalesce((
      select (p ->> 'amount')::numeric
      from game_sessions s, jsonb_array_elements(s.prize_structure) p
      where s.id = p_session_id
        and e.final_rank between (p ->> 'rank_from')::int and (p ->> 'rank_to')::int
      limit 1
    ), 0)
  from session_entries e
  where e.session_id = p_session_id and e.final_rank is not null;

  -- Pay prizes not yet paid.
  update session_entries e
  set prize_awarded = l.prize
  from leaderboards l
  where l.session_id = p_session_id and l.user_id = e.user_id
    and e.session_id = p_session_id and e.prize_awarded = 0 and l.prize > 0;

  insert into wallet_transactions
    (user_id, type, reward_delta, coin_balance_after, reward_balance_after, reference)
  select w.user_id, 'reward', l.prize, w.coin_balance, w.reward_balance + l.prize, p_session_id::text
  from leaderboards l
  join wallets w on w.user_id = l.user_id
  where l.session_id = p_session_id and l.prize > 0
    and not exists (
      select 1 from wallet_transactions t
      where t.user_id = l.user_id and t.type = 'reward' and t.reference = p_session_id::text
    );

  update wallets w
  set reward_balance = reward_balance + l.prize, updated_at = now()
  from leaderboards l
  where l.session_id = p_session_id and l.user_id = w.user_id and l.prize > 0
    and exists (
      select 1 from wallet_transactions t
      where t.user_id = w.user_id and t.type = 'reward' and t.reference = p_session_id::text
        and t.created_at > now() - interval '1 minute'
    );

  update game_sessions set status = 'completed' where id = p_session_id;
end;
$$;

-- Auto-provision profile + wallet on signup.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'player_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  );
  insert into wallets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

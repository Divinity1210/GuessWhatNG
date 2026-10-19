-- GUESS WHAT — Viral & Go-To-Market Features Migration
-- Adds:
--   1. Welcome 100 coins + Referral +50/+50 coins on signup
--   2. Turf (State/Campus/Country squad) & Daily Streak tracking on profiles
--   3. 2x Confidence Lock ("Sure Pick") on answers + updated submit_answer & close_session
--   4. Post-session crowd vote breakdown RPC (safe: only returns data for completed sessions)
--   5. Interactive VAS coin top-up & Nigerian bank withdrawal RPCs for go-to-market flow

alter table profiles
  add column if not exists turf text not null default 'Lagos (Eko)',
  add column if not exists streak_days int not null default 1,
  add column if not exists last_daily_poll_date date;

alter table answers
  add column if not exists is_locked_2x boolean not null default false;

-- Allow public leaderboard & referral lookups to read username, avatar_url, turf, referral_code
drop policy if exists "public profile summary read" on profiles;
create policy "public profile summary read" on profiles
  for select using (true);

-- Updated handle_new_user trigger:
-- Grants 100 welcome coins + processes referral_code from user metadata (+50 coins to both!)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ref_code text;
  v_referrer_id uuid;
  v_turf text;
  v_welcome_coins bigint := 100;
  v_ref_bonus bigint := 50;
  v_initial_coins bigint := 100;
  v_referrer_coins_after bigint;
  v_referrer_reward numeric(14,2);
begin
  v_ref_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  v_turf := coalesce(nullif(trim(new.raw_user_meta_data ->> 'turf'), ''), 'Lagos (Eko)');

  if v_ref_code <> '' then
    select id into v_referrer_id
    from profiles
    where referral_code = v_ref_code
    limit 1;
  end if;

  if v_referrer_id is not null then
    v_initial_coins := v_welcome_coins + v_ref_bonus;
  end if;

  insert into profiles (id, username, full_name, phone, referred_by, turf)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'player_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone,
    v_referrer_id,
    v_turf
  );

  insert into wallets (user_id, coin_balance)
  values (new.id, v_initial_coins);

  -- Record welcome bonus in ledger
  insert into wallet_transactions
    (user_id, type, coin_delta, coin_balance_after, reward_balance_after, note)
  values
    (new.id, 'promo', v_welcome_coins, v_welcome_coins, 0, 'Welcome to GuessWhat bonus (100 Free Coins)');

  -- If referred, credit new player +50 and referrer +50
  if v_referrer_id is not null then
    insert into wallet_transactions
      (user_id, type, coin_delta, coin_balance_after, reward_balance_after, reference, note)
    values
      (new.id, 'referral_bonus', v_ref_bonus, v_initial_coins, 0, v_referrer_id::text, 'Referral signup bonus (+50 Coins)');

    update wallets
    set coin_balance = coin_balance + v_ref_bonus, updated_at = now()
    where user_id = v_referrer_id
    returning coin_balance, reward_balance into v_referrer_coins_after, v_referrer_reward;

    if found then
      insert into wallet_transactions
        (user_id, type, coin_delta, coin_balance_after, reward_balance_after, reference, note)
      values
        (v_referrer_id, 'referral_bonus', v_ref_bonus, v_referrer_coins_after, v_referrer_reward, new.id::text, 'Friend joined with your referral code (+50 Coins)');

      insert into notifications (user_id, title, body)
      values (
        v_referrer_id,
        'New Squad Member Joined! +50 Coins',
        coalesce(new.raw_user_meta_data ->> 'username', 'A new player') || ' joined GuessWhat using your referral code!'
      );
    end if;
  end if;

  return new;
end;
$$;

-- Updated submit_answer with optional 2x Confidence Lock (max 1 per entry)
create or replace function submit_answer(
  p_entry_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_response_ms int,
  p_is_locked_2x boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid;
  v_already_locked boolean;
  v_use_lock boolean := coalesce(p_is_locked_2x, false);
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

  if v_use_lock then
    select exists (
      select 1 from answers where entry_id = p_entry_id and is_locked_2x = true
    ) into v_already_locked;
    if v_already_locked then
      v_use_lock := false;
    end if;
  end if;

  insert into answers (entry_id, session_id, question_id, option_id, response_ms, is_locked_2x)
  values (p_entry_id, v_session, p_question_id, p_option_id, least(p_response_ms, 600000), v_use_lock);

  update session_entries e set completed_at = now()
  where e.id = p_entry_id
    and (select count(*) from answers a where a.entry_id = e.id)
      = (select count(*) from session_questions sq where sq.session_id = v_session);
end;
$$;

-- Updated close_session: honours is_locked_2x (doubles points on the player's 2x Confidence Lock question)
create or replace function close_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update game_sessions set status = 'closing'
  where id = p_session_id and status in ('active','closing');
  if not found then return; end if;

  with option_counts as (
    select question_id, option_id, count(*) as picks
    from answers where session_id = p_session_id
    group by question_id, option_id
  ),
  option_points as (
    select oc.question_id, oc.option_id,
      rank() over (partition by oc.question_id order by oc.picks desc) as r
    from option_counts oc
  ),
  scored as (
    select
      a.entry_id,
      sum(greatest(11 - op.r, 1) * (case when a.is_locked_2x then 2 else 1 end)) as score,
      sum(a.response_ms) as time_ms
    from answers a
    join option_points op on op.question_id = a.question_id and op.option_id = a.option_id
    where a.session_id = p_session_id
    group by a.entry_id
  )
  update session_entries e
  set total_score = s.score, total_response_ms = s.time_ms
  from scored s where e.id = s.entry_id;

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
  set reward_balance = reward_balance + l.prize,
      withdrawable_balance = withdrawable_balance + l.prize,
      updated_at = now()
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

-- Safe Post-Session Crowd Breakdown (only returns data when session status = 'completed')
create or replace function get_session_crowd_breakdown(p_session_id uuid)
returns table (
  question_id uuid,
  question_title text,
  option_id uuid,
  option_label text,
  picks bigint,
  percentage numeric,
  points_awarded int
)
language sql stable security definer set search_path = public as $$
  with sess as (
    select id from game_sessions where id = p_session_id and status = 'completed'
  ),
  counts as (
    select
      sq.position as q_pos,
      q.id as q_id,
      q.title as q_title,
      qo.id as o_id,
      qo.label as o_label,
      qo.position as o_pos,
      count(a.id) as pick_count
    from sess
    join session_questions sq on sq.session_id = sess.id
    join questions q on q.id = sq.question_id
    join question_options qo on qo.question_id = q.id
    left join answers a on a.session_id = sess.id and a.question_id = q.id and a.option_id = qo.id
    group by sq.position, q.id, q.title, qo.id, qo.label, qo.position
  ),
  ranked as (
    select
      *,
      sum(pick_count) over (partition by q_id) as total_q_picks,
      rank() over (partition by q_id order by pick_count desc) as rnk
    from counts
  )
  select
    q_id as question_id,
    q_title as question_title,
    o_id as option_id,
    o_label as option_label,
    pick_count as picks,
    case when total_q_picks > 0 then round((pick_count::numeric / total_q_picks::numeric) * 100, 1) else 0 end as percentage,
    greatest(11 - rnk::int, 1) as points_awarded
  from ranked
  order by q_pos asc, pick_count desc, o_pos asc;
$$;

-- Claim Daily Free Poll Streak Bonus (+25 coins once per calendar day)
create or replace function claim_daily_poll_bonus()
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_last_date date;
  v_streak int;
  v_bonus bigint := 25;
  v_coin_after bigint;
  v_reward numeric(14,2);
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select last_daily_poll_date, streak_days into v_last_date, v_streak
  from profiles where id = v_user for update;

  if v_last_date = current_date then
    select coin_balance into v_coin_after from wallets where user_id = v_user;
    return v_coin_after;
  end if;

  if v_last_date = current_date - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  -- Streak milestone boost on 7-day multiples
  if v_streak % 7 = 0 then
    v_bonus := 100;
  elsif v_streak % 3 = 0 then
    v_bonus := 50;
  end if;

  update profiles
  set last_daily_poll_date = current_date,
      streak_days = v_streak,
      updated_at = now()
  where id = v_user;

  update wallets
  set coin_balance = coin_balance + v_bonus, updated_at = now()
  where user_id = v_user
  returning coin_balance, reward_balance into v_coin_after, v_reward;

  insert into wallet_transactions
    (user_id, type, coin_delta, coin_balance_after, reward_balance_after, note)
  values
    (v_user, 'promo', v_bonus, v_coin_after, v_reward, 'Daily Street Heat Poll + Day ' || v_streak || ' Flame Streak');

  return v_coin_after;
end;
$$;

-- VAS Airtime Coin Top-Up RPC
create or replace function topup_coins_vas(
  p_coins bigint,
  p_plan text,
  p_msisdn text,
  p_carrier text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_coin_after bigint;
  v_reward numeric(14,2);
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_coins <= 0 or p_coins > 50000 then raise exception 'invalid coin amount'; end if;

  update wallets
  set coin_balance = coin_balance + p_coins, updated_at = now()
  where user_id = v_user
  returning coin_balance, reward_balance into v_coin_after, v_reward;

  insert into wallet_transactions
    (user_id, type, coin_delta, coin_balance_after, reward_balance_after, reference, note)
  values
    (
      v_user,
      'subscription_grant',
      p_coins,
      v_coin_after,
      v_reward,
      upper(p_carrier) || '-' || p_plan,
      upper(p_carrier) || ' Airtime VAS (' || initcap(p_plan) || ' Plan · ' || p_msisdn || ')'
    );

  return v_coin_after;
end;
$$;

-- Request Bank / Mobile Money Withdrawal RPC
create or replace function request_reward_withdrawal(
  p_amount numeric(14,2),
  p_bank_name text,
  p_account_number text,
  p_account_name text
) returns numeric(14,2)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_coin_after bigint;
  v_reward_after numeric(14,2);
  v_withdrawable_after numeric(14,2);
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 then raise exception 'invalid withdrawal amount'; end if;

  update wallets
  set withdrawable_balance = withdrawable_balance - p_amount,
      reward_balance = greatest(reward_balance - p_amount, 0),
      updated_at = now()
  where user_id = v_user and withdrawable_balance >= p_amount
  returning coin_balance, reward_balance, withdrawable_balance
  into v_coin_after, v_reward_after, v_withdrawable_after;

  if not found then
    raise exception 'insufficient withdrawable balance';
  end if;

  insert into wallet_transactions
    (user_id, type, reward_delta, coin_balance_after, reward_balance_after, reference, note)
  values
    (
      v_user,
      'withdrawal',
      -p_amount,
      v_coin_after,
      v_reward_after,
      p_bank_name || ':' || p_account_number,
      'Payout to ' || p_bank_name || ' (' || p_account_number || ' · ' || p_account_name || ')'
    );

  return v_withdrawable_after;
end;
$$;

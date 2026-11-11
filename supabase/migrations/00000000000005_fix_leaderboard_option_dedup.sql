-- Deduplicate option_universe by (question_id, option_id) and enforce standard 1..10 pt (max 100) consensus scoring
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
      greatest(0, coalesce((elem ->> 'response_ms')::bigint, 0)) as response_ms
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
  raw_option_universe as (
    select
      sq.question_id,
      qo.id as option_id,
      coalesce(qo.position, 0) as opt_pos
    from public.session_questions sq
    join public.question_options qo on qo.question_id = sq.question_id
    where sq.session_id = p_session_id
    union all
    select
      va.question_id,
      va.option_id,
      999999 as opt_pos
    from vote_agg va
  ),
  option_universe as (
    select distinct on (question_id, option_id)
      question_id,
      option_id,
      opt_pos
    from raw_option_universe
    order by question_id, option_id, opt_pos asc
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
      coalesce(sum(coalesce(op.pts, 1)), 0)::int as pts,
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
      coalesce(sum(coalesce(op.pts, 1)), 0)::int as pts,
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

  update public.session_entries e
  set
    total_score = t.best_points,
    total_response_ms = t.best_ms,
    final_rank = t.computed_rank,
    prize_awarded = t.computed_prize
  from tmp_lb_calc t
  where e.id = t.entry_id;

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

revoke all on function public.recalculate_session_leaderboard(uuid, uuid) from public, anon, authenticated;
grant execute on function public.recalculate_session_leaderboard(uuid, uuid) to service_role;

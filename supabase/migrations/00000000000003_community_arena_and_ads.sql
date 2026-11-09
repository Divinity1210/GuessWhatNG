-- GuessWhat: Community Arena, Pulse Polls, and Native Ad Engine

-- 1. Community Posts (Pulse Polls, Debate Topics, Session Verdicts, Sponsored Polls)
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles (id) on delete set null,
  session_id uuid references game_sessions (id) on delete set null,
  question_id uuid references questions (id) on delete set null,
  kind text not null default 'topic' check (kind in ('poll', 'topic', 'verdict', 'sponsored_poll')),
  category text not null default 'General',
  title text not null,
  body text,
  poll_options jsonb not null default '[]'::jsonb, -- [{id, label}]
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden', 'archived')),
  sponsor_name text,
  sponsor_cta_label text,
  sponsor_cta_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_feed
  on community_posts (status, is_pinned desc, created_at desc);
create index if not exists idx_community_posts_category
  on community_posts (category, created_at desc);

-- 2. Community Poll Votes (1-Tap Personal Preference & Public Opinion Data)
create table if not exists community_poll_votes (
  id bigint generated always as identity primary key,
  post_id uuid not null references community_posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  option_id text not null,
  response_ms int not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_community_poll_votes_post
  on community_poll_votes (post_id, option_id);
create index if not exists idx_community_poll_votes_user
  on community_poll_votes (user_id);

-- 3. Community Messages (Fast-Scrolling Live Arena Chat + Thread Replies)
create table if not exists community_messages (
  id bigint generated always as identity primary key,
  room text not null default 'live_arena' check (room in ('live_arena', 'thread')),
  session_id uuid references game_sessions (id) on delete set null,
  post_id uuid references community_posts (id) on delete cascade,
  user_id uuid references profiles (id) on delete cascade,
  is_system boolean not null default false,
  body text not null check (char_length(body) between 1 and 600),
  author_username text not null,
  author_state text,
  author_rank int,
  reactions jsonb not null default '{}'::jsonb,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'flagged')),
  moderation_flag text,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_messages_live
  on community_messages (room, status, created_at desc);
create index if not exists idx_community_messages_post
  on community_messages (post_id, status, created_at asc);

-- 4. Native Community Ads & Sponsor Slots
create table if not exists community_ads (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'feed' check (placement in ('feed', 'chat_banner', 'sidebar')),
  sponsor_name text not null,
  headline text not null,
  body text,
  media_url text,
  cta_label text not null default 'Learn more',
  cta_url text not null,
  adsense_slot_id text,
  target_states text[] not null default '{}',
  active boolean not null default true,
  impressions_count bigint not null default 0,
  clicks_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_ads_active
  on community_ads (active, placement, created_at desc);

-- 5. Community Moderation Mutes
create table if not exists community_mutes (
  user_id uuid primary key references profiles (id) on delete cascade,
  reason text,
  muted_until timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table community_posts enable row level security;
alter table community_poll_votes enable row level security;
alter table community_messages enable row level security;
alter table community_ads enable row level security;
alter table community_mutes enable row level security;

-- Public/Player read policies for published/visible items
drop policy if exists "read published community posts" on community_posts;
create policy "read published community posts" on community_posts
  for select using (status = 'published' or is_staff());

drop policy if exists "staff manage community posts" on community_posts;
create policy "staff manage community posts" on community_posts
  for all using (is_staff());

drop policy if exists "read community poll votes" on community_poll_votes;
create policy "read community poll votes" on community_poll_votes
  for select using (true);

drop policy if exists "read visible community messages" on community_messages;
create policy "read visible community messages" on community_messages
  for select using (status = 'visible' or is_staff());

drop policy if exists "read active community ads" on community_ads;
create policy "read active community ads" on community_ads
  for select using (active = true or is_staff());

drop policy if exists "staff manage community ads" on community_ads;
create policy "staff manage community ads" on community_ads
  for all using (is_staff());

drop policy if exists "staff manage community mutes" on community_mutes;
create policy "staff manage community mutes" on community_mutes
  for all using (is_staff());

-- Add tables to Supabase Realtime publication so Live Chat & Poll Votes stream instantly
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table community_messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table community_posts;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table community_poll_votes;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- Seed starter Pulse Polls, Banter Topics, and Native Sponsor Demo Slots
insert into community_posts (kind, category, title, body, poll_options, is_pinned)
select
  'poll',
  'Banking & Fintech',
  'Which bank or fintech app has the fastest transfer speed for you right now?',
  'Forget hype. When you are standing at a POS or paying a vendor in traffic, which app delivers the alert fastest?',
  '[
    {"id":"opay","label":"OPay"},
    {"id":"moniepoint","label":"Moniepoint"},
    {"id":"gtbank","label":"GTBank"},
    {"id":"kuda","label":"Kuda"},
    {"id":"palmpay","label":"PalmPay"},
    {"id":"zenith","label":"Zenith / Access"}
  ]'::jsonb,
  true
where not exists (select 1 from community_posts limit 1);

insert into community_posts (kind, category, title, body, poll_options, is_pinned)
select
  'poll',
  'Telecoms & Data',
  'Which network gives you the most reliable 4G/5G data in your state this month?',
  'Drop your state in the replies so we see which network actually rules each city.',
  '[
    {"id":"mtn","label":"MTN"},
    {"id":"airtel","label":"Airtel"},
    {"id":"glo","label":"Glo"},
    {"id":"9mobile","label":"9mobile"},
    {"id":"starlink","label":"Starlink / Fiber"}
  ]'::jsonb,
  false
where (select count(*) from community_posts) < 2;

insert into community_posts (kind, category, title, body, poll_options, is_pinned)
select
  'poll',
  'Economy & Policy',
  'Where do you feel rising monthly costs the hardest right now?',
  'Public pulse check across states. Pick the single biggest pressure on your weekly budget and share why below.',
  '[
    {"id":"food","label":"Food & groceries"},
    {"id":"transport","label":"Transport & fuel"},
    {"id":"power","label":"Electricity & generator fuel"},
    {"id":"rent","label":"Rent & housing"},
    {"id":"data","label":"Data & telecoms"}
  ]'::jsonb,
  false
where (select count(*) from community_posts) < 3;

insert into community_posts (kind, category, title, body, is_pinned)
select
  'topic',
  'Game Banter',
  'Lagos vs Abuja vs Port Harcourt: which state is taking 1st place in this live session?',
  'Check the rank badge next to your name when you reply. Fastest minds win ties, so talk your talk.',
  false
where (select count(*) from community_posts) < 4;

insert into community_ads (placement, sponsor_name, headline, body, cta_label, cta_url, active)
select
  'chat_banner',
  'GuessWhat Brand Partners',
  'Reach verified players across all 36 states + FCT with live Pulse Polls',
  'Run sponsored debates and real-time consumer research directly inside the GuessWhat Arena.',
  'Partner with us',
  '/support',
  true
where not exists (select 1 from community_ads where placement = 'chat_banner');

insert into community_ads (placement, sponsor_name, headline, body, cta_label, cta_url, active)
select
  'feed',
  'GuessWhat Insights',
  'Complete your state & profile badge to represent your city on the leaderboard',
  'Players with a verified state tag represent their turf in every Live Arena debate and city ranking.',
  'Update profile badge',
  '/profile',
  true
where not exists (select 1 from community_ads where placement = 'feed');

insert into community_messages (room, is_system, body, author_username, author_state)
select
  'live_arena',
  true,
  'Welcome to the GuessWhat Live Banter Room. Represent your state, debate picks, and keep chat clean. External links and phone numbers are blocked.',
  'GuessWhat Arena',
  'Nigeria'
where not exists (select 1 from community_messages where room = 'live_arena');

-- Run once in the Supabase SQL editor. Auth users are created by invite/email login.
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null default '2025/26',
  max_managers integer not null default 18 check (max_managers between 2 and 18),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  league_id uuid references public.leagues on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues on delete cascade,
  name text not null default 'Current rules',
  is_active boolean not null default true,
  goal_gk integer not null default 10,
  goal_def integer not null default 7,
  goal_mid integer not null default 5,
  goal_fwd integer not null default 4,
  assist integer not null default 3,
  clean_sheet_gk_def integer not null default 4,
  clean_sheet_mid integer not null default 1,
  appearance_60 integer not null default 2,
  appearance_under_60 integer not null default 1,
  yellow_card integer not null default -1,
  red_card integer not null default -3,
  own_goal integer not null default -2,
  penalty_miss integer not null default -2,
  penalty_save integer not null default 5,
  save_three integer not null default 1,
  bonus_1 integer not null default 3,
  bonus_2 integer not null default 2,
  bonus_3 integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.fpl_players (
  fpl_id integer primary key,
  web_name text not null,
  first_name text,
  second_name text,
  team_id integer not null,
  team_name text not null,
  position text not null check (position in ('GK','DEF','MID','FWD')),
  current_price integer not null,
  photo text,
  status text not null default 'a',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues on delete cascade,
  manager_id uuid not null references public.profiles on delete cascade,
  name text not null,
  budget integer not null default 1000,
  unique (league_id, manager_id)
);

create table public.squad_players (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads on delete cascade,
  fpl_id integer not null references public.fpl_players on delete restrict,
  purchase_price integer not null,
  acquired_at timestamptz not null default now(),
  released_at timestamptz,
  unique (squad_id, fpl_id, acquired_at)
);

create unique index active_player_owner on public.squad_players(fpl_id) where released_at is null;

create table public.gameweek_scores (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues on delete cascade,
  manager_id uuid not null references public.profiles on delete cascade,
  gameweek integer not null,
  points integer not null default 0,
  total_points integer not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  unique (league_id, manager_id, gameweek)
);

create table public.transfer_windows (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues on delete cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','open','processing','complete')),
  created_at timestamptz not null default now()
);

create table public.transfer_bids (
  id uuid primary key default gen_random_uuid(),
  window_id uuid not null references public.transfer_windows on delete cascade,
  manager_id uuid not null references public.profiles on delete cascade,
  buy_fpl_id integer not null references public.fpl_players,
  sell_fpl_id integer not null references public.fpl_players,
  maximum_bid integer not null check (maximum_bid > 0),
  winning_bid integer,
  status text not null default 'submitted' check (status in ('submitted','won','lost','invalid')),
  created_at timestamptz not null default now(),
  unique(window_id, manager_id)
);

alter table public.profiles enable row level security;
alter table public.squads enable row level security;
alter table public.squad_players enable row level security;
alter table public.gameweek_scores enable row level security;
alter table public.fpl_players enable row level security;
alter table public.transfer_windows enable row level security;
alter table public.transfer_bids enable row level security;
create policy "league members view profiles" on public.profiles for select using (auth.uid() is not null);
create policy "league members view squads" on public.squads for select using (auth.uid() is not null);
create policy "league members view squad players" on public.squad_players for select using (auth.uid() is not null);
create policy "league members view scores" on public.gameweek_scores for select using (auth.uid() is not null);
create policy "league members view players" on public.fpl_players for select using (auth.uid() is not null);
create policy "league members view windows" on public.transfer_windows for select using (auth.uid() is not null);
create policy "manager submits own bid" on public.transfer_bids for insert with check (auth.uid() = manager_id);
create policy "manager views own bids" on public.transfer_bids for select using (auth.uid() = manager_id);

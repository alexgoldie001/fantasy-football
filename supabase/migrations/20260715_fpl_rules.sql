-- Run this once in Supabase SQL Editor for an existing league.
alter table public.scoring_rules add column if not exists defensive_contribution integer not null default 2;
alter table public.scoring_rules add column if not exists goals_conceded_per_two integer not null default -1;

-- Official FPL scoring, excluding bonus points. Captains and chips are not stored or applied by this app.
update public.scoring_rules
set goal_gk = 6, goal_def = 6, goal_mid = 5, goal_fwd = 4,
    assist = 3, clean_sheet_gk_def = 4, clean_sheet_mid = 1,
    appearance_60 = 2, appearance_under_60 = 1, yellow_card = -1,
    red_card = -3, own_goal = -2, penalty_miss = -2, penalty_save = 5,
    save_three = 1, defensive_contribution = 2, goals_conceded_per_two = -1,
    bonus_1 = 0, bonus_2 = 0, bonus_3 = 0;

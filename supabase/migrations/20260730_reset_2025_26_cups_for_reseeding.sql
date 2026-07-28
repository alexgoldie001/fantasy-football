-- Clear only the generated 2025/26 cup competition so it can be created again.
-- Fixtures, entries and divisions are removed by the database cascade rules.
-- Managers, squads, ownership and all League-tab scores remain untouched.
delete from public.cup_competitions
where season = '2025/26';

-- Removes only incomplete historic cup generations (one division or fewer).
-- Fixture, entry and division rows cascade from the competition row.
delete from public.cup_competitions competition
where competition.season = '2025/26'
  and (select count(*) from public.cup_divisions division where division.competition_id = competition.id) <= 1;

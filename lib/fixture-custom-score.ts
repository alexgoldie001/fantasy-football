import type { FixtureStat } from '@/lib/fixture-stats';

const value = (stat:FixtureStat, identifier:string) => Number(stat.raw?.stats?.find(item => item.identifier === identifier)?.value || 0);

export function fixtureCustomScore(stat:FixtureStat, position:string) {
  const minutes = value(stat, 'minutes');
  const starts = value(stat, 'starts');
  let points = starts > 0 || minutes >= 45 ? 2 : minutes > 0 ? 1 : 0;
  points += value(stat, 'goals_scored') * 5;
  points += value(stat, 'assists') * 3;
  points -= value(stat, 'red_cards') * 3;
  points -= value(stat, 'yellow_cards');
  points -= value(stat, 'penalties_missed') * 2;
  points -= value(stat, 'own_goals') * 3;
  if (position === 'GK') {
    points += value(stat, 'penalties_saved') * 5;
    points += Math.floor(value(stat, 'saves') / 2);
  }
  if (position === 'GK' || position === 'DEF') {
    if (value(stat, 'clean_sheets')) points += minutes >= 60 ? 5 : 2;
    points -= Math.max(0, value(stat, 'goals_conceded') - 1);
  }
  if (position === 'MID') points += Math.floor(value(stat, 'tackles') / 2);
  return points;
}
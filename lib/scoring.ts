export type Rules = Record<string, number>;
export type FplStats = Record<string, number>;

/** Converts official FPL match stats into this league's independently configured score. */
export function calculatePoints(stats: FplStats, position: string, rules: Rules) {
  const n = (key: string) => Number(stats[key] || 0);
  const goal = position === 'GK' ? rules.goal_gk : position === 'DEF' ? rules.goal_def : position === 'MID' ? rules.goal_mid : rules.goal_fwd;
  let total = n('goals_scored') * goal + n('assists') * rules.assist;
  total += n('minutes') >= 60 ? rules.appearance_60 : n('minutes') > 0 ? rules.appearance_under_60 : 0;
  if (n('clean_sheets')) total += (position === 'GK' || position === 'DEF') ? rules.clean_sheet_gk_def : position === 'MID' ? rules.clean_sheet_mid : 0;
  total += n('yellow_cards') * rules.yellow_card + n('red_cards') * rules.red_card + n('own_goals') * rules.own_goal;
  total += n('penalties_missed') * rules.penalty_miss + n('penalties_saved') * rules.penalty_save;
  total += Math.floor(n('saves') / 3) * rules.save_three + n('bonus');
  return total;
}

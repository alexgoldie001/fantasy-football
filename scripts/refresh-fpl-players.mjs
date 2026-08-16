import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnvFile(path) {
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
  }));
}

const env = readEnvFile('.env.local');
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase values are missing from .env.local.');

const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { 'User-Agent': 'TheDraftLeague/1.0' } });
if (!response.ok) throw new Error(`Official FPL feed responded ${response.status}.`);
const fpl = await response.json();
const teams = new Map(fpl.teams.map(team => [team.id, team]));
const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];
const players = fpl.elements.map(player => {
  const team = teams.get(player.team);
  return {
    fpl_id: player.id,
    web_name: player.web_name,
    first_name: player.first_name,
    second_name: player.second_name,
    team_id: player.team,
    team_name: team.name,
    position: positions[player.element_type],
    current_price: player.now_cost,
    // An official Premier League player portrait; the UI uses its stored FPL position for GK/outfield kit treatment.
    photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`,
    status: player.status,
    raw: { ...player, team_code: team.code, team_short_name: team.short_name },
    updated_at: new Date().toISOString(),
  };
});

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { error } = await db.from('fpl_players').upsert(players, { onConflict: 'fpl_id' });
if (error) throw error;
console.log(`Updated ${players.length} official FPL player records for ${fpl.events?.[0]?.deadline_time?.slice(0, 4) || 'the current'} season.`);

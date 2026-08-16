import fs from 'node:fs/promises';

const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { 'User-Agent': 'TheDraftLeague/1.0' } });
if (!response.ok) throw new Error(`Official FPL feed responded ${response.status}.`);
const { teams, events } = await response.json();
const firstDeadline = events?.find(event => event.id === 1)?.deadline_time || '';
if (!String(firstDeadline).startsWith('2026-')) throw new Error('The FPL feed is not yet serving the 2026/27 season.');

await fs.mkdir('public/kits', { recursive: true });
await Promise.all(teams.flatMap(team => [
  { filename:`${team.id}.png`, url:`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.code}-66.png` },
  { filename:`gk_${team.id}.png`, url:`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.code}_1-66.png` },
].map(async kit => {
  const image = await fetch(kit.url);
  if (!image.ok) throw new Error(`Could not download ${kit.filename} from FPL.`);
  await fs.writeFile(`public/kits/${kit.filename}`, Buffer.from(await image.arrayBuffer()));
})));
console.log(`Updated ${teams.length * 2} official FPL kit icons for 2026/27.`);

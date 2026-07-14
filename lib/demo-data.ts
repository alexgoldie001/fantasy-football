export type Player = { id: number; name: string; team: string; position: 'GK'|'DEF'|'MID'|'FWD'; points: number; price: number; ownedBy?: string; form: string };

export const players: Player[] = [
  { id: 1, name: 'Haaland', team: 'Man City', position: 'FWD', points: 86, price: 145, ownedBy: 'North Bank', form: '8.4' },
  { id: 2, name: 'Salah', team: 'Liverpool', position: 'MID', points: 79, price: 132, ownedBy: 'The Gaffers', form: '7.8' },
  { id: 3, name: 'Palmer', team: 'Chelsea', position: 'MID', points: 72, price: 108, ownedBy: 'Offside FC', form: '7.2' },
  { id: 4, name: 'Saka', team: 'Arsenal', position: 'MID', points: 65, price: 102, ownedBy: 'North Bank', form: '6.9' },
  { id: 5, name: 'Isak', team: 'Newcastle', position: 'FWD', points: 60, price: 92, ownedBy: 'The Gaffers', form: '6.0' },
  { id: 6, name: 'Gabriel', team: 'Arsenal', position: 'DEF', points: 49, price: 61, ownedBy: 'Offside FC', form: '5.1' },
  { id: 7, name: 'Raya', team: 'Arsenal', position: 'GK', points: 45, price: 55, ownedBy: 'North Bank', form: '4.5' },
  { id: 8, name: 'Mbeumo', team: 'Brentford', position: 'MID', points: 56, price: 73, form: '6.6' },
  { id: 9, name: 'Watkins', team: 'Aston Villa', position: 'FWD', points: 51, price: 85, form: '5.8' },
  { id: 10, name: 'Robinson', team: 'Fulham', position: 'DEF', points: 38, price: 48, form: '4.2' },
  { id: 11, name: 'Pickford', team: 'Everton', position: 'GK', points: 34, price: 50, form: '3.9' },
  { id: 12, name: 'Semenyo', team: 'Bournemouth', position: 'MID', points: 43, price: 65, form: '5.3' },
];

export const standings = [
  { rank: 1, name: 'North Bank', manager: 'Alex Grant', points: 624, week: 57, change: '—' },
  { rank: 2, name: 'The Gaffers', manager: 'Maya Cole', points: 617, week: 49, change: '↑ 1' },
  { rank: 3, name: 'Offside FC', manager: 'Sam Carter', points: 598, week: 64, change: '↓ 1' },
  { rank: 4, name: 'Sunday League', manager: 'Jamie Lee', points: 574, week: 42, change: '—' },
  { rank: 5, name: 'Clean Sheet', manager: 'Rory Patel', points: 550, week: 51, change: '↑ 2' },
];

import { standings } from '@/lib/demo-data';

export const teamSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function getTeam(slug: string) {
  return standings.find((team) => teamSlug(team.name) === slug);
}

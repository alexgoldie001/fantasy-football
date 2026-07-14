import { TeamView } from '@/components/team-view';
import { getTeam } from '@/lib/teams';
import { notFound } from 'next/navigation';

export default async function OtherTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getTeam(slug)) notFound();
  return <TeamView slug={slug} />;
}

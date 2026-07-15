import { TeamView } from '@/components/team-view';

export default async function OtherTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TeamView slug={slug} />;
}

import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { AuctionSetup } from '@/components/auction-setup';

export default function OfflineAuctionPage(){
  return <AppShell><section className="page-heading"><p className="eyebrow">Commissioner tools</p><h1>Offline auction.</h1><p className="sub">Enter completed auction squads for your managers.</p><Link className="table-link" href="/admin/managers">Back to manage</Link></section><AuctionSetup/></AppShell>;
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ChevronDown, Shield, Trophy, Users, UserRoundCog } from 'lucide-react';

const links = [
  { href: '/', label: 'League', icon: Trophy },
  { href: '/team', label: 'My team', icon: Shield },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/transfers', label: 'Transfers', icon: BarChart3 },
  { href: '/admin/managers', label: 'Manage', icon: UserRoundCog },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">D</span><span>The Draft League<small>2025 / 26</small></span></Link>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={path === href ? 'active' : ''}><Icon size={17}/>{label}</Link>)}</nav>
      <button className="profile">AG <ChevronDown size={15}/></button>
    </header>
    <main>{children}</main>
  </div>;
}

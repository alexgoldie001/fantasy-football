import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'B&G Fantasy Football 2025-26',
  description: 'Your private Premier League fantasy draft.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

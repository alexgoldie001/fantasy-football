import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Draft League',
  description: 'Your private Premier League fantasy draft.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

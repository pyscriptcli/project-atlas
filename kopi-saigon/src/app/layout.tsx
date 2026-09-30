import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KOPI SAIGON | Competitor Atlas',
  description: 'Explore KOPI SAIGON’s competitor landscape and selected map views.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

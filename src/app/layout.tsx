import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'Austin Humphrey | Sports Intelligence Architect',
  description: "I help sports teams win using AI. $42M+ in identified value. Creator of Hidden Value Index™. Book your free consultation.",
  openGraph: {
    title: 'Austin Humphrey | Sports Analytics That Wins Championships',
    description: "$42M+ value identified. 94% prediction accuracy. I turn your team's data into wins.",
    url: 'https://blazesportsintel.com',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

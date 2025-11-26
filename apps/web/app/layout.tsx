import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ImmoFlow - TikTok für Immobilien Investment',
  description:
    'Entdecke Immobilien im TikTok-Style. Swipe durch Properties, erhalte AI-Analysen und finde dein perfektes Investment.',
  keywords: ['Immobilien', 'Investment', 'Deutschland', 'Wohnung kaufen', 'Haus kaufen'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

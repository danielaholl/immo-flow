import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './providers/AuthProvider';
import { SlideshowManagerProvider } from './components/SlideshowManagerContext';

export const metadata: Metadata = {
  title: 'Nestela - Smart investieren. Gemeinsam.',
  description:
    'Smart investieren. Gemeinsam. Entdecke Immobilien, erhalte AI-Analysen und finde dein perfektes Investment.',
  keywords: ['Immobilien', 'Investment', 'Deutschland', 'Wohnung kaufen', 'Haus kaufen'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>
          <SlideshowManagerProvider>
            {children}
          </SlideshowManagerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

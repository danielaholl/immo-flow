import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './providers/AuthProvider';
import { SlideshowManagerProvider } from './components/SlideshowManagerContext';
import { TRPCProvider } from './providers/TRPCProvider';

export const metadata: Metadata = {
  title: 'Nestela - Smart investieren. Gemeinsam.',
  description:
    'Smart investieren. Gemeinsam. Entdecke Immobilien, erhalte AI-Analysen und finde dein perfektes Investment.',
  keywords: ['Immobilien', 'Investment', 'Deutschland', 'Wohnung kaufen', 'Haus kaufen'],
  metadataBase: new URL('http://localhost:3000'),
  other: {
    'charset': 'utf-8',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <TRPCProvider>
          <AuthProvider>
            <SlideshowManagerProvider>
              {children}
            </SlideshowManagerProvider>
          </AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}

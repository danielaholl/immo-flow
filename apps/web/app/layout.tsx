import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './providers/AuthProvider';
import { SlideshowManagerProvider } from './components/SlideshowManagerContext';
import { TRPCProvider } from './providers/TRPCProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Rendito - Smart investieren. Gemeinsam.',
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
    <html lang="de" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors">
        <ErrorBoundary>
          <ThemeProvider>
            <TRPCProvider>
              <AuthProvider>
                <SlideshowManagerProvider>
                  {children}
                </SlideshowManagerProvider>
              </AuthProvider>
            </TRPCProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

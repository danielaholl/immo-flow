import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ImmoFlow Admin - Makler Dashboard',
  description: 'Dashboard für Immobilienmakler - Verwalte deine Properties',
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

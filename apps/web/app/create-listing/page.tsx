'use client';

import { Header } from '../components/Header';
import { PropertyListingManager } from '../components/PropertyListingManager';

export default function CreateListingPage() {
  return (
    <main className="min-h-screen bg-accent-cream">
      <Header />
      <PropertyListingManager />
    </main>
  );
}

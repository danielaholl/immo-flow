'use client';

import { Header } from '../components/Header';
import { PropertyListingManager } from '../components/PropertyListingManager';

export default function ImportListingPage() {
  return (
    <div className="h-screen bg-accent-cream flex flex-col overflow-hidden">
      <Header />
      <PropertyListingManager mode="import" />
    </div>
  );
}

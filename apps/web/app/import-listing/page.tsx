'use client';

import { Header } from '../components/Header';
import { PropertyListingManager } from '../components/PropertyListingManager';

export default function ImportListingPage() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <PropertyListingManager mode="import" />
    </div>
  );
}

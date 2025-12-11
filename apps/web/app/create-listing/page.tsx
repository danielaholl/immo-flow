'use client';

import { Header } from '../components/Header';
import { PropertyListingManager } from './components/PropertyListingManager';

export default function CreateListingPage() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <PropertyListingManager />
    </div>
  );
}

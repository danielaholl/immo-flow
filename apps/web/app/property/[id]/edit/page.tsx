'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { PropertyListingManager } from '@/app/components/PropertyListingManager';

export default function EditListingPage() {
  const params = useParams();
  const propertyId = params.id as string;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <PropertyListingManager propertyId={propertyId} mode="edit" />
    </div>
  );
}

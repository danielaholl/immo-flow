'use client';

import { useParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { PropertyListingManager } from '../../create-listing/components/PropertyListingManager';

export default function EditListingPage() {
  const params = useParams();
  const propertyId = params.id as string;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <PropertyListingManager propertyId={propertyId} />
    </div>
  );
}

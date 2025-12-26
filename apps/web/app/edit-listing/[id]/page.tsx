'use client';

import { useParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { PropertyListingManager } from '../../components/PropertyListingManager';

export default function EditListingPage() {
  const params = useParams();
  const propertyId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0">
          <PropertyListingManager propertyId={propertyId} />
        </div>
      </div>
    </div>
  );
}

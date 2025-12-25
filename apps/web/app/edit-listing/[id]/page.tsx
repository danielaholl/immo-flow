'use client';

import { useParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { PropertyListingManager } from '../../components/PropertyListingManager';
import { SellerKnowledgeManager } from '../../components/SellerKnowledgeManager';

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
        {/* KI-Wissensbasis unterhalb des Editors */}
        <div className="p-4 bg-gray-100 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <SellerKnowledgeManager
              propertyId={propertyId}
              defaultExpanded={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

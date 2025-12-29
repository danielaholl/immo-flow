'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PropertyImagePlaceholder } from '@rendito/ui';

// Thumbnail with error handling
const ThumbnailImage = memo(function ThumbnailImage({
  src,
  alt,
  propertyType,
}: {
  src: string;
  alt: string;
  propertyType?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <PropertyImagePlaceholder
        className="w-full h-full"
        propertyType={propertyType}
        iconSize={24}
        showLabel={false}
        blur={2}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
});

export interface CollapsedThumbnailItem {
  id: string;
  title: string;
  image?: string;
  propertyType?: string;
}

export interface CollapsedThumbnailListProps {
  /** Liste der anzuzeigenden Items */
  items: CollapsedThumbnailItem[];
  /** Aktuell ausgewähltes Item */
  selectedId?: string | null;
  /** Callback bei Auswahl eines Items */
  onSelect: (id: string) => void;
  /** Optionaler Action-Button (z.B. Import, Neu erstellen) */
  actionButton?: {
    href: string;
    title: string;
  };
}

/**
 * CollapsedThumbnailList Component
 *
 * Zeigt eine vertikale Liste von kleinen Thumbnails für die eingeklappte Sidebar.
 * Mit optionalem Action-Button (rund, primary Farbe, Plus-Icon).
 */
export const CollapsedThumbnailList = memo(function CollapsedThumbnailList({
  items,
  selectedId,
  onSelect,
  actionButton,
}: CollapsedThumbnailListProps) {
  return (
    <div className="space-y-2">
      {/* Action Button - Primary, rund */}
      {actionButton && (
        <Link href={actionButton.href}>
          <button
            className="w-[84px] h-[84px] rounded-full flex items-center justify-center
                       bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
            title={actionButton.title}
          >
            <Plus size={36} className="text-white" strokeWidth={2.5} />
          </button>
        </Link>
      )}

      {/* Thumbnails */}
      {items.map((item) => {
        const isSelected = selectedId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-[84px] h-[84px] rounded-xl overflow-hidden border-2 transition-all ${
              isSelected
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            title={item.title}
          >
            {item.image ? (
              <ThumbnailImage
                src={item.image}
                alt={item.title}
                propertyType={item.propertyType}
              />
            ) : (
              <PropertyImagePlaceholder
                className="w-full h-full"
                propertyType={item.propertyType}
                iconSize={24}
                showLabel={false}
                blur={2}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

CollapsedThumbnailList.displayName = 'CollapsedThumbnailList';

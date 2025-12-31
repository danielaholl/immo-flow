'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { PropertyBadge } from './PropertyBadge';
import { SimilarPropertyCardProps } from './types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SimilarPropertyCard({
  property,
  badgeContext,
  onClick,
  href,
}: SimilarPropertyCardProps) {
  const imageUrl = property.images?.[0];
  const hasImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const [imageError, setImageError] = useState(false);
  const showPlaceholder = !hasImage || imageError;

  const content = (
    <div className="relative h-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group cursor-pointer">
      {/* Image */}
      <div className="absolute inset-0">
        {!showPlaceholder ? (
          <Image
            src={imageUrl!}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <ImageOff size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Badge - top left */}
      <div className="absolute top-3 left-3 z-20">
        <PropertyBadge context={badgeContext} property={property} />
      </div>

      {/* Property Info - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h4 className="font-semibold text-white text-sm line-clamp-1 mb-1">
          {property.title}
        </h4>
        <p className="text-xs text-white/70 mb-2 line-clamp-1">{property.location}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-white text-base">
            {formatCurrency(property.price)}
          </span>
          <span className="text-xs text-white/70">
            {property.sqm} m² · {property.rooms} Zi.
          </span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-[320px]">
        {content}
      </Link>
    );
  }

  return (
    <div className="h-[320px]" onClick={onClick}>
      {content}
    </div>
  );
}

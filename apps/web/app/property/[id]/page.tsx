'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPropertyById } from '@immoflow/api';
import { formatPrice, formatArea, formatRooms } from '@immoflow/utils';
import { Badge } from '@immoflow/ui';
import type { Property } from '@immoflow/database';

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperty() {
      try {
        const id = params.id as string;
        const data = await getPropertyById(id);
        if (!data) {
          router.push('/');
          return;
        }
        setProperty(data);
      } catch (error) {
        console.error('Error loading property:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Lade Property...</p>
      </main>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-2xl font-bold text-primary">
            ← ImmoFlow
          </a>
        </div>
      </header>

      {/* Images Gallery */}
      <div className="w-full h-96 bg-gray-200 relative overflow-x-auto flex">
        {property.images.map((image, idx) => (
          <img
            key={idx}
            src={image}
            alt={`${property.title} - Bild ${idx + 1}`}
            className="h-full w-auto object-cover"
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title & Location */}
        <h1 className="text-4xl font-bold text-text-primary mb-2">{property.title}</h1>
        <p className="text-xl text-text-secondary mb-8">📍 {property.location}</p>

        {/* Price & Details */}
        <div className="mb-8">
          <p className="text-5xl font-bold text-text-primary mb-2">
            {formatPrice(property.price)}
          </p>
          <p className="text-lg text-text-secondary">
            {formatArea(property.sqm)} • {formatRooms(property.rooms)}
            {property.yield && ` • 📈 ${property.yield}% Rendite`}
          </p>
        </div>

        {/* AI Score */}
        {property.ai_score && (
          <div className="mb-8 p-6 bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">AI Investment Score</h3>
                <p className="text-sm text-text-secondary">
                  Basierend auf Lage, Preis, Rendite und Zustand
                </p>
              </div>
              <div className="text-5xl font-bold text-success">★ {property.ai_score}</div>
            </div>
          </div>
        )}

        {/* Features */}
        {property.features.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Ausstattung</h3>
            <div className="flex flex-wrap gap-2">
              {property.features.map((feature, idx) => (
                <Badge key={idx}>{feature}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Beschreibung</h3>
            <p className="text-base text-text-primary leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>
        )}

        {/* Highlights */}
        {property.highlights.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Highlights</h3>
            <ul className="space-y-2">
              {property.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {property.red_flags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Zu beachten</h3>
            <ul className="space-y-2">
              {property.red_flags.map((flag, idx) => (
                <li key={idx} className="flex items-start text-warning">
                  <span className="mr-2">⚠️</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-4 mt-12">
          <button className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-lg hover:opacity-90">
            Besichtigung buchen
          </button>
          <button className="flex-1 bg-transparent border-2 border-border text-text-primary font-semibold py-4 px-6 rounded-lg hover:bg-surface">
            Makler kontaktieren
          </button>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProperties } from '@immoflow/api';
import { PropertyCard, ChatAssistant } from '@immoflow/ui';
import type { Property } from '@immoflow/database';

/**
 * Home Page - Property Listing
 */
export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadProperties() {
      try {
        const data = await getProperties({ limit: 12 });
        setProperties(data);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProperties();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement actual search/filtering logic
    console.log('Searching for:', query);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">ImmoFlow</h1>
            <nav className="flex gap-6">
              <Link href="/" className="text-text-primary hover:text-primary">
                Discover
              </Link>
              <Link href="/favorites" className="text-text-secondary hover:text-primary">
                Favorites
              </Link>
              <Link href="/profile" className="text-text-secondary hover:text-primary">
                Profile
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-transparent py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-text-primary mb-4">
            Immobilien Investment im TikTok-Style
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Swipe durch Properties, erhalte AI-Analysen und finde dein perfektes Investment
          </p>
        </div>
      </section>

      {/* AI Chat Assistant */}
      <section className="container mx-auto px-4 py-8">
        <ChatAssistant onSearch={handleSearch} className="max-w-4xl mx-auto" />
      </section>

      {/* Properties Grid */}
      <section className="container mx-auto px-4 py-12">
        <h3 className="text-3xl font-bold text-text-primary mb-8">
          {searchQuery ? `Suchergebnisse für: "${searchQuery}"` : 'Entdecke neue Immobilien'}
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">Lade Immobilien...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">Keine Immobilien gefunden</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <Link key={property.id} href={`/property/${property.id}`}>
                <PropertyCard
                  property={{
                    id: property.id,
                    title: property.title,
                    location: property.location,
                    price: property.price,
                    sqm: property.sqm,
                    rooms: property.rooms,
                    images: property.images,
                    aiScore: property.ai_score || undefined,
                    yield: property.yield || undefined,
                    features: property.features,
                    energyClass: property.energy_class || undefined,
                  }}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-text-inverse py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-bold mb-4">ImmoFlow</h4>
              <p className="text-sm opacity-80">
                Die moderne Plattform für Immobilien-Investment in Deutschland
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="opacity-80 hover:opacity-100">
                    Über uns
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="opacity-80 hover:opacity-100">
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link href="/imprint" className="opacity-80 hover:opacity-100">
                    Impressum
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="opacity-80 hover:opacity-100">
                    Datenschutz
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="opacity-80 hover:opacity-100">
                    AGB
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm opacity-80">
            © {new Date().getFullYear()} ImmoFlow. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </main>
  );
}

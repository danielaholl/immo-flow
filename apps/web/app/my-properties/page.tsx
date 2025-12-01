'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { getPropertiesByUserId, activateProperty, deactivateProperty } from '@immoflow/api';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { LocationDisplay } from '../components/LocationDisplay';
import { MapPin, Home, Plus, Eye, Pencil, Power, ChartNoAxesCombined, TrendingUp, Heart } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'archived' | 'pending' | 'sold';

export default function MyPropertiesPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/my-properties');
      return;
    }

    if (user) {
      loadProperties();
    }
  }, [user, authLoading, router]);

  const loadProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getPropertiesByUserId(user.id);
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (propertyId: string) => {
    try {
      setActivatingId(propertyId);
      await activateProperty(propertyId);
      setProperties(prev => prev.map(p =>
        p.id === propertyId ? { ...p, status: 'active' } : p
      ));
    } catch (error) {
      console.error('Error activating property:', error);
      alert('Fehler beim Aktivieren des Inserats.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async (propertyId: string) => {
    try {
      setDeactivatingId(propertyId);
      const result = await deactivateProperty(propertyId);
      console.log('Deactivation result:', result);
      setProperties(prev => prev.map(p =>
        p.id === propertyId ? { ...p, status: 'archived' } : p
      ));
    } catch (error: any) {
      console.error('Error deactivating property:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      alert(`Fehler beim Deaktivieren des Inserats: ${error?.message || 'Unbekannter Fehler'}`);
    } finally {
      setDeactivatingId(null);
    }
  };

  // Filter properties based on selected status
  const filteredProperties = properties.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Sort properties: when filter is 'all', show active properties first, then archived
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (statusFilter === 'all') {
      // Active properties (active, pending, sold) come before archived
      const aIsActive = a.status !== 'archived';
      const bIsActive = b.status !== 'archived';

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
    }
    return 0;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#22C55E';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return { label: 'Aktiv', bg: 'bg-green-500', text: 'text-white' };
      case 'pending':
        return { label: 'Ausstehend', bg: 'bg-yellow-500', text: 'text-white' };
      case 'archived':
        return { label: 'Deaktiviert', bg: 'bg-gray-500', text: 'text-white' };
      case 'sold':
        return { label: 'Verkauft', bg: 'bg-blue-500', text: 'text-white' };
      default:
        return { label: status || 'Unbekannt', bg: 'bg-gray-500', text: 'text-white' };
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-gray-500">Lade Immobilien...</p>
        </div>
      </main>
    );
  }

  const selectedProperty = sortedProperties[selectedIndex];

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {properties.length === 0 ? (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home size={48} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Noch keine Immobilien
            </h2>
            <p className="text-gray-500 mb-6">
              Erstellen Sie Ihr erstes Immobilienangebot
            </p>
            <Link href="/create-listing">
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                <Plus size={20} />
                Immobilie hinzufügen
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
          {/* Left Column - Properties List */}
          <div className="lg:w-1/4 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Meine Inserate</h1>
                  <p className="text-gray-500 text-sm">{properties.length} Immobilien</p>
                </div>
                <Link href="/create-listing">
                  <button className="p-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                    <Plus size={20} />
                  </button>
                </Link>
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => { setStatusFilter('all'); setSelectedIndex(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle ({properties.length})
                </button>
                <button
                  onClick={() => { setStatusFilter('active'); setSelectedIndex(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Aktiv ({properties.filter(p => p.status === 'active').length})
                </button>
                <button
                  onClick={() => { setStatusFilter('archived'); setSelectedIndex(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'archived'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Deaktiviert ({properties.filter(p => p.status === 'archived').length})
                </button>
              </div>

              <div className="space-y-3">
                {sortedProperties.map((property, index) => {
                  const isSelected = index === selectedIndex;
                  const statusBadge = getStatusBadge(property.status || 'pending');

                  return (
                    <div
                      key={property.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`group cursor-pointer bg-white border rounded-xl overflow-hidden transition-all ${
                        isSelected
                          ? 'border-primary shadow-md ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex min-h-[120px]">
                        {/* Thumbnail */}
                        <div className="relative w-28 flex-shrink-0 bg-gray-100">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home size={32} className="text-gray-300" />
                            </div>
                          )}
                          <div className={`absolute top-1 left-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                          <p className="text-primary font-bold" style={{ fontSize: '16.8px' }}>{formatPrice(property.price)}</p>
                          <h3 className="font-medium text-gray-900 truncate mt-0.5" style={{ fontSize: '16.8px' }}>{property.title}</h3>
                          <p className="text-gray-500 mt-1 flex items-center gap-1 truncate" style={{ fontSize: '14.4px' }}>
                            <MapPin size={12} className="flex-shrink-0" />
                            <span className="truncate">{property.location}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-gray-500" style={{ fontSize: '14.4px' }}>
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {(property as any).unique_viewers || 0}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Heart size={12} />
                              {(property as any).favorites_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Property Details (same as detail page) */}
          <div className="lg:w-3/4 flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
            {selectedProperty ? (
              <>
                {/* Left - Image Slideshow */}
                <div className="lg:w-1/2 lg:sticky lg:top-0 lg:h-full p-4 lg:p-6">
                  <PropertyImageSlideshow
                    images={selectedProperty.images}
                    title={selectedProperty.title}
                    className="h-full shadow-xl"
                    showCounter={true}
                    showProgressBars={true}
                    slideshowId={`my-properties-${selectedProperty.id}`}
                  />
                </div>

                {/* Right - Property Details (Scrollable) */}
                <div className="lg:w-1/2 lg:overflow-y-auto p-4 lg:p-8 flex flex-col lg:h-full">
                  {/* Status Badge */}
                  <div className="mb-4">
                    {(() => {
                      const badge = getStatusBadge(selectedProperty.status);
                      return (
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Price */}
                  <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '33px' }}>
                    {formatPrice(selectedProperty.price)}
                  </h1>

                  {/* Location */}
                  <LocationDisplay
                    location={selectedProperty.location}
                    address={selectedProperty.address}
                    showAddress={true}
                    className="mb-4"
                    style={{ fontSize: '18px' }}
                  />

                  {/* Title */}
                  <h2 className="font-semibold text-gray-900 mb-6" style={{ fontSize: '22px' }}>
                    {selectedProperty.title}
                  </h2>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-500">Zimmer</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedProperty.rooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fläche</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedProperty.sqm} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preis/m²</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatPrice(Math.round(selectedProperty.price / selectedProperty.sqm))}
                      </p>
                    </div>
                  </div>

                  {/* Stats (Views & Favorites) */}
                  <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Eye size={24} className="text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Aufrufe</p>
                        <p className="text-xl font-bold text-gray-900">{selectedProperty.views || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Heart size={24} className="text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Favoriten</p>
                        <p className="text-xl font-bold text-gray-900">{selectedProperty.favorites_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Yield */}
                  {selectedProperty.yield && (
                    <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-200">
                      <ChartNoAxesCombined size={20} className="text-gray-700" />
                      <span className="text-lg font-semibold text-gray-900">{selectedProperty.yield}% Rendite</span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedProperty.description && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Beschreibung</h3>
                      <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                        {selectedProperty.description}
                      </p>
                    </div>
                  )}

                  {/* Features */}
                  {selectedProperty.features && selectedProperty.features.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausstattung</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProperty.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-full text-base font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KI-Bewertung */}
                  {selectedProperty.ai_score && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={20} className="text-gray-700" />
                            <h3 className="text-lg font-semibold text-gray-900">KI-Bewertung</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: getScoreColor(selectedProperty.ai_score) }}
                            />
                            <span className="text-2xl font-bold text-gray-900">{selectedProperty.ai_score}/100</span>
                          </div>
                        </div>

                        {/* Score Categories */}
                        <div className="space-y-4">
                          {/* Lage */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Lage</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(95, selectedProperty.ai_score + 3)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.min(95, selectedProperty.ai_score + 3)}</span>
                          </div>

                          {/* Rendite */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Rendite</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(70, selectedProperty.ai_score - 7)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.max(70, selectedProperty.ai_score - 7)}</span>
                          </div>

                          {/* Wertsteigerung */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Wertsteigerung</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(95, selectedProperty.ai_score + 3)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.min(95, selectedProperty.ai_score + 3)}</span>
                          </div>

                          {/* Steuervorteile */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Steuervorteile</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(75, selectedProperty.ai_score - 2)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.max(75, selectedProperty.ai_score - 2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {selectedProperty.highlights && selectedProperty.highlights.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Highlights</h3>
                      <ul className="space-y-2">
                        {selectedProperty.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span className="text-gray-700" style={{ fontSize: '18px' }}>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Red Flags */}
                  {selectedProperty.red_flags && selectedProperty.red_flags.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Zu beachten</h3>
                      <ul className="space-y-2">
                        {selectedProperty.red_flags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-600">
                            <span>⚠️</span>
                            <span style={{ fontSize: '18px' }}>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto bg-white pt-4 pb-4">
                    <button
                      onClick={() => router.push(`/property/${selectedProperty.id}/edit`)}
                      className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Pencil size={20} />
                      Bearbeiten
                    </button>
                    {selectedProperty.status === 'archived' ? (
                      <button
                        onClick={() => handleActivate(selectedProperty.id)}
                        disabled={activatingId === selectedProperty.id}
                        className="flex-1 bg-green-500 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-600 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Power size={20} />
                        {activatingId === selectedProperty.id ? 'Aktivieren...' : 'Aktivieren'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivate(selectedProperty.id)}
                        disabled={deactivatingId === selectedProperty.id}
                        className="flex-1 bg-white border-2 border-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-xl hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Power size={20} />
                        {deactivatingId === selectedProperty.id ? 'Deaktivieren...' : 'Deaktivieren'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {sortedProperties.length === 0 ? (
                  <div className="text-center">
                    <p>Keine Immobilien mit diesem Status</p>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="mt-2 text-primary hover:underline"
                    >
                      Alle anzeigen
                    </button>
                  </div>
                ) : (
                  'Wählen Sie eine Immobilie aus der Liste'
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

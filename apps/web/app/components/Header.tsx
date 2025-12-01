'use client';

import Link from 'next/link';
import { Heart, HouseHeart } from 'lucide-react';
import { useAuthContext } from '../providers/AuthProvider';
import { useState, useEffect } from 'react';
import { getPropertiesByUserId } from '@immoflow/api';

export function Header() {
  const { user, profile, loading } = useAuthContext();
  const [propertiesCount, setPropertiesCount] = useState<number>(0);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Load user properties count
  useEffect(() => {
    const loadPropertiesCount = async () => {
      if (!user) {
        setPropertiesCount(0);
        setLoadingProperties(false);
        return;
      }

      try {
        const properties = await getPropertiesByUserId(user.id);
        setPropertiesCount(properties.length);
      } catch (error) {
        console.error('Error loading properties count:', error);
        setPropertiesCount(0);
      } finally {
        setLoadingProperties(false);
      }
    };

    loadPropertiesCount();
  }, [user]);

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50 h-20">
      <div className="container mx-auto px-4 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            <HouseHeart className="text-primary" size={28} strokeWidth={2} />
            <h1 className="cursor-pointer text-2xl flex items-center">
              <span className="font-bold text-black">Nest</span>
              <span className="font-bold italic text-primary" style={{ fontFamily: 'Georgia, serif' }}>ela</span>
              <Heart className="text-primary ml-0.5" size={16} fill="currentColor" strokeWidth={0} />
            </h1>
          </Link>
          <nav className="flex gap-6 items-center">
            <Link href="/" className="text-text-primary hover:text-primary text-base">
              Discover
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/favorites" className="text-text-primary hover:text-primary text-base">
                      Favoriten
                    </Link>
                    {!loadingProperties && (
                      propertiesCount === 0 ? (
                        <Link href="/create-listing" className="text-text-primary hover:text-primary text-base">
                          Inserat erstellen
                        </Link>
                      ) : (
                        <Link href="/my-properties" className="text-text-primary hover:text-primary text-base">
                          Meine Inserate
                        </Link>
                      )
                    )}
                    <Link href="/profile" className="text-text-primary hover:text-primary text-base font-medium">
                      Profil
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={`${profile.first_name} ${profile.last_name}`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold border-2 border-primary">
                          {profile?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="text-text-secondary hover:text-primary text-base">
                      Anmelden
                    </Link>
                    <Link href="/auth/signup">
                      <button className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-base font-medium">
                        Registrieren
                      </button>
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

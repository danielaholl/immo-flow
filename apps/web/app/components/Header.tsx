'use client';

import Link from 'next/link';
import { Heart, HouseHeart, MessageSquare, Compass, Star, Link2, Home, User, LogIn, UserPlus } from 'lucide-react';
import { useAuthContext } from '../providers/AuthProvider';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { onUnreadCountUpdate } from '@/lib/socket';

export function Header() {
  const { user, profile, loading } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  const { data: unreadData } = trpc.messaging.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Update unread count from query
  useEffect(() => {
    if (unreadData) {
      setUnreadCount(unreadData.unreadCount);
    }
  }, [unreadData]);

  // Listen for real-time unread count updates
  useEffect(() => {
    if (!user) return;

    const handleUnreadUpdate = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    onUnreadCountUpdate(handleUnreadUpdate);

    return () => {
      // Cleanup listener handled by socket disconnect
    };
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
              <div className="flex items-center gap-1.5">
                <Compass size={18} />
                <span>Entdecken</span>
              </div>
            </Link>
            {loading ? (
              // Skeleton loader while auth is loading
              <div className="flex gap-6 items-center">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            ) : (
              <>
                {user ? (
                  <>
                    <Link href="/favorites" className="text-text-primary hover:text-primary text-base">
                      <div className="flex items-center gap-1.5">
                        <Heart size={18} />
                        <span>Favoriten</span>
                      </div>
                    </Link>
                    <Link href="/my-properties" className="text-text-primary hover:text-primary text-base">
                      <div className="flex items-center gap-1.5">
                        <Home size={18} />
                        <span>Inserate</span>
                      </div>
                    </Link>
                    <Link href="/messages" className="text-text-primary hover:text-primary text-base relative">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={18} />
                        <span>Nachrichten</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/import-listing" className="text-text-primary hover:text-primary text-base">
                      <div className="flex items-center gap-1.5">
                        <Link2 size={18} />
                        <span>Importieren</span>
                      </div>
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
                      <div className="flex items-center gap-1.5">
                        <LogIn size={18} />
                        <span>Anmelden</span>
                      </div>
                    </Link>
                    <Link href="/auth/signup">
                      <button className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-base font-medium flex items-center gap-1.5">
                        <UserPlus size={18} />
                        <span>Registrieren</span>
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

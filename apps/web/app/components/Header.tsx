'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, HouseHeart, MessageSquare, Compass, Home, User, LogIn, UserPlus, Menu, X, Tag } from 'lucide-react';
import { useAuthContext } from '../providers/AuthProvider';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useUnreadCountListener } from '@/lib/socket';

export function Header() {
  const { user, profile, loading } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Fetch unread count (wait for auth to finish loading)
  const { data: unreadData } = trpc.messaging.getUnreadCount.useQuery(undefined, {
    enabled: !loading && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Update unread count from query
  useEffect(() => {
    if (unreadData) {
      setUnreadCount(unreadData.unreadCount);
    }
  }, [unreadData]);

  // Listen for real-time unread count updates using the safe hook
  useUnreadCountListener((data) => {
    if (user) {
      setUnreadCount(data.unreadCount);
    }
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Main Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50 h-16 lg:h-20">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <HouseHeart className="text-primary lg:w-7 lg:h-7" size={24} strokeWidth={2} />
              <h1 className="cursor-pointer text-xl lg:text-2xl flex items-center">
                <span className="font-bold text-primary">Nestando</span>
              </h1>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden lg:flex gap-6 items-center">
              <Link href="/" className="text-text-primary hover:text-primary text-base">
                <div className="flex items-center gap-1.5">
                  <Compass size={18} />
                  <span>Entdecken</span>
                </div>
              </Link>
              <Link href="/pricing" className="text-text-primary hover:text-primary text-base">
                <div className="flex items-center gap-1.5">
                  <Tag size={18} />
                  <span>Preise</span>
                </div>
              </Link>
              {loading ? (
                // Skeleton loader while auth is loading
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse"></div>
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
                      <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        {profile?.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold border-2 border-primary">
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

            {/* Mobile Menu Button - Shown only on mobile when NOT logged in */}
            {!loading && !user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-primary transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Only for non-logged-in users */}
      {isMobileMenuOpen && !user && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-16 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col p-6 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="w-full h-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  <Link
                    href="/pricing"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Tag size={24} className="text-primary" />
                    <span className="text-lg font-medium text-gray-900">Preise</span>
                  </Link>

                  <Link
                    href="/auth/login"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn size={24} className="text-primary" />
                    <span className="text-lg font-medium text-gray-900">Anmelden</span>
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity text-lg font-medium flex items-center justify-center gap-2">
                      <UserPlus size={24} />
                      <span>Registrieren</span>
                    </button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Only for logged-in mobile users */}
      {user && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-lg safe-area-inset-bottom">
          <div className="grid grid-cols-5 h-14">
            {/* Entdecken */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/' ? 'text-primary' : 'text-gray-600'
              }`}
            >
              <Compass size={20} strokeWidth={pathname === '/' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Entdecken</span>
            </Link>

            {/* Favoriten */}
            <Link
              href="/favorites"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/favorites' ? 'text-primary' : 'text-gray-600'
              }`}
            >
              <Heart size={20} strokeWidth={pathname === '/favorites' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Favoriten</span>
            </Link>

            {/* Inserate */}
            <Link
              href="/my-properties"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/my-properties' ? 'text-primary' : 'text-gray-600'
              }`}
            >
              <Home size={20} strokeWidth={pathname === '/my-properties' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Inserate</span>
            </Link>

            {/* Nachrichten */}
            <Link
              href="/messages"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                pathname?.startsWith('/messages') ? 'text-primary' : 'text-gray-600'
              }`}
            >
              <MessageSquare size={20} strokeWidth={pathname?.startsWith('/messages') ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Nachrichten</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1/4 bg-red-500 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: '9px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profil */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/profile' ? 'text-primary' : 'text-gray-600'
              }`}
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Profile"
                  width={20}
                  height={20}
                  className={`rounded-full object-cover ${
                    pathname === '/profile' ? 'ring-2 ring-primary' : ''
                  }`}
                />
              ) : (
                <User size={20} strokeWidth={pathname === '/profile' ? 2.5 : 2} />
              )}
              <span className="font-medium" style={{ fontSize: '10px' }}>Profil</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}

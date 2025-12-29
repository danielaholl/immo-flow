'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Building2, MessageSquare, Compass, Home, User, LogIn, UserPlus, Menu, X, Tag, Briefcase, Calculator, ChevronDown, Sun, Moon, Sparkles, TrendingUp } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { useAuthContext } from '../providers/AuthProvider';
import { useEffect, useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useUnreadCountListener } from '@/lib/socket';

export function Header() {
  const { user, profile, loading } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <>
      {/* Main Header */}
      <header className="bg-white dark:bg-[#030712] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 h-16 lg:h-20">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-gradient-to-br from-[#E31C5F] to-[#FF9500] flex items-center justify-center shadow-md">
                <Building2 className="text-white w-4 h-4 lg:w-[18px] lg:h-[18px]" strokeWidth={2.5} />
              </div>
              <h1 className="cursor-pointer text-xl lg:text-2xl flex items-center">
                <span className="font-bold text-gray-900 dark:text-white">Rendito</span>
              </h1>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden lg:flex gap-6 items-center">
              <Link href="/" className="text-gray-900 dark:text-white hover:text-primary text-base">
                <div className="flex items-center gap-1.5">
                  <Compass size={18} />
                  <span>Entdecken</span>
                </div>
              </Link>
              {loading ? (
                // Skeleton loader while auth is loading
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              ) : (
                <>
                  {user ? (
                    <>
                      <Link href="/favorites" className="text-gray-900 dark:text-white hover:text-primary text-base">
                        <div className="flex items-center gap-1.5">
                          <Heart size={18} />
                          <span>Favoriten</span>
                        </div>
                      </Link>
                      <Link href="/my-properties" className="text-gray-900 dark:text-white hover:text-primary text-base">
                        <div className="flex items-center gap-1.5">
                          <Home size={18} />
                          <span>Inserate</span>
                        </div>
                      </Link>
                      <Link href="/messages" className="text-gray-900 dark:text-white hover:text-primary text-base relative">
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
                      <Link href="/portfolio" className="text-gray-900 dark:text-white hover:text-primary text-base">
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={18} />
                          <span>Portfolio</span>
                        </div>
                      </Link>
                      {/* Profile Avatar */}
                      <Link href="/profile" className="flex items-center hover:opacity-80 transition-opacity">
                        {profile?.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-base font-semibold border-2 border-primary">
                            {profile?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </Link>
                      {/* Menu Dropdown */}
                      <div className="relative" ref={profileMenuRef}>
                        <button
                          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                          className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                        >
                          <Menu size={24} className="text-gray-700 dark:text-white" />
                        </button>
                        {isProfileMenuOpen && (
                          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-3 w-[280px] z-50">
                            {/* Tools Section */}
                            <div className="px-4 py-1.5">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tools</p>
                            </div>
                            <Link
                              href="/steuer-optimierer"
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white hover:text-primary"
                              onClick={() => setIsProfileMenuOpen(false)}
                            >
                              <Calculator size={18} />
                              <span>Steuer-Rechner</span>
                            </Link>
                            <Link
                              href="/ai-score"
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white hover:text-primary"
                              onClick={() => setIsProfileMenuOpen(false)}
                            >
                              <Sparkles size={18} />
                              <span>AI-Score</span>
                            </Link>
                            <Link
                              href="/property/demo/calculator"
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white hover:text-primary"
                              onClick={() => setIsProfileMenuOpen(false)}
                            >
                              <TrendingUp size={18} />
                              <span>Rendite-Rechner</span>
                            </Link>
                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                            {/* Other Links */}
                            <Link
                              href="/pricing"
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white hover:text-primary"
                              onClick={() => setIsProfileMenuOpen(false)}
                            >
                              <Tag size={18} />
                              <span>Preise</span>
                            </Link>
                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                            {/* Theme Toggle */}
                            <div className="px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Erscheinungsbild</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={toggleTheme}
                                  className="relative w-12 h-7 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"
                                  aria-label="Theme umschalten"
                                >
                                  <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-gray-300 rounded-full shadow-md transition-transform duration-200 ${
                                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                                  }`} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/pricing" className="text-gray-900 dark:text-white hover:text-primary text-base">
                        <div className="flex items-center gap-1.5">
                          <Tag size={18} />
                          <span>Preise</span>
                        </div>
                      </Link>
                      <Link href="/auth/login" className="text-gray-600 dark:text-gray-400 hover:text-primary text-base">
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
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
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
            className="absolute right-0 top-16 bottom-0 w-4/5 max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col p-6 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  <Link
                    href="/pricing"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Tag size={24} className="text-primary" />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">Preise</span>
                  </Link>

                  <Link
                    href="/auth/login"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn size={24} className="text-primary" />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">Anmelden</span>
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-[#030712] border-t border-gray-200 dark:border-gray-800 shadow-lg safe-area-inset-bottom">
          <div className="grid grid-cols-5 h-14">
            {/* Entdecken */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Compass size={20} strokeWidth={pathname === '/' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Entdecken</span>
            </Link>

            {/* Favoriten */}
            <Link
              href="/favorites"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/favorites' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Heart size={20} strokeWidth={pathname === '/favorites' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Favoriten</span>
            </Link>

            {/* Inserate */}
            <Link
              href="/my-properties"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                pathname === '/my-properties' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Home size={20} strokeWidth={pathname === '/my-properties' ? 2.5 : 2} />
              <span className="font-medium" style={{ fontSize: '10px' }}>Inserate</span>
            </Link>

            {/* Nachrichten */}
            <Link
              href="/messages"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                pathname?.startsWith('/messages') ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
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
                pathname === '/profile' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
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

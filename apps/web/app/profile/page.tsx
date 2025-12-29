'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../components/Header';
import { trpc } from '@/lib/trpc';
import { useSubscription, type PlanType } from '@/hooks/useSubscription';
import type { SearchHistory, UserPreferencesParsed } from './types';
import { User, Phone, Mail, MapPin, Building2, Shield, ChevronRight, Rows3, Edit3, LogOut, Home, Plus, Eye, Heart, Camera, Send, ImagePlus, Search, Clock, X, Sparkles, TrendingUp, Crown } from 'lucide-react';

// Plan display names (fallback prices are fetched from API)
const planNames: Record<PlanType, string> = {
  free: 'Free',
  sucher: 'Sucher',
  investor: 'Investor',
  pro: 'Pro',
  makler_pro: 'Makler Pro',
  makler_enterprise: 'Makler Enterprise',
  verkauf_starter: 'Verkauf Starter',
  verkauf_premium: 'Verkauf Premium',
};

// Fallback prices (used while loading from Stripe)
const fallbackPrices: Record<PlanType, number> = {
  free: 0,
  sucher: 9,
  investor: 29,
  pro: 79,
  makler_pro: 99,
  makler_enterprise: 249,
  verkauf_starter: 99,
  verkauf_premium: 249,
};

type MessageType = 'bot' | 'user';
type InputType = 'quick-reply' | 'text' | 'textarea' | 'phone' | 'image-upload' | 'none';

interface QuickReplyOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Message {
  id: string;
  type: MessageType;
  content: string;
  inputType?: InputType;
  options?: QuickReplyOption[];
  placeholder?: string;
  defaultValue?: string;
  field?: string;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  company: string;
  bio: string;
  avatar_url?: string;
}

// Questions for NEW profiles
const NEW_PROFILE_QUESTIONS: Omit<Message, 'id'>[] = [
  {
    type: 'bot',
    content: 'Willkommen bei Ihrem Profil! 👋 Ich helfe Ihnen, Ihr Profil zu vervollständigen. So können andere Nutzer Sie besser kennenlernen.',
    inputType: 'none',
  },
  {
    type: 'bot',
    content: 'Laden Sie ein Profilbild hoch, damit andere Nutzer Sie erkennen können. (Optional)',
    inputType: 'image-upload',
    field: 'avatar_url',
  },
  {
    type: 'bot',
    content: 'Wie ist Ihr Vorname?',
    inputType: 'text',
    placeholder: 'Vorname eingeben...',
    field: 'first_name',
  },
  {
    type: 'bot',
    content: 'Und Ihr Nachname?',
    inputType: 'text',
    placeholder: 'Nachname eingeben...',
    field: 'last_name',
  },
  {
    type: 'bot',
    content: 'Unter welcher Telefonnummer können Interessenten Sie erreichen?',
    inputType: 'phone',
    placeholder: '+49 123 456789',
    field: 'phone',
  },
  {
    type: 'bot',
    content: 'Wie lautet Ihre Adresse?',
    inputType: 'text',
    placeholder: 'z.B. Musterstraße 1, 12345 Berlin',
    field: 'address',
  },
  {
    type: 'bot',
    content: 'Für welche Firma arbeiten Sie? (Optional)',
    inputType: 'text',
    placeholder: 'z.B. Rendito GmbH',
    field: 'company',
  },
  {
    type: 'bot',
    content: 'Möchten Sie etwas über sich erzählen? Diese Bio wird auf Ihrem Profil angezeigt. (Optional - Sie können diesen Schritt überspringen)',
    inputType: 'textarea',
    placeholder: 'z.B. "Immobilienexperte mit 10 Jahren Erfahrung in München..."',
    field: 'bio',
  },
];

// Generate questions for EDITING existing profiles
const generateEditQuestions = (profile: any): Omit<Message, 'id'>[] => {
  const currentAvatar = profile?.avatar_url ? 'Aktuelles Profilbild vorhanden' : 'Kein Profilbild';

  return [
    {
      type: 'bot',
      content: `Hallo ${profile?.first_name || 'zurück'}! 👋 Lassen Sie uns Ihr Profil bearbeiten. Ich zeige Ihnen die aktuellen Werte - ändern Sie einfach was Sie möchten.`,
      inputType: 'none',
    },
    {
      type: 'bot',
      content: `Ihr Profilbild: ${currentAvatar}. Möchten Sie ein neues Bild hochladen?`,
      inputType: 'image-upload',
      field: 'avatar_url',
    },
    {
      type: 'bot',
      content: `Ihr aktueller Vorname ist "${profile?.first_name || ''}". Ändern oder bestätigen Sie:`,
      inputType: 'text',
      placeholder: 'Vorname eingeben...',
      field: 'first_name',
    },
    {
      type: 'bot',
      content: `Ihr aktueller Nachname ist "${profile?.last_name || ''}". Ändern oder bestätigen Sie:`,
      inputType: 'text',
      placeholder: 'Nachname eingeben...',
      field: 'last_name',
    },
    {
      type: 'bot',
      content: `Ihre aktuelle Telefonnummer: ${profile?.phone || 'Nicht angegeben'}. Ändern oder bestätigen Sie:`,
      inputType: 'phone',
      placeholder: '+49 123 456789',
      field: 'phone',
    },
    {
      type: 'bot',
      content: `Ihre aktuelle Adresse: ${profile?.address || 'Nicht angegeben'}. Ändern oder bestätigen Sie:`,
      inputType: 'text',
      placeholder: 'z.B. Musterstraße 1, 12345 Berlin',
      field: 'address',
    },
    {
      type: 'bot',
      content: `Ihre aktuelle Firma: ${profile?.company || 'Nicht angegeben'}. Ändern oder bestätigen Sie:`,
      inputType: 'text',
      placeholder: 'z.B. Rendito GmbH',
      field: 'company',
    },
    {
      type: 'bot',
      content: `Ihre aktuelle Bio: ${profile?.bio ? `"${profile.bio.substring(0, 50)}${profile.bio.length > 50 ? '...' : ''}"` : 'Keine Bio'}. Möchten Sie diese ändern?`,
      inputType: 'textarea',
      placeholder: 'z.B. "Immobilienexperte mit 10 Jahren Erfahrung in München..."',
      field: 'bio',
    },
  ];
};

// Check if profile is complete (has required fields)
function isProfileComplete(profile: any): boolean {
  return !!(profile?.first_name && profile?.last_name);
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuthContext();
  const router = useRouter();
  const { plan, subscription, manageSubscription, isPortalLoading } = useSubscription();

  // Fetch dynamic prices from Stripe
  const { data: stripePlans } = trpc.payments.getPlans.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Create price lookup from API data with fallback
  const planPrices = useMemo(() => {
    if (!stripePlans) return fallbackPrices;
    const prices = { ...fallbackPrices };
    stripePlans.forEach(p => {
      if (p.id in prices) {
        prices[p.id as PlanType] = p.price;
      }
    });
    return prices;
  }, [stripePlans]);

  // View mode: 'overview' for existing profiles, 'edit' for new/editing profiles
  const [viewMode, setViewMode] = useState<'overview' | 'edit'>('overview');
  const [isEditMode, setIsEditMode] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Omit<Message, 'id'>[]>(NEW_PROFILE_QUESTIONS);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadedAvatar, setUploadedAvatar] = useState<string>('');

  // User search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  // User preferences (recommendation profile) state
  const [userPreferences, setUserPreferences] = useState<UserPreferencesParsed | null>(null);

  // Inline editing state
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/profile');
    }
  }, [authLoading, user, router]);

  // Determine view mode based on profile completeness
  useEffect(() => {
    if (!authLoading && profile) {
      if (isProfileComplete(profile)) {
        setViewMode('overview');
      } else {
        setViewMode('edit');
      }
    }
  }, [authLoading, profile]);

  // Load user search history with tRPC
  const { data: searchHistoryData, isLoading: loadingHistory } = trpc.searchHistory.getAll.useQuery(
    { limit: 10 },
    { enabled: !!user && viewMode === 'overview' }
  );

  // Load user preferences with tRPC
  const { data: userPreferencesData, isLoading: loadingPreferences } = trpc.userPreferences.get.useQuery(
    undefined,
    { enabled: !!user && viewMode === 'overview' }
  );


  // Update local state when data changes
  useEffect(() => {
    if (searchHistoryData) {
      setSearchHistory(searchHistoryData as any);
    }
  }, [searchHistoryData]);

  useEffect(() => {
    if (userPreferencesData) {
      setUserPreferences(userPreferencesData as any);
    }
  }, [userPreferencesData]);

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        company: profile.company || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
      if (profile.avatar_url) {
        setUploadedAvatar(profile.avatar_url);
      }
    }
  }, [profile]);

  // Start conversation when in edit mode (for new profiles only)
  useEffect(() => {
    if (user && viewMode === 'edit' && messages.length === 0 && !isEditMode) {
      setQuestions(NEW_PROFILE_QUESTIONS);
      addBotMessage(0, NEW_PROFILE_QUESTIONS);
    }
  }, [user, viewMode]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        const scrollContainer = chatContainerRef.current.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Auto-focus input and set default value when new question appears
  useEffect(() => {
    if (isTyping || isComplete || viewMode !== 'edit') return;

    const currentQuestion = messages[messages.length - 1];
    if (!currentQuestion || currentQuestion.type !== 'bot') return;

    const field = currentQuestion.field as keyof ProfileData | undefined;
    if (field && profileData[field]) {
      setTextInput(profileData[field] || '');
    }

    const timer = setTimeout(() => {
      if (currentQuestion.inputType === 'text' || currentQuestion.inputType === 'phone') {
        textInputRef.current?.focus();
        textInputRef.current?.select();
      } else if (currentQuestion.inputType === 'textarea') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isTyping, isComplete, profileData, viewMode]);

  const addBotMessage = async (questionIndex: number, questionList?: Omit<Message, 'id'>[]) => {
    const activeQuestions = questionList || questions;

    if (questionIndex >= activeQuestions.length) {
      setIsComplete(true);
      return;
    }

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300));
    setIsTyping(false);

    const question = activeQuestions[questionIndex];
    const newMessage: Message = {
      id: `bot-${Date.now()}`,
      ...question,
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentQuestionIndex(questionIndex);

    if (question.inputType === 'none') {
      setTimeout(() => addBotMessage(questionIndex + 1, activeQuestions), 800);
    }
  };

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTextSubmit = (skipEmpty = false) => {
    const currentQuestion = questions[currentQuestionIndex];

    if (!textInput.trim() && !skipEmpty) return;

    if (textInput.trim()) {
      addUserMessage(textInput);
      if (currentQuestion.field) {
        setProfileData(prev => ({ ...prev, [currentQuestion.field!]: textInput }));
      }
    } else {
      addUserMessage('Übersprungen');
    }

    setTextInput('');
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageData = event.target.result as string;
        setUploadedAvatar(imageData);
        setProfileData(prev => ({ ...prev, avatar_url: imageData }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = () => {
    if (uploadedAvatar) {
      addUserMessage('Profilbild hochgeladen');
    } else {
      addUserMessage('Kein Profilbild');
    }
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    // For chat view (new profiles)
    if (viewMode === 'edit') {
      console.log('Starting profile save...', profileData);
      setIsSubmitting(true);
      setSaveSuccess(false);

      try {
        let avatarUrl = profileData.avatar_url;

        // Upload avatar if changed
        if (uploadedAvatar && uploadedAvatar.startsWith('data:')) {
          // Convert base64 to blob for upload
          const response = await fetch(uploadedAvatar);
          const blob = await response.blob();
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

          const formData = new FormData();
          formData.append('avatar', file);

          const token = localStorage.getItem('auth_token');
          const uploadResponse = await fetch('http://localhost:4000/upload/avatar', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const data = await uploadResponse.json();
            avatarUrl = data.data.thumbnail;
          }
        }

        await updateProfileMutation.mutateAsync({
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          phone: profileData.phone,
          address: profileData.address,
          company: profileData.company,
          bio: profileData.bio,
          avatarUrl: avatarUrl,
        });

        setSaveSuccess(true);

        setTimeout(() => {
          setViewMode('overview');
          setSaveSuccess(false);
        }, 1500);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert(`Fehler beim Speichern des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // For inline editing (existing profiles)
    try {
      let avatarUrl = profile?.avatar_url || undefined;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:4000/upload/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Avatar upload failed');
        }

        const data = await response.json();
        avatarUrl = data.data.thumbnail; // Use thumbnail URL
      }

      // Prepare update data - only include defined values
      const updateData: any = {};
      if (editedProfile.first_name !== undefined) updateData.firstName = editedProfile.first_name;
      if (editedProfile.last_name !== undefined) updateData.lastName = editedProfile.last_name;
      if (editedProfile.phone !== undefined) updateData.phone = editedProfile.phone;
      if (editedProfile.address !== undefined) updateData.address = editedProfile.address;
      if (editedProfile.company !== undefined) updateData.company = editedProfile.company;
      if (editedProfile.bio !== undefined) updateData.bio = editedProfile.bio;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      // Update profile with tRPC
      await updateProfileMutation.mutateAsync(updateData);

    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleStartEdit = () => {
    setMessages([]);
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    setTextInput('');
    setIsEditMode(true);

    const editQuestions = generateEditQuestions(profile);
    setQuestions(editQuestions);
    setViewMode('edit');

    setTimeout(() => addBotMessage(0, editQuestions), 100);
  };

  // Get tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // Delete search mutation
  const deleteSearchMutation = trpc.searchHistory.delete.useMutation({
    onSuccess: () => {
      // Refetch search history after deletion
      utils.searchHistory.getAll.invalidate();
    },
  });

  const handleDeleteSearch = async (id: string) => {
    try {
      await deleteSearchMutation.mutateAsync({ id });
      setSearchHistory(prev => prev.filter(search => search.id !== id));
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  // Profile update mutation
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await refreshProfile();
      setIsInlineEditing(false);
      setEditedProfile({});
      setAvatarFile(null);
      setAvatarPreview('');
    },
    onError: (error) => {
      alert(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const handleRepeatSearch = (query: string) => {
    // Navigate to homepage with search query
    router.push(`/?search=${encodeURIComponent(query)}`);
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `vor ${diffInSeconds} Sek`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `vor ${minutes} Min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `vor ${hours} Std`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `vor ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `vor ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`;
    }
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const progress = Math.round(((currentQuestionIndex) / (questions.length - 1)) * 100);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-gray-500 dark:text-gray-400">Laden...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const currentQuestion = messages[messages.length - 1];

  // ============================================
  // OVERVIEW VIEW - Two Column Layout
  // ============================================
  if (viewMode === 'overview') {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#030712]">
        <Header />

        <div className="flex flex-col lg:flex-row gap-6 py-8 max-w-7xl mx-auto">

            {/* Left Column - Profile Settings */}
            <div className="lg:w-[400px] lg:flex-shrink-0 px-4 lg:pl-8 lg:pr-0">
              {/* Profile Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
                {/* Cover - Simple gradient like Airbnb */}
                <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 h-20">
                </div>

                {/* Avatar & Name */}
                <div className="relative px-6 pb-6">
                  <div className="-mt-10 mb-4">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (!file.type.startsWith('image/')) {
                          alert('Bitte wählen Sie ein Bild aus');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Bild ist zu groß (max 5MB)');
                          return;
                        }

                        setAvatarFile(file);
                        const reader = new FileReader();
                        reader.onload = (e) => setAvatarPreview(e.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />

                    <div className="relative inline-block">
                      <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 p-0.5 shadow-md ring-4 ring-white dark:ring-gray-900">
                        {avatarPreview || profile?.avatar_url ? (
                          <img
                            src={avatarPreview || profile?.avatar_url || undefined}
                            alt="Profilbild"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-2xl font-semibold text-gray-500 dark:text-gray-300">
                              {profile?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      {isInlineEditing && (
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-7 h-7 bg-gray-900 dark:bg-gray-700 text-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                          title="Profilbild ändern"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isInlineEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Vorname"
                        value={editedProfile.first_name ?? ''}
                        onChange={(e) => setEditedProfile(p => ({...p, first_name: e.target.value}))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none font-semibold text-gray-900 dark:text-white text-xl transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Nachname"
                        value={editedProfile.last_name ?? ''}
                        onChange={(e) => setEditedProfile(p => ({...p, last_name: e.target.value}))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none font-semibold text-gray-900 dark:text-white text-xl transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Firma (optional)"
                        value={editedProfile.company ?? ''}
                        onChange={(e) => setEditedProfile(p => ({...p, company: e.target.value}))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none text-gray-700 dark:text-gray-300 transition-colors"
                      />
                      <textarea
                        value={editedProfile.bio ?? ''}
                        onChange={(e) => setEditedProfile(p => ({...p, bio: e.target.value}))}
                        placeholder="Bio (optional)"
                        rows={3}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none resize-none text-gray-700 dark:text-gray-300 transition-colors"
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="font-semibold text-gray-900 dark:text-white text-2xl">
                        {profile?.first_name || profile?.last_name
                          ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
                          : user?.email?.split('@')[0] || 'Nutzer'}
                      </h1>
                      {!profile?.first_name && !profile?.last_name && (
                        <p className="text-amber-600 dark:text-amber-400 text-sm mt-1 flex items-center gap-1">
                          <Edit3 size={14} />
                          Name noch nicht hinterlegt
                        </p>
                      )}
                      {profile?.company && (
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.company}</p>
                      )}

                      {profile?.bio && (
                        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
                          {profile.bio}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                  Kontaktdaten
                </h2>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 py-2">
                    <Mail size={20} className="text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">E-Mail</p>
                      <p className="text-gray-900 dark:text-white truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 py-2">
                    <Phone size={20} className="text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Telefon</p>
                      {isInlineEditing ? (
                        <input
                          type="tel"
                          value={editedProfile.phone ?? ''}
                          onChange={(e) => setEditedProfile(p => ({...p, phone: e.target.value}))}
                          placeholder="+49 123 456789"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none text-gray-900 dark:text-white transition-colors"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {profile?.phone || <span className="text-gray-400">Nicht angegeben</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 py-2">
                    <MapPin size={20} className="text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Adresse</p>
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={editedProfile.address ?? ''}
                          onChange={(e) => setEditedProfile(p => ({...p, address: e.target.value}))}
                          placeholder="z.B. Musterstraße 1, 12345 Berlin"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:border-gray-900 dark:focus:border-gray-500 focus:outline-none text-gray-900 dark:text-white transition-colors"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {profile?.address || <span className="text-gray-400">Nicht angegeben</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isInlineEditing && (
                    <div className="flex items-start gap-3 py-2">
                      <Building2 size={20} className="text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Firma</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile?.company || <span className="text-gray-400">Nicht angegeben</span>}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Settings */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                  Account
                </h2>

                <div className="space-y-3">
                  {/* Subscription Card */}
                  <div className="bg-gradient-to-r from-primary/5 to-purple-50 dark:from-primary/10 dark:to-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Crown size={18} className="text-primary" />
                        <span className="font-medium text-gray-900 dark:text-white">Dein Plan</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan === 'free' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-primary/10 text-primary'
                      }`}>
                        {planNames[plan]}
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {planPrices[plan]}€<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/Monat</span>
                    </div>

                    {subscription?.currentPeriodEnd && (
                      <p className="text-xs text-gray-500">
                        {subscription.cancelAtPeriodEnd
                          ? `Endet am ${new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}`
                          : `Verlängert am ${new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}`
                        }
                      </p>
                    )}
                  </div>

                  {/* Upgrade Button - for free users or users who can upgrade */}
                  {(plan === 'free' || plan === 'sucher' || plan === 'investor') && (
                    <button
                      onClick={() => router.push('/pricing')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        plan === 'free'
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'bg-gradient-to-r from-primary/10 to-purple-100 dark:from-primary/20 dark:to-purple-900/30 text-primary hover:from-primary/20 hover:to-purple-200 dark:hover:from-primary/30 dark:hover:to-purple-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Crown size={18} />
                        <span>{plan === 'free' ? 'Jetzt upgraden' : 'Auf höheren Plan upgraden'}</span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  )}

                  {/* Manage Subscription Button - only for paid users */}
                  {plan !== 'free' && (
                    <button
                      onClick={() => manageSubscription()}
                      disabled={isPortalLoading}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Crown size={18} className="text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {isPortalLoading ? 'Wird geladen...' : 'Abo verwalten'}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-gray-400" />
                    </button>
                  )}

                  {/* Password Change Button */}
                  <button
                    onClick={() => alert('Passwort ändern wird implementiert')}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-gray-400" />
                      <span className="text-gray-900 dark:text-white">Passwort ändern</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isInlineEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsInlineEditing(false);
                        setEditedProfile({});
                        setAvatarFile(null);
                        setAvatarPreview('');
                      }}
                      className="flex-1 py-3 text-gray-900 dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isLoading}
                      className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateProfileMutation.isLoading ? 'Speichern...' : 'Speichern'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsInlineEditing(true);
                        setEditedProfile({
                          first_name: profile?.first_name || '',
                          last_name: profile?.last_name || '',
                          phone: profile?.phone || '',
                          address: profile?.address || '',
                          company: profile?.company || '',
                          bio: profile?.bio || '',
                        });
                      }}
                      className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2"
                    >
                      <Edit3 size={16} />
                      Bearbeiten
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
                    >
                      Abmelden
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Properties & Favorites */}
            <div className="flex-1 px-4 lg:pr-8 lg:pl-0">
              {/* Empfehlungsprofil Section */}
              <div className="mb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 dark:text-white text-xl">
                        Dein Empfehlungsprofil
                      </h2>
                      {userPreferences && userPreferences.interaction_count > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Basierend auf {userPreferences.interaction_count} Interaktionen
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {loadingPreferences ? (
                  <div className="flex items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-gray-700 border-t-primary"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Lade Präferenzen...</p>
                    </div>
                  </div>
                ) : !userPreferences || userPreferences.interaction_count === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TrendingUp size={28} className="text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-2">
                      Dein Profil wartet auf dich
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                      Entdecke Immobilien und markiere deine Favoriten. Wir lernen deine Vorlieben und zeigen dir passende Angebote.
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all font-medium text-sm hover:scale-105 active:scale-95"
                    >
                      <Search size={16} />
                      Immobilien entdecken
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Grid Layout für Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Price Range Card */}
                      {userPreferences.price_range && (userPreferences.price_range.min || userPreferences.price_range.max) && (
                        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                              <TrendingUp size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preisbereich</h3>
                          </div>

                          {/* Range Bar */}
                          <div className="mb-4">
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: '100%' }} />
                            </div>
                          </div>

                          {/* Price Labels */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                {userPreferences.price_range.min && userPreferences.price_range.max ? 'Von' : userPreferences.price_range.min ? 'Ab' : 'Bis'}
                              </span>
                              <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                                {userPreferences.price_range.min
                                  ? Math.round(Number(userPreferences.price_range.min)).toLocaleString('de-DE')
                                  : Math.round(Number(userPreferences.price_range.max)).toLocaleString('de-DE')} €
                              </span>
                            </div>
                            {userPreferences.price_range.min && userPreferences.price_range.max && (
                              <div className="text-right">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Bis</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                                  {Math.round(Number(userPreferences.price_range.max)).toLocaleString('de-DE')} €
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rooms Card */}
                      {userPreferences.preferred_rooms && userPreferences.preferred_rooms.length > 0 && (
                        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                              <Home size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Zimmeranzahl</h3>
                          </div>

                          <div className="flex items-center gap-3">
                            {userPreferences.preferred_rooms.map((room, idx) => (
                              <div key={idx} className="flex-1 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white block">{room.rooms}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Zimmer</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Locations Card - Full Width */}
                    {userPreferences.preferred_locations && userPreferences.preferred_locations.length > 0 && (
                      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <MapPin size={16} className="text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bevorzugte Standorte</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {userPreferences.preferred_locations.map((loc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-default"
                            >
                              <MapPin size={14} className="text-blue-500" />
                              <span className="font-medium text-gray-900 dark:text-white">{loc.location}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features Card - Full Width */}
                    {userPreferences.preferred_features && userPreferences.preferred_features.length > 0 && (
                      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gewünschte Ausstattung</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {userPreferences.preferred_features.slice(0, 8).map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-4 py-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-medium hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all capitalize"
                            >
                              {feature.feature || feature}
                            </span>
                          ))}
                          {userPreferences.preferred_features.length > 8 && (
                            <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium">
                              +{userPreferences.preferred_features.length - 8} weitere
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer Hint */}
                    <div className="flex items-center justify-center gap-2 py-3 text-gray-500 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-xs">
                        Dein Profil wird mit jeder Interaktion besser
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Trennlinie */}
              <hr className="border-gray-200 dark:border-gray-700 mb-8" />

              {/* Suchhistorie Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white text-xl">
                    Letzte Suchen ({searchHistory.length})
                  </h2>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : searchHistory.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-900 dark:text-white mb-2 font-medium">Noch keine Suchen</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Starte deine erste Immobiliensuche</p>
                    <button
                      onClick={() => router.push('/')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      <Search size={16} />
                      Immobilien suchen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchHistory.map((search) => (
                      <div
                        key={search.id}
                        className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => handleRepeatSearch(search.query)}
                              className="w-full text-left"
                            >
                              <p className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                                {search.query}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {search.last_searched_at ? formatRelativeTime(search.last_searched_at) : 'Unbekannt'}
                                </span>
                                <span>•</span>
                                <span>{search.results_count} Ergebnis{search.results_count !== 1 ? 'se' : ''}</span>
                                {search.criteria && typeof search.criteria === 'object' && Object.keys(search.criteria).length > 0 && (
                                  <>
                                    <span>•</span>
                                    <div className="flex flex-wrap gap-1">
                                      {(search.criteria as any).location && (
                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                                          {(search.criteria as any).location}
                                        </span>
                                      )}
                                      {(search.criteria as any).rooms && (
                                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                                          {(search.criteria as any).rooms} Zi.
                                        </span>
                                      )}
                                      {(search.criteria as any).features && Array.isArray((search.criteria as any).features) && (search.criteria as any).features.slice(0, 2).map((feature: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs">
                                          {feature}
                                        </span>
                                      ))}
                                      {(search.criteria as any).features && Array.isArray((search.criteria as any).features) && (search.criteria as any).features.length > 2 && (
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                                          +{(search.criteria as any).features.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteSearch(search.id)}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Suche löschen"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
      </main>
    );
  }

  // ============================================
  // EDIT VIEW - Chat assistant for profile setup
  // ============================================

  // Live Preview Component
  const LivePreview = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden h-full flex flex-col border border-gray-200 dark:border-gray-700">
      {/* Profile Header with Avatar */}
      <div className="relative bg-gradient-to-br from-primary to-pink-600 h-32">
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-lg">
              {profileData.avatar_url || uploadedAvatar ? (
                <img
                  src={uploadedAvatar || profileData.avatar_url}
                  alt="Profilbild"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-400">
                    {profileData.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <Camera size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 pt-16 px-6 pb-6">
        {/* Name */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {profileData.first_name || profileData.last_name ? (
              `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
            ) : (
              <span className="text-gray-300 dark:text-gray-600">Ihr Name</span>
            )}
          </h1>
          {profileData.company && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{profileData.company}</p>
          )}
          {profileData.bio && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-3 leading-relaxed">{profileData.bio}</p>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{user?.email}</span>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Phone size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {profileData.phone || <span className="text-gray-300 dark:text-gray-600">Telefon</span>}
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <MapPin size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {profileData.address || <span className="text-gray-300 dark:text-gray-600">Adresse</span>}
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Building2 size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {profileData.company || <span className="text-gray-300 dark:text-gray-600">Firma</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 flex-shrink-0 space-y-2">
        {saveSuccess && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-sm text-center mb-2">
            Profil erfolgreich gespeichert!
          </div>
        )}

        <button
          onClick={handleSaveProfile}
          disabled={isSubmitting || (!profileData.first_name && !profileData.last_name)}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Speichern...' : 'Profil speichern'}
        </button>
        {isProfileComplete(profile) && (
          <button
            onClick={() => setViewMode('overview')}
            className="w-full py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#030712]">
      <Header />

      <div className="h-[calc(100vh-100px)] flex flex-col px-4 py-4">
        {/* Progress Bar */}
        <div className="mb-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profil-Fortschritt</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-6xl mx-auto w-full flex-1 min-h-0 overflow-auto lg:overflow-hidden">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">

            {/* Chat Container */}
            <div
              ref={chatContainerRef}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex-1 min-h-0 border border-gray-200 dark:border-gray-700"
            >
              <div className="h-full overflow-y-auto p-6 space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'bot' && (
                      <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white dark:text-gray-900" />
                      </div>
                    )}
                    {message.type === 'bot' ? (
                      <p className="text-[18px] leading-relaxed text-gray-800 dark:text-gray-200 pt-2 max-w-[85%]">{message.content}</p>
                    ) : (
                      <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-5 py-3 max-w-[75%]">
                        <p className="text-[18px] leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white dark:text-gray-900" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-4">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Completion Message */}
                {isComplete && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white dark:text-gray-900" />
                    </div>
                    <p className="text-[18px] leading-relaxed text-green-700 dark:text-green-400 pt-2 max-w-[85%]">
                      Perfekt! 🎉 Ihr Profil ist vollständig. Überprüfen Sie die Vorschau rechts und klicken Sie auf &quot;Profil speichern&quot;.
                    </p>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-4 flex-shrink-0">
              {!isComplete && !isTyping && currentQuestion && currentQuestion.type === 'bot' && (
                <>
                  {/* Text Input */}
                  {(currentQuestion.inputType === 'text' || currentQuestion.inputType === 'phone') && (
                    <div className="flex gap-2">
                      <input
                        ref={textInputRef}
                        type={currentQuestion.inputType === 'phone' ? 'tel' : 'text'}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        placeholder={currentQuestion.placeholder}
                        className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary dark:focus:border-primary focus:outline-none transition-colors text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      <button
                        onClick={() => handleTextSubmit()}
                        disabled={!textInput.trim()}
                        className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  )}

                  {/* Image Upload */}
                  {currentQuestion.inputType === 'image-upload' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border-4 border-gray-200 dark:border-gray-700">
                            {uploadedAvatar || profileData.avatar_url ? (
                              <img
                                src={uploadedAvatar || profileData.avatar_url}
                                alt="Profilbild"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={36} className="text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
                        >
                          <ImagePlus size={18} />
                          {uploadedAvatar ? 'Anderes Bild wählen' : 'Bild auswählen'}
                        </button>
                      </div>

                      <button
                        onClick={handleImageSubmit}
                        className="w-full mt-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        {uploadedAvatar ? 'Weiter' : 'Überspringen'}
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Textarea Input */}
                  {currentQuestion.inputType === 'textarea' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                      <textarea
                        ref={textareaRef}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary focus:outline-none transition-colors resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleTextSubmit(true)}
                          className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Überspringen
                        </button>
                        <button
                          onClick={() => handleTextSubmit()}
                          disabled={!textInput.trim()}
                          className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          Weiter
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Preview Column */}
          <div className="flex-shrink-0 lg:flex-1 lg:min-h-0">
            <LivePreview />
          </div>
        </div>
      </div>
    </main>
  );
}

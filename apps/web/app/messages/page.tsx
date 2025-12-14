'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MessageSquare, Home, MapPin, Euro, Clock, ArrowLeft, Send, Bot, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { Header } from '../components/Header';
import { PropertyListThumbnail } from '../components/PropertyListThumbnail';
import { PropertyPreview } from '../components/PropertyPreview';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { SlideshowManagerProvider } from '../components/SlideshowManagerContext';
import { joinConversation, leaveConversation, onNewMessage, sendTypingIndicator, onTypingIndicator, onTypingStop } from '@/lib/socket';

export default function MessagesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams?.get('id');

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdParam);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = trpc.messaging.getConversations.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (conversationFilter === 'all') return conversations;
    return conversations.filter(conv => conv.unreadCount > 0);
  }, [conversations, conversationFilter]);

  const unreadConversationsCount = useMemo(() => {
    return conversations?.filter(c => c.unreadCount > 0).length || 0;
  }, [conversations]);

  // Fetch messages for selected conversation
  const { data: messages, refetch: refetchMessages } = trpc.messaging.getMessages.useQuery(
    { conversationId: selectedConversationId!, limit: 100, offset: 0 },
    { enabled: !!user && !!selectedConversationId, refetchInterval: 5000 }
  );

  // Send message mutation
  const sendMessageMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      refetchMessages();
      refetchConversations();
      scrollToBottom();
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = trpc.messaging.deleteConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      // Reset selected conversation if deleted
      setSelectedConversationId(null);
    },
    onError: (error) => {
      console.error('Error deleting conversation:', error);
      alert('Fehler beim Löschen der Konversation.');
    },
  });

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteConversationMutation.mutateAsync({ conversationId });
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  // Fetch property details for the selected conversation
  const { data: propertyDetails } = trpc.properties.getById.useQuery(
    { id: selectedConversation?.propertyId || '' },
    { enabled: !!selectedConversation?.propertyId }
  );

  // Track last selected ID for visual indication on mobile
  useEffect(() => {
    if (selectedConversationId) {
      setLastSelectedId(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Join conversation room
  useEffect(() => {
    if (selectedConversationId && user) {
      joinConversation(selectedConversationId);
      return () => {
        leaveConversation(selectedConversationId);
      };
    }
  }, [selectedConversationId, user]);

  // Listen for new messages
  useEffect(() => {
    if (!selectedConversationId) return;

    const handleNewMessage = (data: any) => {
      if (data.conversationId === selectedConversationId) {
        refetchMessages();
        refetchConversations();
        scrollToBottom();
      }
    };

    onNewMessage(handleNewMessage);
  }, [selectedConversationId, refetchMessages, refetchConversations]);

  // Listen for typing indicators
  useEffect(() => {
    if (!selectedConversationId) return;

    const handleTyping = (data: { userId: string; email: string; conversationId: string }) => {
      if (data.conversationId === selectedConversationId && data.userId !== user?.id) {
        setTypingUser(data.email);
      }
    };

    const handleTypingStop = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === selectedConversationId && data.userId !== user?.id) {
        setTypingUser(null);
      }
    };

    onTypingIndicator(handleTyping);
    onTypingStop(handleTypingStop);
  }, [selectedConversationId, user?.id]);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedConversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(selectedConversationId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(selectedConversationId, false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sendMessageMutation.isLoading || !selectedConversationId) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: message.trim(),
      });

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(selectedConversationId, false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || conversationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Show full-width empty state if no conversations */}
      {!conversations || conversations.length === 0 ? (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={48} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Noch keine Nachrichten
            </h2>
            <p className="text-gray-500 mb-6">
              Sie haben noch keine Konversationen gestartet. Finden Sie interessante Immobilien und stellen Sie Fragen direkt an die Verkäufer.
            </p>
            <Link href="/">
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Immobilien entdecken
              </button>
            </Link>
          </div>
        </div>
      ) : (
        /* Main Content - 2 Column Layout */
        <div className="flex overflow-hidden h-[calc(100vh-64px-64px)] lg:h-[calc(100vh-80px)]">
          {/* Left Column - Conversations List */}
          <div className={`${selectedConversationId ? 'hidden' : 'block'} lg:block w-full lg:w-[25%] bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
            {/* Header with Filter */}
            <div className="p-4 flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 mb-3">Nachrichten</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setConversationFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    conversationFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle ({conversations?.length || 0})
                </button>
                <button
                  onClick={() => setConversationFilter('unread')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    conversationFilter === 'unread'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ungelesen ({unreadConversationsCount})
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 p-4">
                {filteredConversations.map((conversation) => {
                  // Show selection: current selected OR last selected (for mobile when back to list)
                  const isSelected = conversation.id === selectedConversationId ||
                                   (!selectedConversationId && conversation.id === lastSelectedId);
                  const convIsBuyer = conversation.role === 'buyer';
                  const convOtherPerson = conversation.otherParticipant;
                  const convDisplayName = convOtherPerson.company ||
                                         `${convOtherPerson.firstName || ''} ${convOtherPerson.lastName || ''}`.trim() ||
                                         'Unbekannt';

                  return (
                    <PropertyListThumbnail
                      key={conversation.id}
                      id={conversation.id}
                      title={conversation.propertyTitle}
                      isSelected={isSelected}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      image={conversation.propertyImages?.[0]}
                      roleLabel={convIsBuyer ? 'Verkäufer' : 'Interessent'}
                      roleValue={convDisplayName}
                      lastMessageDate={conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : undefined}
                      unreadCount={conversation.unreadCount}
                      onDelete={(e) => handleDeleteConversation(conversation.id, e)}
                      deleteTooltip="Konversation löschen"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Column - Conversation View */}
          <div className={`${selectedConversationId ? 'block' : 'hidden'} lg:block w-full lg:w-[40%] h-full flex flex-col bg-gray-50 overflow-hidden`}>
            {selectedConversationId && selectedConversation ? (
              (() => {
                const isBuyer = selectedConversation.role === 'buyer';
                const otherPerson = selectedConversation.otherParticipant;
                const displayName = otherPerson?.company ||
                                   `${otherPerson?.firstName || ''} ${otherPerson?.lastName || ''}`.trim() ||
                                   'Unbekannt';

                return (
                  <div className="h-full flex flex-col">
                    {/* Conversation Header - Airbnb Style */}
                    <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                      <div className="flex items-center gap-4">
                        {/* Back Button - Mobile only */}
                        <button
                          onClick={() => setSelectedConversationId(null)}
                          className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Zurück zur Liste"
                        >
                          <ArrowLeft size={24} className="text-gray-700" />
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <MessageSquare size={20} className="text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-lg text-gray-900 line-clamp-1">
                              {selectedConversation.propertyTitle}
                            </h2>
                            <p className="text-sm text-gray-500">
                              {isBuyer ? 'Verkäufer' : 'Interessent'}: {displayName}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-white">
                  <div className="space-y-4">
                    {messages?.map((msg) => {
                      const isOwnMessage = msg.senderId === profile?.id;
                      const isAI = msg.senderType === 'ai';
                      const isSystem = msg.senderType === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 max-w-md text-center">
                              <p className="text-sm text-yellow-800">{msg.content}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                            {/* Sender Info */}
                            {!isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1 ml-1">
                                {isAI && <Bot size={16} className="text-primary" />}
                                <span className="text-sm text-gray-500 font-medium">
                                  {isAI ? 'KI-Assistent' : displayName}
                                </span>
                              </div>
                            )}

                            {/* Message Bubble - AI Chat Style */}
                            <div
                              className={`px-4 py-3 ${
                                isOwnMessage
                                  ? 'bg-gray-900 text-white rounded-xl rounded-br-none'
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-xl rounded-bl-none'
                              }`}
                            >
                              <p className="text-base whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>

                            {/* Timestamp */}
                            <div className={`mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
                              <span className="text-sm text-gray-500">
                                {new Date(msg.createdAt).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing Indicator */}
                    {typingUser && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-gray-600">{typingUser} schreibt...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input - AI Chat Style */}
                <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 mt-auto">
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <textarea
                        ref={messageInputRef}
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder="Stellen Sie eine Frage zur Immobilie..."
                        className="w-full resize-none border border-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent text-base h-12"
                        rows={1}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessageMutation.isLoading}
                      className="bg-gray-900 text-white h-12 w-12 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
                    >
                      {sendMessageMutation.isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>
                </div>
                  </div>
                );
              })()
            ) : (
              // No conversation selected - empty state
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Keine Konversation ausgewählt
                  </h3>
                  <p className="text-gray-600">
                    Wählen Sie eine Konversation aus der Liste links aus, um Ihre Nachrichten zu sehen.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Property Preview (Desktop only) */}
          <SlideshowManagerProvider>
            <div className="hidden lg:flex w-[35%] h-full flex-col bg-white border-l border-gray-200 overflow-hidden">
              {selectedConversationId && selectedConversation ? (
                <div className="h-full flex flex-col min-h-0 overflow-hidden">
                  {/* Image Slideshow - Fixed at top */}
                  <div className="flex-shrink-0 w-full">
                    <div className="w-full aspect-[4/3] rounded-none overflow-hidden">
                      <PropertyImageSlideshow
                        images={selectedConversation.propertyImages}
                        title={selectedConversation.propertyTitle}
                        duration={4000}
                        showCounter={true}
                        showProgressBars={true}
                        aspectRatio="auto"
                        rounded="none"
                        className="h-full"
                        slideshowId={`messages-property-${selectedConversation.propertyId}`}
                      />
                    </div>
                  </div>

                  {/* Property Preview - Scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-4">
                      {propertyDetails ? (
                        <PropertyPreview
                          data={{
                            id: propertyDetails.id,
                            images: propertyDetails.images || [],
                            price: propertyDetails.price || 0,
                            location: propertyDetails.location || '',
                            address: propertyDetails.address,
                            postal_code: propertyDetails.postal_code,
                            title: propertyDetails.title || '',
                            type: propertyDetails.property_type,
                            sqm: propertyDetails.sqm || 0,
                            rooms: propertyDetails.rooms || 0,
                            plot_size: propertyDetails.plot_size,
                            description: propertyDetails.description || '',
                            features: propertyDetails.features,
                            highlights: propertyDetails.highlights,
                            year_built: propertyDetails.year_built,
                            bathrooms: propertyDetails.bathrooms,
                            floor_level: propertyDetails.floor_level,
                            total_floors: propertyDetails.total_floors,
                            heating_type: propertyDetails.heating_type,
                            energy_efficiency_class: propertyDetails.energy_efficiency_class,
                            condition: propertyDetails.condition,
                            available_from: propertyDetails.available_from,
                            monthly_fee: propertyDetails.monthly_fee,
                            commission_rate: propertyDetails.commission_rate,
                          }}
                          showConsentSection={false}
                          hideProviderInfo={true}
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* Quick Property Info from conversation data */}
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-2">
                              {selectedConversation.propertyTitle}
                            </h3>
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                              <MapPin size={16} />
                              <span>{selectedConversation.propertyCity}</span>
                            </div>
                            <div className="flex items-center gap-2 text-primary font-bold text-xl">
                              <Euro size={20} />
                              <span>
                                {new Intl.NumberFormat('de-DE', {
                                  style: 'currency',
                                  currency: 'EUR',
                                  maximumFractionDigits: 0,
                                }).format(selectedConversation.propertyPrice || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Loading skeleton */}
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-20 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // No conversation selected
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <Home size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      Wählen Sie eine Konversation, um das Inserat zu sehen
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SlideshowManagerProvider>
        </div>
      )}
    </div>
  );
}

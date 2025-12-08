'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MessageSquare, Home, MapPin, Euro, Clock, ArrowLeft, Send, Bot, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { Header } from '../components/Header';
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

  const isBuyer = selectedConversation?.role === 'buyer';
  const otherPerson = selectedConversation?.otherParticipant;
  const displayName = otherPerson?.company ||
                     `${otherPerson?.firstName || ''} ${otherPerson?.lastName || ''}`.trim() ||
                     'Unbekannt';

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
        <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
          {/* Left Column - Conversations List */}
          <div className="lg:w-1/4 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Nachrichten</h1>
              <p className="text-gray-500 text-sm">
                {conversations?.length || 0} Konversationen
              </p>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 p-4">
                {conversations.map((conversation) => {
                  const firstImage = conversation.propertyImages?.[0];
                  const isSelected = conversation.id === selectedConversationId;
                  const convIsBuyer = conversation.role === 'buyer';
                  const convOtherPerson = conversation.otherParticipant;
                  const convDisplayName = convOtherPerson.company ||
                                         `${convOtherPerson.firstName || ''} ${convOtherPerson.lastName || ''}`.trim() ||
                                         'Unbekannt';

                  return (
                    <div
                      key={conversation.id}
                      className={`group relative bg-white border rounded-xl overflow-hidden transition-all h-32 cursor-pointer ${
                        isSelected
                          ? 'border-primary shadow-md ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                    >
                      {/* Delete Button (X) - Always visible */}
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="absolute top-2 right-2 z-20 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                        title="Konversation löschen"
                      >
                        <X size={14} />
                      </button>

                      {/* Unread Badge - Top Right (below X button) */}
                      {conversation.unreadCount > 0 && (
                        <div className="absolute top-10 right-2 z-20 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-md">
                          {conversation.unreadCount}
                        </div>
                      )}

                      <div className="flex h-full">
                        {/* Thumbnail - Full height */}
                        <div className="relative w-28 flex-shrink-0 bg-gray-100">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={conversation.propertyTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home size={32} className="text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                            {conversation.propertyTitle}
                          </h3>
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">
                              {convIsBuyer ? 'Verkäufer' : 'Interessent'}:
                            </span>{' '}
                            <span className="truncate">{convDisplayName}</span>
                          </div>
                          {conversation.lastMessageAt && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={10} className="flex-shrink-0" />
                              {new Date(conversation.lastMessageAt).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Conversation View */}
          <div className="lg:w-3/4 flex flex-col bg-gray-50 overflow-hidden">
            {selectedConversationId && selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg text-gray-900 line-clamp-1">
                        {selectedConversation.propertyTitle}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {isBuyer ? 'Verkäufer' : 'Interessent'}: {displayName}
                      </p>
                    </div>
                    <Link
                      href={`/property/${selectedConversation.propertyId}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Zum Inserat →
                    </Link>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {messages?.map((msg) => {
                      const isOwnMessage = msg.senderId === user.id;
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
                          <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                            {/* Sender Info */}
                            {!isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1 ml-1">
                                {isAI && <Bot size={16} className="text-blue-600" />}
                                <span className="text-xs text-gray-500">
                                  {isAI ? 'KI-Assistent' : displayName}
                                </span>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isOwnMessage
                                  ? 'bg-primary text-white'
                                  : isAI
                                  ? 'bg-blue-50 border-2 border-blue-200 text-gray-900'
                                  : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>

                            {/* Timestamp */}
                            <div className={`mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
                              <span className="text-xs text-gray-500">
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

                {/* Input */}
                <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                  <div className="max-w-4xl mx-auto flex gap-3">
                    <textarea
                      ref={messageInputRef}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="Nachricht schreiben..."
                      className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                      rows={1}
                      style={{
                        minHeight: '48px',
                        height: 'auto',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessageMutation.isLoading}
                      className="bg-primary text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendMessageMutation.isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Send size={20} />
                          <span className="font-medium">Senden</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
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
        </div>
      )}
    </div>
  );
}

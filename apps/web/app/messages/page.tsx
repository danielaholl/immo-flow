'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MessageSquare, Loader2, Brain, Check, X, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Header } from '../components/Header';
import { PropertyListThumbnail } from '../components/PropertyListThumbnail';
import { CollapsedThumbnailList } from '../components/CollapsedThumbnailList';
import { joinConversation, leaveConversation, onNewMessage, offNewMessage, sendTypingIndicator, onTypingIndicator, offTypingIndicator, onTypingStop, offTypingStop, onKnowledgeLearned, offKnowledgeLearned } from '@/lib/socket';
import { UniversalChat } from '../components/UniversalChat';
import type { ChatMessage } from '../components/UniversalChat/types';
import { MasterDetailLayout } from '../components/layouts/MasterDetailLayout';

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
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [learnedKnowledge, setLearnedKnowledge] = useState<{
    conversationId: string;
    learned: {
      id: string;
      topic: string;
      content: string;
      category: string;
      confidence: number;
    };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Convert messages to UniversalChat format
  const convertedMessages: ChatMessage[] = useMemo(() => {
    if (!messages || !profile) return [];

    const selectedConv = conversations?.find(c => c.id === selectedConversationId);
    const otherPerson = selectedConv?.otherParticipant;
    const otherDisplayName = otherPerson?.company ||
      `${otherPerson?.firstName || ''} ${otherPerson?.lastName || ''}`.trim() ||
      'Unbekannt';

    return messages.map((msg) => {
      const isOwnMessage = msg.senderId === profile.id;
      const isAI = msg.senderType === 'ai';
      const isSystem = msg.senderType === 'system';

      let sender: 'user' | 'bot' | 'ai' | 'system' = 'bot';
      let senderName: string | undefined;

      if (isOwnMessage) {
        sender = 'user';
      } else if (isAI) {
        sender = 'ai';
        senderName = otherDisplayName; // Show seller name instead of "KI-Assistent"
      } else if (isSystem) {
        sender = 'system';
      } else {
        sender = 'bot';
        senderName = otherDisplayName;
      }

      return {
        id: msg.id,
        content: msg.content,
        sender,
        senderName,
        timestamp: new Date(msg.createdAt),
        attachments: msg.attachments || [],
      };
    });
  }, [messages, profile, conversations, selectedConversationId]);

  // Send message mutation
  const sendMessageMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      refetchMessages();
      refetchConversations();
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
      }
    };

    onNewMessage(handleNewMessage);

    return () => {
      offNewMessage(handleNewMessage);
    };
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

    return () => {
      offTypingIndicator(handleTyping);
      offTypingStop(handleTypingStop);
    };
  }, [selectedConversationId, user?.id]);

  // Listen for knowledge learned events (when AI extracts knowledge from seller response)
  useEffect(() => {
    const handleKnowledgeLearned = (data: {
      conversationId: string;
      learned: {
        id: string;
        topic: string;
        content: string;
        category: string;
        confidence: number;
      };
    }) => {
      // Only show if it's for the currently selected conversation
      if (data.conversationId === selectedConversationId) {
        setLearnedKnowledge(data);
        // Auto-dismiss after 10 seconds if not interacted with
        setTimeout(() => {
          setLearnedKnowledge((prev) =>
            prev?.conversationId === data.conversationId ? null : prev
          );
        }, 10000);
      }
    };

    onKnowledgeLearned(handleKnowledgeLearned);

    return () => {
      offKnowledgeLearned(handleKnowledgeLearned);
    };
  }, [selectedConversationId]);

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
        attachments: [],
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

  // Handle file upload - uploads and sends immediately
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0 || !selectedConversationId) return;

    setIsUploadingFiles(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          formData.append('images', file);
        } else {
          formData.append('document', file);
        }

        const endpoint = isImage ? '/upload/property-images' : '/upload/property-document';

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();

        let attachment: { url: string; type: string; name: string; size?: number; thumbnailUrl?: string } | null = null;

        if (isImage && result.data) {
          // For images, use the large variant URL
          const imageData = Array.isArray(result.data) ? result.data[0] : result.data;
          attachment = {
            url: imageData.large || imageData.medium || imageData.thumbnail,
            type: file.type,
            name: file.name,
            size: file.size,
          };
        } else if (result.data) {
          // For documents (including PDFs), include thumbnailUrl if available
          attachment = {
            url: result.data.url,
            type: file.type,
            name: file.name,
            size: file.size,
            thumbnailUrl: result.data.thumbnailUrl,
          };
        }

        // Send message with attachment immediately
        if (attachment) {
          await sendMessageMutation.mutateAsync({
            conversationId: selectedConversationId,
            content: '',
            attachments: [attachment],
          });
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Fehler beim Hochladen der Dateien.');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  if (authLoading || conversationsLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#030712]">
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
    <main className="min-h-screen bg-white dark:bg-[#030712]">
      <Header />

      <MasterDetailLayout
        storageKey="messages"
        hasItems={!!conversations && conversations.length > 0}
        showDetail={!!selectedConversationId}
        emptyState={
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Noch keine Nachrichten
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Sie haben noch keine Konversationen gestartet. Finden Sie interessante Immobilien und stellen Sie Fragen direkt an die Verkäufer.
            </p>
            <Link href="/">
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Immobilien entdecken
              </button>
            </Link>
          </div>
        }
        desktopHeader={
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nachrichten</h1>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setConversationFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  conversationFilter === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Alle ({conversations?.length || 0})
              </button>
              <button
                onClick={() => setConversationFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  conversationFilter === 'unread'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Ungelesen ({unreadConversationsCount})
              </button>
            </div>
          </>
        }
        mobileHeader={
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nachrichten</h1>
          </div>
        }
        collapsedContent={
          <CollapsedThumbnailList
            items={filteredConversations.map((conv) => ({
              id: conv.id,
              title: conv.propertyTitle || 'Immobilie',
              image: conv.propertyImages?.[0],
            }))}
            selectedId={selectedConversationId || lastSelectedId}
            onSelect={setSelectedConversationId}
          />
        }
        masterContent={
          <>
            {/* Filter Buttons - Mobile */}
            <div className="lg:hidden flex gap-2 mb-4">
              <button
                onClick={() => setConversationFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  conversationFilter === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Alle ({conversations?.length || 0})
              </button>
              <button
                onClick={() => setConversationFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  conversationFilter === 'unread'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Ungelesen ({unreadConversationsCount})
              </button>
            </div>

            {/* Conversations List */}
            <div className="space-y-3">
              {filteredConversations.map((conversation) => {
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
                    title={conversation.propertyTitle || 'Immobilie'}
                    isSelected={isSelected}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    image={conversation.propertyImages?.[0]}
                    price={conversation.propertyPrice}
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
          </>
        }
        detailContent={
          <div className="flex h-full overflow-hidden">
            {/* Chat Column */}
            <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-[#030712] overflow-hidden pb-8 lg:pb-0">
              {selectedConversationId && selectedConversation ? (
                (() => {
                  const isBuyer = selectedConversation.role === 'buyer';
                  const otherPerson = selectedConversation.otherParticipant;
                  const displayName = otherPerson?.company ||
                                     `${otherPerson?.firstName || ''} ${otherPerson?.lastName || ''}`.trim() ||
                                     'Unbekannt';

                  return (
                    <>
                      {/* Knowledge Learned Notification */}
                      {learnedKnowledge && learnedKnowledge.conversationId === selectedConversationId && !isBuyer && (
                        <div className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-700 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                              <Brain size={16} className="text-purple-600 dark:text-purple-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                Neue Information zur Wissensbasis hinzugefuegt
                              </p>
                              <p className="text-sm text-purple-700 dark:text-purple-300 mt-0.5">
                                <span className="font-medium">{learnedKnowledge.learned.topic}:</span>{' '}
                                {learnedKnowledge.learned.content.substring(0, 100)}
                                {learnedKnowledge.learned.content.length > 100 ? '...' : ''}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => setLearnedKnowledge(null)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                >
                                  <Check size={12} />
                                  OK
                                </button>
                                <Link
                                  href={`/my-properties?property=${selectedConversation.propertyId}`}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600 rounded hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Pencil size={12} />
                                  Bearbeiten
                                </Link>
                                <button
                                  onClick={() => setLearnedKnowledge(null)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                  <X size={12} />
                                  Schliessen
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <UniversalChat
                        key={selectedConversationId}
                        messages={convertedMessages}
                      header={{
                        title: selectedConversation.propertyTitle,
                        subtitle: `${isBuyer ? 'Verkäufer' : 'Interessent'}: ${displayName}`,
                        icon: <MessageSquare size={20} className="text-gray-600 dark:text-gray-400" />,
                        showBackButton: true,
                        backButtonMobileOnly: true,
                        onBackClick: () => setSelectedConversationId(null),
                      }}
                      input={{
                        placeholder: "Nachricht schreiben...",
                        disabled: sendMessageMutation.isLoading || isUploadingFiles,
                        showFileUpload: true,
                        acceptedFileTypes: "image/jpeg,image/png,image/webp,application/pdf",
                        multipleFiles: true,
                      }}
                      inputValue={message}
                      onInputChange={(value) => {
                        setMessage(value);
                        handleTyping();
                      }}
                      onSendMessage={() => handleSendMessage()}
                      onFileUpload={handleFileUpload}
                      isTyping={!!typingUser}
                      isSending={sendMessageMutation.isLoading}
                      isUploading={isUploadingFiles}
                      fileInputRef={fileInputRef}
                      messagesEndRef={messagesEndRef}
                      showTimestamps={true}
                      showSenderNames={true}
                      className="h-full"
                    />
                    </>
                  );
                })()
              ) : (
                <div className="h-full flex items-center justify-center px-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={48} className="text-gray-400 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Keine Konversation ausgewählt
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-base">
                      Wählen Sie eine Konversation aus der Liste links aus, um Ihre Nachrichten zu sehen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
        height="calc(100vh - 80px)"
      />
    </main>
  );
}

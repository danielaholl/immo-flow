'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../components/Header';
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { UniversalChat, ChatMessage } from '../components/UniversalChat';
import { trpc } from '@/lib/trpc';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateListingAIPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthContext();
  const hasInitialized = useRef(false);

  // State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [listingData, setListingData] = useState<any>({});
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'chat'>('welcome');

  // tRPC mutations
  const extractDataMutation = trpc.aiChat.extractPropertyData.useMutation();
  const createPropertyMutation = trpc.properties.create.useMutation();

  // Initialize
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Welcome message
    addBotMessage('Hey! Ich bin Ela, deine KI-Assistentin. Ich helfe dir, dein Inserat in wenigen Schritten zu erstellen.');
    setTimeout(() => {
      addBotMessage('Erzähl mir einfach über deine Immobilie. Du kannst auch jederzeit Bilder hochladen, indem du sie hier reinziehst oder auf das Clip-Symbol klickst.');
      setCurrentStep('chat');
    }, 1000);
  }, [user, loading]);

  const addBotMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender: 'bot',
      senderName: 'Ela',
      timestamp: new Date(),
    }]);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender: 'user',
      timestamp: new Date(),
    }]);
  };

  // Convert ChatMessage[] to display format
  const displayMessages = useMemo(() => chatMessages, [chatMessages]);

  // File upload handler
  const handleFileUpload = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

    if (imageFiles.length === 0 && pdfFiles.length === 0) return;

    setIsUploadingImages(true);

    try {
      // Handle image uploads
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(file => formData.append('images', file));

        const token = localStorage.getItem('auth_token');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch('http://localhost:4000/upload/property-images', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to upload images');
        }

        const result = await response.json();

        if (result.success && result.data) {
          const imageUrls = result.data.map((img: any) => img.original);
          setUploadedImages(prev => [...prev, ...imageUrls]);
          setListingData((prev: any) => ({ ...prev, images: [...(prev.images || []), ...imageUrls] }));
          addBotMessage(`Super! Ich habe ${imageUrls.length} Bild${imageUrls.length > 1 ? 'er' : ''} erhalten. Du kannst noch mehr Bilder hinzufügen oder mir von deiner Immobilie erzählen.`);
        }
      }

      // Handle PDF uploads (if needed)
      if (pdfFiles.length > 0) {
        addBotMessage('PDF-Verarbeitung wird noch implementiert. Bitte beschreibe deine Immobilie stattdessen.');
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      addBotMessage('Entschuldigung, beim Hochladen der Dateien ist ein Fehler aufgetreten. Bitte versuche es nochmal.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Handle send message
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || extractDataMutation.isLoading) return;

    addUserMessage(messageContent);
    setTextInput('');

    const newHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: messageContent },
    ];
    setConversationHistory(newHistory);

    try {
      const result = await extractDataMutation.mutateAsync({
        message: messageContent,
        conversationHistory: newHistory,
        currentData: listingData,
      });

      setListingData(result.extractedData);

      setConversationHistory([
        ...newHistory,
        { role: 'assistant' as const, content: result.response },
      ]);

      addBotMessage(result.response);

      if (result.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          addBotMessage(
            'Perfekt! Ich habe alle wichtigen Informationen. ' +
            'Du kannst das Inserat jetzt veröffentlichen oder noch weitere Details hinzufügen.'
          );
        }, 500);
      } else if (result.followUpQuestion) {
        setTimeout(() => {
          addBotMessage(result.followUpQuestion);
        }, 500);
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      addBotMessage('Entschuldigung, da ist etwas schiefgegangen. Kannst du es bitte nochmal versuchen?');
    }
  };

  // Submit property
  const handleSubmit = async () => {
    if (!isComplete) {
      alert('Bitte fülle alle erforderlichen Felder aus.');
      return;
    }

    setIsSubmitting(true);

    try {
      const propertyData = {
        ...listingData,
        user_id: user?.id,
        images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
      };

      await createPropertyMutation.mutateAsync(propertyData);

      addBotMessage('Dein Inserat wurde erfolgreich erstellt! Ich leite dich zur Übersicht weiter...');

      setTimeout(() => {
        router.push('/my-properties');
      }, 2000);
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Fehler beim Erstellen des Inserats. Bitte versuche es erneut.');
      setIsSubmitting(false);
    }
  };

  const previewData: PropertyPreviewData = {
    id: '0',
    property_type: listingData.property_type || 'apartment',
    title: listingData.title || 'Deine Immobilie',
    location: listingData.location || '',
    price: listingData.price || 0,
    sqm: listingData.sqm || 0,
    rooms: listingData.rooms || 0,
    condition: listingData.condition || 'good',
    images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    description: listingData.description || '',
    features: listingData.features || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: user?.id || '',
    owner_profile: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      company: profile?.company || null,
      avatar_url: profile?.avatar_url || null,
      user_type: profile?.user_type || 'private',
      phone: profile?.phone || null,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/create-listing')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Zurück zum klassischen Wizard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Chat Section - Using UniversalChat */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <UniversalChat
              messages={displayMessages}
              header={{
                title: 'Ela - Deine KI-Assistentin',
                subtitle: 'Powered by GPT-4',
                icon: <Sparkles size={20} className="text-gray-600" />,
              }}
              input={{
                placeholder: 'Beschreibe deine Immobilie...',
                disabled: currentStep !== 'chat' || extractDataMutation.isLoading,
                showFileUpload: true,
                acceptedFileTypes: 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
                multipleFiles: true,
              }}
              inputValue={textInput}
              onInputChange={setTextInput}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              isTyping={extractDataMutation.isLoading}
              typingText="Ela analysiert deine Nachricht..."
              isUploading={isUploadingImages}
              enableDragDrop={true}
              showTimestamps={false}
              showSenderNames={true}
            />
          </div>

          {/* Preview Section */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Live-Vorschau</h3>
              <PropertyPreview data={previewData} showActions={false} />

              {/* Publish Button */}
              {isComplete && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    'Inserat veröffentlichen'
                  )}
                </button>
              )}

              {/* Extracted Fields Info */}
              {Object.keys(listingData).length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-2">Extrahierte Felder:</p>
                  <div className="space-y-1">
                    {Object.entries(listingData).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../components/Header';
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { trpc } from '@/lib/trpc';
import { Sparkles, ImagePlus, X, Send, ArrowLeft, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  extractedData?: any;
}

export default function CreateListingAIPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [listingData, setListingData] = useState<any>({});
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'chat'>('welcome');

  // Drag & Drop States
  const [isDragOver, setIsDragOver] = useState(false);

  // tRPC mutations
  const extractDataMutation = trpc.aiChat.extractPropertyData.useMutation();
  const createPropertyMutation = trpc.properties.create.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize
  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }

    // Redirect to home if not authenticated
    if (!user) {
      router.push('/');
      return;
    }

    // Prevent double initialization in React StrictMode
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // Welcome message
    addBotMessage('Hey! Ich bin Ela, deine KI-Assistentin. Ich helfe dir, dein Inserat in wenigen Schritten zu erstellen.');
    setTimeout(() => {
      addBotMessage('Erzähl mir einfach über deine Immobilie. Du kannst auch jederzeit Bilder hochladen, indem du sie hier reinziehst oder auf das + Symbol klickst.');
      setCurrentStep('chat');
    }, 1000);
  }, [user, loading]);

  const addBotMessage = (content: string, extractedData?: any) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'bot',
      content,
      extractedData,
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
    }]);
  };

  // Image upload
  const processImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingImages(true);

    try {
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
        console.log(`✅ Successfully uploaded ${imageUrls.length} images`);

        // Show success message in chat
        addBotMessage(`Super! Ich habe ${imageUrls.length} Bild${imageUrls.length > 1 ? 'er' : ''} erhalten. ${uploadedImages.length + imageUrls.length > 0 ? 'Du kannst noch mehr Bilder hinzufügen oder mir von deiner Immobilie erzählen.' : ''}`);
      }
    } catch (error) {
      console.error('❌ Failed to upload images:', error);
      addBotMessage(`Entschuldigung, beim Hochladen der Bilder ist ein Fehler aufgetreten. Bitte versuche es nochmal.`);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setListingData((prev: any) => ({ ...prev, images: newImages }));
  };

  // Drag and drop handlers for chat area
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the chat container
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFiles(files);
    }
  };

  // Handle text message
  const handleSendMessage = async () => {
    if (!textInput.trim() || extractDataMutation.isLoading) return;

    const userMessage = textInput.trim();
    setTextInput('');
    addUserMessage(userMessage);

    // Add to conversation history
    const newHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];
    setConversationHistory(newHistory);

    try {
      // Call AI extraction
      const result = await extractDataMutation.mutateAsync({
        message: userMessage,
        conversationHistory: newHistory,
        currentData: listingData,
      });

      // Update listing data
      setListingData(result.extractedData);

      // Add to conversation history
      setConversationHistory([
        ...newHistory,
        { role: 'assistant' as const, content: result.response },
      ]);

      // Add bot response
      addBotMessage(result.response, result.extractedData);

      // Check if complete
      if (result.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          addBotMessage(
            '🎉 Perfekt! Ich habe alle wichtigen Informationen. ' +
            'Du kannst das Inserat jetzt veröffentlichen oder noch weitere Details hinzufügen.'
          );
        }, 500);
      } else if (result.followUpQuestion) {
        // AI has a follow-up question
        setTimeout(() => {
          addBotMessage(result.followUpQuestion);
        }, 500);
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      addBotMessage(
        '❌ Entschuldigung, da ist etwas schiefgegangen. Kannst du es bitte nochmal versuchen?'
      );
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
      // Prepare property data
      const propertyData = {
        ...listingData,
        user_id: user?.id,
        images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
      };

      // Create property
      const result = await createPropertyMutation.mutateAsync(propertyData);

      // Success
      addBotMessage('✅ Dein Inserat wurde erfolgreich erstellt! Ich leite dich zur Übersicht weiter...');

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
          {/* Chat Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">AI-Assistent</h2>
                  <p className="text-sm text-white/80">Powered by GPT-4</p>
                </div>
              </div>
            </div>

            {/* Messages - Drag & Drop Zone */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4 relative"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-xl px-6 py-4 shadow-lg">
                    <ImagePlus size={48} className="text-primary mx-auto mb-2" />
                    <p className="text-lg font-medium text-primary">Bilder hier ablegen</p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Show uploaded images in chat */}
              {uploadedImages.length > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img}
                            alt={`Upload ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {extractDataMutation.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <p className="text-sm text-gray-600">Ela analysiert deine Nachricht...</p>
                  </div>
                </div>
              )}

              {isUploadingImages && (
                <div className="flex justify-end">
                  <div className="bg-primary/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <p className="text-sm text-primary">Bilder werden hochgeladen...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input with + Button */}
            {currentStep === 'chat' && (
              <div className="p-4 border-t border-gray-200">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex gap-2">
                  {/* Image Upload Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImages}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Bilder hochladen"
                  >
                    <ImagePlus size={20} />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Beschreibe deine Immobilie..."
                    disabled={extractDataMutation.isLoading}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!textInput.trim() || extractDataMutation.isLoading}
                    className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>

                {isComplete && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Live-Vorschau</h3>
              <PropertyPreview data={previewData} showActions={false} />

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

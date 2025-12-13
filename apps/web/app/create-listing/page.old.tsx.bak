'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../components/Header';
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { SlideshowManagerProvider } from '../components/SlideshowManagerContext';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { trpc } from '@/lib/trpc';
import { Sparkles, ImagePlus, Send, Loader2, MessageSquare, Eye, Images } from 'lucide-react';
import type {
  ListingData,
  InvestmentEvaluation,
  Message,
  ConversationMessage,
  UploadedImageResponse
} from './types';

export default function CreateListingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [listingData, setListingData] = useState<ListingData>({});
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'chat'>('welcome');
  const [mobileView, setMobileView] = useState<'chat' | 'preview' | 'images'>('chat');
  const [showInvestmentAnalysis, setShowInvestmentAnalysis] = useState(false);
  const [investmentEvaluation, setInvestmentEvaluation] = useState<InvestmentEvaluation | null>(null);

  // Drag & Drop States
  const [isDragOver, setIsDragOver] = useState(false);

  // tRPC mutations and utils
  const extractDataMutation = trpc.aiChat.extractPropertyData.useMutation();
  const createPropertyMutation = trpc.properties.create.useMutation();
  const generateInvestmentEvaluationMutation = trpc.evaluations.generateInvestmentEvaluation.useMutation();
  const trpcUtils = trpc.useContext();

  // Check if essential data is available for investment analysis
  const hasEssentialData = listingData.price && listingData.sqm && listingData.location;

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
      setTimeout(() => {
        addBotMessage('Was für ein Objekt möchtest du inserieren? Wohnung, Haus, Villa oder Gewerbe?');
        setCurrentStep('chat');
      }, 1000);
    }, 1000);
  }, [user, loading]);

  const addBotMessage = (content: string, extractedData?: ListingData) => {
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/upload/property-images`, {
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
        const imageUrls = result.data.map((img: UploadedImageResponse) => img.original);
        setUploadedImages(prev => [...prev, ...imageUrls]);
        setListingData((prev) => ({ ...prev, images: [...(prev.images || []), ...imageUrls] }));
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

  // Function to remove image (not currently used in UI but available for future use)
  const _handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setListingData((prev) => ({ ...prev, images: newImages }));
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

    // Re-focus input field after sending
    setTimeout(() => textInputRef.current?.focus(), 100);

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
        conversationHistory: newHistory || [],
        currentData: listingData || {},
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

      // Re-focus input after bot response
      setTimeout(() => textInputRef.current?.focus(), 200);

      // Check if complete
      if (result.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          addBotMessage(
            '🎉 Perfekt! Ich habe alle wichtigen Informationen. ' +
            'Du kannst das Inserat jetzt veröffentlichen oder noch weitere Details hinzufügen.'
          );
          setTimeout(() => textInputRef.current?.focus(), 200);
        }, 500);
      } else if (result.followUpQuestion) {
        // AI has a follow-up question
        setTimeout(() => {
          addBotMessage(result.followUpQuestion);
          setTimeout(() => textInputRef.current?.focus(), 200);
        }, 500);
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      addBotMessage(
        '❌ Entschuldigung, da ist etwas schiefgegangen. Kannst du es bitte nochmal versuchen?'
      );
    }
  };

  // Trigger Investment Analysis
  const handleShowInvestmentAnalysis = async () => {
    setShowInvestmentAnalysis(true);
    addBotMessage('Einen Moment, ich analysiere deine Immobilie aus Investoren-Sicht...');

    try {
      // Create temporary property to get evaluation
      const tempPropertyData = {
        ...listingData,
        user_id: user?.id,
        // Provide default values for required fields if not yet filled
        title: listingData.title || `${listingData.property_type || 'Immobilie'} ${listingData.location || ''}`.trim(),
        rooms: listingData.rooms || 0,
        condition: listingData.condition || 'maintained',
        images: uploadedImages.length > 0 ? uploadedImages : [],
      };

      // Create property temporarily
      const result = await createPropertyMutation.mutateAsync(tempPropertyData);

      // Generate investment evaluation using tRPC mutation
      const evaluationResult = await generateInvestmentEvaluationMutation.mutateAsync({
        propertyId: result.id,
      });

      if (evaluationResult?.success) {
        // Fetch the full property with ai_detailed_evaluation
        const property = await trpcUtils.properties.getById.fetch({ id: result.id });

        if (property?.ai_detailed_evaluation) {
          // Parse the detailed evaluation data
          const detailedEval = typeof property.ai_detailed_evaluation === 'string'
            ? JSON.parse(property.ai_detailed_evaluation)
            : property.ai_detailed_evaluation;

          setInvestmentEvaluation({
            ...evaluationResult.evaluation,
            ...detailedEval,
          });
          addBotMessage('✅ Analyse abgeschlossen! Schau dir die Investment-Bewertung in der Vorschau an.');
        }
      }
    } catch (error) {
      console.error('Error generating investment analysis:', error);
      addBotMessage('❌ Fehler bei der Analyse. Bitte versuche es später erneut.');
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
      await createPropertyMutation.mutateAsync(propertyData);

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
    important_notes: listingData.important_notes || undefined,
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
    // Investment evaluation data - Map from investmentEvaluation
    ai_investment_score: investmentEvaluation?.overall_score,
    yield_metrics: investmentEvaluation?.yield_metrics,
    rental_income: investmentEvaluation?.rental_income,
    cashflow_calculation: investmentEvaluation?.cashflow_calculation,
    evaluation: investmentEvaluation?.evaluation,
  };

  return (
    <SlideshowManagerProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />

      <div className="max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-8 py-3 lg:py-6">
        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1">
            <button
              onClick={() => setMobileView('chat')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                mobileView === 'chat'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-sm font-medium">Chat</span>
            </button>
            <button
              onClick={() => setMobileView('preview')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                mobileView === 'preview'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye size={18} />
              <span className="text-sm font-medium">Vorschau</span>
            </button>
            <button
              onClick={() => setMobileView('images')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                mobileView === 'images'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Images size={18} />
              <span className="text-sm font-medium">Bilder</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Chat Section - Links */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full ${
            mobileView !== 'chat' ? 'hidden lg:flex' : ''
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-3 lg:px-6 lg:py-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles size={20} className="lg:w-6 lg:h-6" />
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold">Ela - Deine KI-Assistentin</h2>
                  <p className="text-xs lg:text-sm text-white/80">Powered by GPT-4</p>
                </div>
              </div>
            </div>

            {/* Messages - Drag & Drop Zone */}
            <div
              className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-3 lg:space-y-4 relative"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-xl px-4 py-3 lg:px-6 lg:py-4 shadow-lg">
                    <ImagePlus size={36} className="lg:w-12 lg:h-12 text-primary mx-auto mb-2" />
                    <p className="text-base lg:text-lg font-medium text-primary">Bilder hier ablegen</p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[80%] rounded-2xl px-3 py-2 lg:px-4 lg:py-3 ${
                      msg.type === 'user'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm lg:text-base whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {extractDataMutation.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {isUploadingImages && (
                <div className="flex justify-end">
                  <div className="bg-primary/10 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-2">
                    <Loader2 size={14} className="lg:w-4 lg:h-4 animate-spin text-primary" />
                    <p className="text-xs lg:text-sm text-primary">Bilder werden hochgeladen...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input with + Button */}
            {currentStep === 'chat' && (
              <div className="p-3 lg:p-4 border-t border-gray-200">
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
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 lg:p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Bilder hochladen"
                  >
                    <ImagePlus size={18} className="lg:w-5 lg:h-5" />
                  </button>

                  {/* Text Input */}
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Beschreibe deine Immobilie..."
                    disabled={extractDataMutation.isLoading}
                    className="flex-1 px-3 py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!textInput.trim() || extractDataMutation.isLoading}
                    className="bg-primary hover:bg-primary/90 text-white p-2.5 lg:p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} className="lg:w-5 lg:h-5" />
                  </button>
                </div>

                {isComplete && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full mt-2 lg:mt-3 bg-green-600 hover:bg-green-700 text-white py-2.5 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="lg:w-5 lg:h-5 animate-spin" />
                        <span className="text-sm lg:text-base">Wird erstellt...</span>
                      </>
                    ) : (
                      'Inserat veröffentlichen'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview Section - Mitte (scrollbar) */}
          <div className={`overflow-y-auto h-full ${
            mobileView !== 'preview' ? 'hidden lg:block' : ''
          }`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full">
              {listingData.title || listingData.location || uploadedImages.length > 0 ? (
                <div className="p-4 lg:p-6">
                  <PropertyPreview
                    data={previewData}
                    showConsentSection={false}
                    showInvestmentAnalysisButton={Boolean(hasEssentialData && !showInvestmentAnalysis && !investmentEvaluation)}
                    onTriggerInvestmentAnalysis={handleShowInvestmentAnalysis}
                    isGeneratingInvestmentAnalysis={Boolean(showInvestmentAnalysis && !investmentEvaluation)}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Slideshow Section - Rechts (nicht scrollbar) */}
          <div className={`h-full flex items-start ${
            mobileView !== 'images' ? 'hidden lg:flex' : ''
          }`}>
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200">
              <PropertyImageSlideshow
                images={uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800']}
                title={listingData.title || 'Deine Immobilie'}
                duration={3000}
                showCounter={true}
                showProgressBars={true}
                rounded="none"
                aspectRatio="auto"
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </SlideshowManagerProvider>
  );
}

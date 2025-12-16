/**
 * Wiederverwendbare Komponente für Immobilienerstellung und -bearbeitung
 * Verwendet sowohl in create-listing als auch edit-listing
 */
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { PropertyPreview, PropertyPreviewData } from './PropertyPreview';
import { SlideshowManagerProvider } from './SlideshowManagerContext';
import { PropertyImageSlideshow } from './PropertyImageSlideshow';
import { trpc } from '@/lib/trpc';
import { MessageSquare, Eye, Images, Loader2, Sparkles } from 'lucide-react';
import { useConversationalAI } from '../create-listing/hooks/useConversationalAI';
import { useImageUpload } from '../create-listing/hooks/useImageUpload';
import { useVideoUpload } from '../create-listing/hooks/useVideoUpload';
import type { ListingData } from '../create-listing/types';
import { UniversalChat } from './UniversalChat';
import type { ChatMessage } from './UniversalChat/types';

interface PropertyListingManagerProps {
  propertyId?: string; // Optional: wenn vorhanden, ist es Edit-Modus
  mode?: 'create' | 'edit' | 'import'; // Mode: create (default), edit (mit propertyId), import (neue Property aus externen Quellen)
}

export function PropertyListingManager({ propertyId, mode = 'create' }: PropertyListingManagerProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuthContext();

  // Mode detection
  const isEditMode = mode === 'edit' || (!!propertyId && mode !== 'import');
  const isImportMode = mode === 'import';

  // State
  const [listingData, setListingData] = useState<ListingData>({});
  const [currentStep, setCurrentStep] = useState<'welcome' | 'chat'>('welcome');
  const [mobileView, setMobileView] = useState<'chat' | 'preview' | 'images'>('chat');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(isEditMode);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isImportingFromUrl, setIsImportingFromUrl] = useState(false);
  const [urlImportError, setUrlImportError] = useState<string | null>(null);

  // Property URL Import state (for scraping from ImmoScout24, Kleinanzeigen, etc.)
  const [propertyUrl, setPropertyUrl] = useState('');
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Image upload dialog state
  const [showImageDialog, setShowImageDialog] = useState(false);

  // Custom hooks
  const {
    messages,
    conversationHistory,
    isComplete,
    textInput,
    textInputRef,
    messagesEndRef,
    setTextInput,
    addBotMessage,
    addUserMessage,
    updateConversationHistory,
    setIsComplete,
    initializeWelcomeMessages,
  } = useConversationalAI();

  const {
    uploadedImages,
    isUploadingImages,
    fileInputRef,
    processImageFiles,
    handleImageUpload,
    setUploadedImages,
  } = useImageUpload((count) => {
    // Success callback when images are uploaded
    if (isImportMode) {
      addBotMessage(
        `Super! Ich habe ${count} Screenshot${count > 1 ? 's' : ''} für die Datenextraktion erhalten. Lade weitere Screenshots hoch oder ich starte die Analyse.`
      );
    } else {
      addBotMessage(
        `Super! Ich habe ${count} Bild${count > 1 ? 'er' : ''} erhalten. Du kannst noch mehr Bilder, Videos hinzufügen oder mir von deiner Immobilie erzählen.`
      );
    }
  });

  const {
    videoUrl,
    setVideoUrl,
  } = useVideoUpload();

  // Sync uploaded images with listing data
  useEffect(() => {
    if (uploadedImages.length > 0) {
      setListingData((prev) => ({
        ...prev,
        images: uploadedImages
      }));
    }
  }, [uploadedImages]);

  // Sync video URL with listing data
  useEffect(() => {
    setListingData((prev) => ({
      ...prev,
      video_url: videoUrl
    }));
  }, [videoUrl]);

  // Delete handlers for images and video
  const handleDeleteImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
    addBotMessage('Bild wurde entfernt.');
  }, [addBotMessage]);

  const handleDeleteVideo = useCallback(() => {
    setVideoUrl(null);
    addBotMessage('Video wurde entfernt.');
  }, [setVideoUrl, addBotMessage]);

  // tRPC mutations and utils
  const extractDataMutation = trpc.aiChat.extractPropertyData.useMutation();
  const createPropertyMutation = trpc.properties.create.useMutation();
  const updatePropertyMutation = trpc.properties.update.useMutation();
  const generateKIEvaluationMutation = trpc.properties.generateKIEvaluation.useMutation();
  const analyzePdfMutation = trpc.properties.analyzePdfExpose.useMutation();
  const analyzeExternalUrlMutation = trpc.properties.analyzeExternalUrl.useMutation();
  const classifyAndAnalyzeImagesMutation = trpc.properties.classifyAndAnalyzeImages.useMutation();

  // Fetch property data if in edit mode
  const { data: propertyToEdit } = trpc.properties.getById.useQuery(
    { id: propertyId! },
    { enabled: isEditMode && !!propertyId }
  );

  // Load property data in edit mode
  useEffect(() => {
    if (!isEditMode || !propertyToEdit) return;

    // Convert property data to ListingData format - ensure numbers are numbers
    const propertyData: ListingData = {
      id: propertyToEdit.id, // Important: include ID for AIEvaluationPanel to show in edit mode
      property_type: (propertyToEdit as any).property_type,
      title: propertyToEdit.title,
      location: propertyToEdit.location,
      address: propertyToEdit.address ?? undefined,
      postal_code: (propertyToEdit as any).postal_code ?? undefined,
      price: typeof propertyToEdit.price === 'string' ? parseFloat(propertyToEdit.price) : propertyToEdit.price,
      sqm: typeof propertyToEdit.sqm === 'string' ? parseFloat(propertyToEdit.sqm) : propertyToEdit.sqm,
      rooms: typeof propertyToEdit.rooms === 'string' ? parseFloat(propertyToEdit.rooms) : propertyToEdit.rooms,
      plot_size: (propertyToEdit as any).plot_size ? (typeof (propertyToEdit as any).plot_size === 'string' ? parseFloat((propertyToEdit as any).plot_size) : (propertyToEdit as any).plot_size) : undefined,
      condition: (propertyToEdit as any).condition ?? undefined,
      description: propertyToEdit.description ?? undefined,
      features: propertyToEdit.features ?? undefined,
      important_notes: (propertyToEdit as any).important_notes ?? undefined,
      year_built: (propertyToEdit as any).year_built ? (typeof (propertyToEdit as any).year_built === 'string' ? parseInt((propertyToEdit as any).year_built) : (propertyToEdit as any).year_built) : undefined,
      floor_level: (propertyToEdit as any).floor_level ?? undefined,
      total_floors: (propertyToEdit as any).total_floors ? (typeof (propertyToEdit as any).total_floors === 'string' ? parseInt((propertyToEdit as any).total_floors) : (propertyToEdit as any).total_floors) : undefined,
      bathrooms: (propertyToEdit as any).bathrooms ? (typeof (propertyToEdit as any).bathrooms === 'string' ? parseInt((propertyToEdit as any).bathrooms) : (propertyToEdit as any).bathrooms) : undefined,
      balcony: (propertyToEdit as any).balcony ?? undefined,
      parking: (propertyToEdit as any).parking ?? undefined,
      elevator: (propertyToEdit as any).elevator ?? undefined,
      furnished: (propertyToEdit as any).furnished ?? undefined,
      available_from: (propertyToEdit as any).available_from ?? undefined,
      heating_type: (propertyToEdit as any).heating_type ?? undefined,
      energy_efficiency_class: (propertyToEdit as any).energy_efficiency_class ?? undefined,
      commission: (propertyToEdit as any).commission_rate ? (typeof (propertyToEdit as any).commission_rate === 'string' ? parseFloat((propertyToEdit as any).commission_rate) : (propertyToEdit as any).commission_rate) : undefined,
      additional_costs: (propertyToEdit as any).monthly_fee ? (typeof (propertyToEdit as any).monthly_fee === 'string' ? parseFloat((propertyToEdit as any).monthly_fee) : (propertyToEdit as any).monthly_fee) : undefined,
      // Load seller evaluation if exists (for AIEvaluationPanel in edit mode)
      seller_evaluation: (propertyToEdit as any).seller_evaluation ?? undefined,
    };

    setListingData(propertyData);

    // Load images
    if (propertyToEdit.images && propertyToEdit.images.length > 0) {
      setUploadedImages(propertyToEdit.images);
    }

    // Load video
    if ((propertyToEdit as any).video_url) {
      setVideoUrl((propertyToEdit as any).video_url);
    }

    setIsLoadingProperty(false);
  }, [isEditMode, propertyToEdit, setUploadedImages, setVideoUrl]);

  // Track if welcome message was shown
  const welcomeShownRef = useRef(false);

  // Initialize welcome messages
  useEffect(() => {
    if (loading || isLoadingProperty) return;
    if (!user) {
      router.push('/');
      return;
    }

    // Prevent multiple executions
    if (welcomeShownRef.current) return;
    welcomeShownRef.current = true;

    // Different message based on mode
    if (isEditMode) {
      addBotMessage('Hey! Du kannst jetzt deine Immobilie bearbeiten. Sag mir einfach, was du ändern möchtest - z.B. "Ändere den Preis auf 450.000 €" oder "Aktualisiere die Beschreibung". Ich helfe dir dabei!');
    } else if (isImportMode) {
      initializeWelcomeMessages('import');
    } else {
      initializeWelcomeMessages('create');
    }
    setCurrentStep('chat');
  }, [user, loading, isLoadingProperty, router, initializeWelcomeMessages, isEditMode, isImportMode, addBotMessage]);

  // Handle text message (memoized for performance)
  const handleSendMessage = useCallback(async () => {
    if (!textInput.trim() || extractDataMutation.isLoading) return;

    const userMessage = textInput.trim();
    setTextInput('');
    addUserMessage(userMessage);

    // Re-focus input field after sending
    setTimeout(() => textInputRef.current?.focus(), 100);

    try {
      // Call AI extraction (conversation history does NOT include the new user message yet)
      const result = await extractDataMutation.mutateAsync({
        message: userMessage,
        conversationHistory: conversationHistory || [],
        currentData: convertToEnglishEnums(listingData || {}),
        isEditMode: isEditMode,
      });

      // Update listing data and convert German enums to English
      // In edit mode: MERGE changes with existing data (keep all existing fields)
      // In create mode: Replace with new data
      const newData = convertToEnglishEnums(result.extractedData);
      setListingData(prev => ({
        ...prev, // Keep all existing data (important for edit mode!)
        ...newData, // Merge in the changes
        // Explicitly clear AI rating fields after data extraction
        ai_rating_explanation: undefined,
        strengths: undefined,
        weaknesses: undefined,
        opportunities: undefined,
        risks: undefined,
        ai_score: undefined,
      }));

      // Add both user message and assistant response to conversation history
      updateConversationHistory([
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: result.response },
      ]);

      // Add bot response (AI already provides confirmation)
      addBotMessage(result.response, result.extractedData);

      // Re-focus input after bot response
      setTimeout(() => textInputRef.current?.focus(), 200);

      // Check if complete
      if (result.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          addBotMessage(
            'Perfekt! Alle wichtigen Informationen sind erfasst. Du kannst jetzt eine KI-Bewertung starten oder das Inserat direkt veröffentlichen.'
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
        'Entschuldigung, da ist etwas schiefgegangen. Kannst du es bitte nochmal versuchen?'
      );
    }
  }, [textInput, extractDataMutation, listingData, conversationHistory, addUserMessage, setTextInput, updateConversationHistory, addBotMessage, setIsComplete, textInputRef, isEditMode]);

  // Convert German enum values to English
  const convertToEnglishEnums = (data: any) => {
    const heatingTypeMap: Record<string, string> = {
      'zentralheizung': 'central',
      'etagenheizung': 'floor',
      'gasheizung': 'gas',
      'ölheizung': 'oil',
      'fernwärme': 'district',
      'elektrische heizung': 'electric',
      'solarheizung': 'solar',
      'wärmepumpe': 'heat_pump',
      'andere': 'other',
    };

    const conditionMap: Record<string, string> = {
      'neu': 'new',
      'wie neu': 'new',
      'neuwertig': 'new',
      'gepflegt': 'maintained',
      'sanierungsbedürftig': 'needs_renovation',
      'renoviert': 'renovated',
      'erstbezug': 'first_occupancy',
      'zum abriss': 'needs_renovation',
    };

    const converted = { ...data };

    // Convert heating_type (case-insensitive)
    if (converted.heating_type && typeof converted.heating_type === 'string') {
      const heatingKey = converted.heating_type.toLowerCase();
      if (heatingTypeMap[heatingKey]) {
        converted.heating_type = heatingTypeMap[heatingKey];
      }
    }

    // Convert condition (case-insensitive)
    if (converted.condition && typeof converted.condition === 'string') {
      const conditionKey = converted.condition.toLowerCase();
      if (conditionMap[conditionKey]) {
        converted.condition = conditionMap[conditionKey];
      }
    }

    return converted;
  };

  // Handle KI Evaluation trigger
  const handleTriggerKIEvaluation = useCallback(async () => {
    console.log('[KI Evaluation] Starting...', { listingDataId: listingData.id, listingData });

    // Check if property has required data for evaluation
    if (!listingData.price || !listingData.sqm || !listingData.location) {
      addBotMessage('Bitte fülle zuerst die Basis-Daten aus: Preis, Fläche und Ort.');
      return;
    }

    try {
      let propertyId = listingData.id;

      // If no property ID, inform user that data needs to be saved first
      if (!propertyId) {
        addBotMessage('Ich speichere das Inserat kurz ab, damit ich die KI-Bewertung durchführen kann...');

        const tempPropertyData = convertToEnglishEnums({
          ...listingData,
          user_id: user?.id,
          title: listingData.title || `${listingData.property_type || 'Immobilie'} ${listingData.location || ''}`.trim(),
          rooms: listingData.rooms || 0,
          condition: listingData.condition || 'maintained',
          images: uploadedImages.length > 0 ? uploadedImages : [],
          video_url: videoUrl || undefined,
        });

        console.log('[KI Evaluation] Creating property with data:', tempPropertyData);
        const createdProperty = await createPropertyMutation.mutateAsync(tempPropertyData);
        console.log('[KI Evaluation] Property created:', createdProperty);
        propertyId = createdProperty.id;

        // Update listing data with the new property ID
        setListingData((prev) => ({
          ...prev,
          id: propertyId,
        }));
      }

      console.log('[KI Evaluation] Starting seller evaluation for propertyId:', propertyId);
      addBotMessage('Starte KI-Marktwertanalyse...');

      const evaluation = await generateKIEvaluationMutation.mutateAsync({
        propertyId: propertyId!,
        viewType: 'seller',
      });
      console.log('[KI Evaluation] Seller evaluation completed:', evaluation);

      // Update listing data with seller evaluation results
      setListingData((prev) => ({
        ...prev,
        seller_evaluation: evaluation as any,
      }));

      addBotMessage('Perfekt! Die Marktwertanalyse ist abgeschlossen. Schau dir die Ergebnisse in der Vorschau an!');
    } catch (error) {
      console.error('Error generating KI evaluation:', error);
      addBotMessage(
        'Entschuldigung, da ist etwas schiefgegangen. Kannst du es bitte nochmal versuchen?'
      );
    }
  }, [listingData, user?.id, uploadedImages, convertToEnglishEnums, createPropertyMutation, generateKIEvaluationMutation, addBotMessage]);

  // Get placeholder image - always show house with pool
  const getPlaceholderImage = () => {
    return '/placeholders/placeholder_house.png';
  };

  // Submit property
  const handleSubmit = async (skipImageCheck = false) => {
    if (!isComplete && !isEditMode && !isImportMode) {
      alert('Bitte fülle alle erforderlichen Felder aus.');
      return;
    }

    // Check if images are uploaded (only for create mode, not edit or import)
    if (!skipImageCheck && !isEditMode && uploadedImages.length === 0) {
      setShowImageDialog(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare property data and convert German enums to English
      // Note: If no images, we pass empty array - frontend shows PropertyImagePlaceholder
      const propertyData = convertToEnglishEnums({
        ...listingData,
        user_id: user?.id,
        images: uploadedImages.length > 0 ? uploadedImages : [],
        video_url: videoUrl || undefined,
      });

      // Filter out null values to avoid Zod validation errors
      // Backend expects undefined for missing fields, not null
      const cleanData = Object.fromEntries(
        Object.entries(propertyData).filter(([_, value]) => value !== null)
      );

      // Debug logging
      console.log('[handleSubmit] propertyData:', propertyData);
      console.log('[handleSubmit] cleanData:', cleanData);
      console.log('[handleSubmit] property_type in cleanData:', cleanData.property_type);

      if (isEditMode && propertyId) {
        // Update existing property - spread cleanData directly (not in a 'data' wrapper)
        await updatePropertyMutation.mutateAsync({
          id: propertyId,
          ...cleanData,
        });

        // Success
        addBotMessage('Dein Inserat wurde erfolgreich aktualisiert! Ich leite dich zur Übersicht weiter...');
      } else if (isImportMode) {
        // Import mode: Save as favorite and mark as imported
        // These properties will only be visible to the user who imported them
        await createPropertyMutation.mutateAsync({
          ...cleanData,
          is_favorite: true, // Mark as favorite
          is_imported: true, // Mark as imported (only visible to importing user)
          share_with_community: false, // Don't share with community
        });

        // Success
        addBotMessage('Die Immobilie wurde erfolgreich in deine Favoriten übernommen! Ich leite dich zu deinen Favoriten weiter...');
      } else {
        // Create new property
        await createPropertyMutation.mutateAsync(cleanData);

        // Success
        addBotMessage('Dein Inserat wurde erfolgreich erstellt! Ich leite dich zur Übersicht weiter...');
      }

      setTimeout(() => {
        router.push(isImportMode ? '/favorites' : '/my-properties');
      }, 2000);
    } catch (error) {
      console.error('Error saving property:', error);
      alert(`Fehler beim ${isImportMode ? 'Importieren' : isEditMode ? 'Aktualisieren' : 'Erstellen'} des Inserats. Bitte versuche es erneut.`);
      setIsSubmitting(false);
    }
  };

  // PDF Upload Handlers
  const handlePdfFilesSelected = (files: File[]) => {
    setPdfFiles(files);
  };

  const handleRemovePdfFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzePdf = async () => {
    if (!pdfFiles || pdfFiles.length === 0) return;

    const pdfFile = pdfFiles[0]; // Use first file
    setIsAnalyzingPdf(true);

    try {
      // Convert PDF to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (data:application/pdf;base64,)
          const base64String = base64.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(pdfFile);
      const pdfBase64 = await base64Promise;

      addBotMessage('Ich analysiere dein PDF-Exposé...');

      const result = await analyzePdfMutation.mutateAsync({
        pdfBase64,
        fileName: pdfFile.name,
      });

      // Update listing data with extracted data only (no KI Bewertung)
      setListingData(prev => ({
        ...prev,
        ...(result.propertyData as any),
      }));

      // Update conversation
      addBotMessage(
        `Super! Ich habe die Daten aus deinem PDF-Exposé extrahiert. Schau dir die Vorschau an und ergänze bei Bedarf weitere Informationen.`
      );

      // Mark as complete
      setIsComplete(true);

      // Clear PDF files
      setPdfFiles([]);
    } catch (error: any) {
      console.error('Error analyzing PDF:', error);
      addBotMessage(
        `Fehler beim Analysieren des PDFs: ${error.message || 'Unbekannter Fehler'}. Bitte versuche es erneut oder gib die Daten manuell ein.`
      );
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  // Image URL Import Handler
  const handleImageUrlImport = async () => {
    if (!imageUrl.trim()) {
      setUrlImportError('Bitte gib eine URL ein');
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch (e) {
      setUrlImportError('Bitte gib eine gültige URL ein');
      return;
    }

    setIsImportingFromUrl(true);
    setUrlImportError(null);

    try {
      // Validate that URL points to an image
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.startsWith('image/')) {
        setUrlImportError('Die URL muss auf ein Bild verweisen (PNG, JPG, WebP, etc.)');
        setIsImportingFromUrl(false);
        return;
      }

      // Add the image URL to uploaded images
      const newImages = [...uploadedImages, imageUrl];
      setUploadedImages(newImages);

      addBotMessage(
        `Super! Ich habe das Bild von der URL hinzugefügt. Du kannst weitere Bilder, Videos hochladen oder mir von deiner Immobilie erzählen.`
      );

      // Clear URL input
      setImageUrl('');
    } catch (error: any) {
      console.error('Error importing image from URL:', error);
      setUrlImportError('Fehler beim Laden des Bildes. Bitte überprüfe die URL und versuche es erneut.');
    } finally {
      setIsImportingFromUrl(false);
    }
  };

  // Property URL Import Handler (scrape from ImmoScout24, Kleinanzeigen, etc.)
  const handlePropertyUrlImport = async () => {
    if (!propertyUrl.trim()) {
      setScrapeError('Bitte gib eine URL ein');
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(propertyUrl);
      // Check if it's a supported platform
      const supportedDomains = ['immobilienscout24', 'kleinanzeigen', 'ebay-kleinanzeigen'];
      const isSupported = supportedDomains.some(domain => url.hostname.includes(domain));
      if (!isSupported) {
        setScrapeError('Aktuell werden nur ImmoScout24 und Kleinanzeigen unterstützt');
        return;
      }
    } catch (e) {
      setScrapeError('Bitte gib eine gültige URL ein');
      return;
    }

    setIsScrapingUrl(true);
    setScrapeError(null);

    try {
      addBotMessage(`Ich importiere die Immobilie von der URL... Das kann einen Moment dauern.`);

      const result = await analyzeExternalUrlMutation.mutateAsync({
        url: propertyUrl,
      });

      // Update listing data with scraped data
      setListingData(prev => ({
        ...prev,
        title: result.propertyData.title,
        description: result.propertyData.description,
        price: result.propertyData.price,
        location: result.propertyData.location,
        address: result.propertyData.address,
        postal_code: result.propertyData.postalCode,
        sqm: result.propertyData.sqm,
        rooms: result.propertyData.rooms,
        bathrooms: result.propertyData.bathrooms,
        year_built: result.propertyData.yearBuilt,
        floor_level: result.propertyData.floorLevel,
        total_floors: result.propertyData.totalFloors,
        condition: result.propertyData.condition as any,
        heating_type: result.propertyData.heatingType as any,
        additional_costs: result.propertyData.monthlyFee,
        features: result.propertyData.features,
      }));

      // Set images if available
      if (result.propertyData.images && result.propertyData.images.length > 0) {
        setUploadedImages(result.propertyData.images);
      }

      // Mark as complete
      setIsComplete(true);

      addBotMessage(
        `Super! Ich habe die Immobilie erfolgreich importiert:\n\n` +
        `📍 ${result.propertyData.location}\n` +
        `💰 ${result.propertyData.price.toLocaleString('de-DE')} €\n` +
        `📐 ${result.propertyData.sqm} m² | ${result.propertyData.rooms} Zimmer\n\n` +
        `Schau dir die Vorschau an und nimm bei Bedarf noch Anpassungen vor.`
      );

      // Clear URL input
      setPropertyUrl('');

      // Save AI analysis data (will be shown in preview, not in chat)
      if (result.investmentScore !== undefined) {
        setListingData(prev => ({
          ...prev,
          ai_score: result.investmentScore,
          ai_rating_explanation: result.aiRatingExplanation,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          opportunities: result.opportunities,
          risks: result.risks,
        }));
      }

    } catch (error: any) {
      console.error('Error scraping property URL:', error);

      let errorMessage = 'Fehler beim Importieren der Immobilie.';
      if (error.message?.includes('Rate-Limit')) {
        errorMessage = error.message;
      } else if (error.message?.includes('nicht alle erforderlichen Daten')) {
        errorMessage = 'Die Seite konnte nicht vollständig ausgelesen werden. Möglicherweise ist die Struktur geändert worden oder es gibt einen Bot-Schutz.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setScrapeError(errorMessage);
      addBotMessage(`❌ ${errorMessage}\n\nDu kannst stattdessen:\n• Ein PDF-Exposé hochladen\n• Screenshots hochladen\n• Die Daten manuell eingeben`);
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Drag and drop handlers with counter for nested elements
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Helper function to check file type (with fallback to extension)
    const isPdf = (file: File) => {
      if (file.type === 'application/pdf') return true;
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf';
    };

    // Check if we have PDFs
    const pdfFiles = fileArray.filter(isPdf);
    const imageFiles = fileArray.filter(f => !isPdf(f));

    // If we have PDFs, trigger PDF analysis workflow
    if (pdfFiles.length > 0) {
      setIsAnalyzingPdf(true);
      addBotMessage(`Ich habe ${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''} erhalten. Lass mich ${pdfFiles.length > 1 ? 'diese' : 'das'} analysieren...`);

      // Trigger the analysis
      try {
        const pdfFile = pdfFiles[0];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64String = base64.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(pdfFile);
        const pdfBase64 = await base64Promise;

        const result = await analyzePdfMutation.mutateAsync({
          pdfBase64,
          fileName: pdfFile.name,
        });

        // Update listing data with extracted data only (no KI Bewertung)
        // Also explicitly clear AI rating fields since we're doing data extraction only
        setListingData(prev => ({
          ...prev,
          ...(result.propertyData as any),
          // Explicitly clear AI rating fields after PDF analysis
          ai_rating_explanation: undefined,
          strengths: undefined,
          weaknesses: undefined,
          opportunities: undefined,
          risks: undefined,
          ai_score: undefined,
        }));

        addBotMessage(
          `Super! Ich habe die Daten aus deinem PDF-Exposé extrahiert. Schau dir die Vorschau an und ergänze bei Bedarf weitere Informationen.`
        );

        setIsComplete(true);
        setPdfFiles([]);
      } catch (error: any) {
        console.error('Error analyzing PDF from drag-drop:', error);
        addBotMessage(
          `Fehler beim Analysieren des PDFs: ${error.message || 'Unbekannter Fehler'}. Bitte versuche es erneut oder gib die Daten manuell ein.`
        );
      } finally {
        setIsAnalyzingPdf(false);
      }
    } else if (imageFiles.length > 0) {
      // Just images, use the normal image processing
      processImageFiles(imageFiles as unknown as FileList);
    }
  };

  // Custom file upload handler that supports PDFs and images with automatic extraction in import mode
  const handleFileUploadWithExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('[Upload] No files selected');
      return;
    }

    console.log('[Upload] Files selected:', files.length);

    // Separate PDFs and images - create array BEFORE clearing input
    const fileArray = Array.from(files);

    // Clear the input value to allow re-uploading the same file
    e.target.value = '';
    console.log('[Upload] fileArray length:', fileArray.length);
    console.log('[Upload] files object:', files);

    // Debug: Log all file types
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      console.log(`[Upload] File ${i + 1}:`, {
        name: file.name,
        type: file.type || '(empty)',
        size: file.size,
        extension: ext || '(none)',
      });
    }

    // Helper function to check file type (with fallback to extension)
    const isPdf = (file: File) => {
      if (file.type === 'application/pdf') return true;
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf';
    };

    const isImage = (file: File) => {
      if (file.type.startsWith('image/')) return true;
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '');
    };

    const isVideo = (file: File) => {
      if (file.type.startsWith('video/')) return true;
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['mp4', 'mov', 'webm', 'mpeg'].includes(ext || '');
    };

    const pdfFiles = fileArray.filter(isPdf);
    const imageFiles = fileArray.filter(isImage);
    const videoFiles = fileArray.filter(isVideo);

    console.log('[Upload] PDFs:', pdfFiles.length, 'Images:', imageFiles.length, 'Videos:', videoFiles.length);

    // Handle PDFs (in import mode, automatically analyze)
    if (pdfFiles.length > 0) {
      const pdfFile = pdfFiles[0]; // Use first PDF
      console.log('[Upload] Processing PDF:', pdfFile.name);

      addBotMessage(`Ich habe dein PDF-Exposé "${pdfFile.name}" erhalten. Ich analysiere es jetzt...`);
      setIsAnalyzingPdf(true);

      try {
        // Convert PDF to base64
        console.log('[Upload] Converting PDF to base64...');
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix (data:application/pdf;base64,)
            const base64String = base64.split(',')[1];
            console.log('[Upload] PDF converted to base64, length:', base64String.length);
            resolve(base64String);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(pdfFile);
        const pdfBase64 = await base64Promise;

        console.log('[Upload] Calling PDF analysis API...');
        const result = await analyzePdfMutation.mutateAsync({
          pdfBase64,
          fileName: pdfFile.name,
        });

        console.log('[Upload] PDF analysis successful:', result);

        // Update listing data with extracted data only (no KI Bewertung)
        // Even if the backend returns AI fields, we explicitly clear them here
        // because KI evaluation should only happen on-demand after data extraction
        setListingData(prev => ({
          ...prev,
          ...(result.propertyData as any),
          // Explicitly clear AI rating fields - they will be generated on-demand
          ai_score: undefined,
          ai_rating_explanation: undefined,
          strengths: undefined,
          weaknesses: undefined,
          opportunities: undefined,
          risks: undefined,
        }));

        // Update conversation
        addBotMessage(
          `Super! Ich habe die Daten aus deinem PDF-Exposé extrahiert. Schau dir die Vorschau an und ergänze bei Bedarf weitere Informationen.`
        );

        // Mark as complete
        setIsComplete(true);
      } catch (error: any) {
        console.error('[Upload] Error analyzing PDF:', error);

        // Check for specific error types
        let errorMessage = 'Fehler beim Analysieren des PDFs';
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          errorMessage = 'Die OpenAI API hat das Quota überschritten. Bitte prüfe deine Billing-Einstellungen oder versuche es später erneut.';
        } else if (error.message) {
          errorMessage = `Fehler beim Analysieren des PDFs: ${error.message}`;
        }

        addBotMessage(errorMessage + ' Du kannst die Daten auch manuell eingeben.');
      } finally {
        setIsAnalyzingPdf(false);
      }
    }

    // Handle images - classify and analyze in ALL modes
    if (imageFiles.length > 0) {
      addBotMessage(`Ich analysiere deine ${imageFiles.length} Bild${imageFiles.length > 1 ? 'er' : ''} und extrahiere automatisch die Daten...`);

      try {
        // Convert images to base64 for analysis
        const imageBase64Array = await Promise.all(
          imageFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          })
        );

        console.log('[Upload] Calling classifyAndAnalyzeImages API with', imageBase64Array.length, 'images');

        // Classify and analyze images using the new API
        const result = await classifyAndAnalyzeImagesMutation.mutateAsync({
          images: imageBase64Array,
        });

        console.log('[Upload] Classification result:', {
          screenshotCount: result.screenshotCount,
          photoCount: result.photoCount,
          extractedData: result.extractedData,
        });

        // First add photo images to the slideshow (if any)
        if (result.photoImages && result.photoImages.length > 0) {
          console.log('[Upload] Adding', result.photoImages.length, 'photo images to gallery');
          setUploadedImages(prev => [...prev, ...result.photoImages]);
        }

        // If we extracted property data from screenshots, update the listing
        if (result.extractedData && result.propertyData) {
          console.log('[Upload] Updating listing data with extracted data');
          const extractedData = result.propertyData as any;

          setListingData(prev => ({
            ...prev,
            title: extractedData.title || prev.title,
            description: extractedData.description || prev.description,
            price: extractedData.price || prev.price,
            location: extractedData.location || prev.location,
            address: extractedData.address || prev.address,
            postal_code: extractedData.postalCode || prev.postal_code,
            sqm: extractedData.sqm || prev.sqm,
            rooms: extractedData.rooms || prev.rooms,
            bathrooms: extractedData.bathrooms || prev.bathrooms,
            year_built: extractedData.yearBuilt || prev.year_built,
            floor_level: extractedData.floor || prev.floor_level,
            heating_type: extractedData.heatingType || prev.heating_type,
            energy_efficiency_class: extractedData.energyClass || prev.energy_efficiency_class,
            features: extractedData.features || prev.features,
          }));

          // Mark as complete
          setIsComplete(true);

          // Build info message
          let message = `🎉 Ich habe ${result.screenshotCount} Screenshot${result.screenshotCount > 1 ? 's' : ''} erkannt und die Immobiliendaten extrahiert!`;

          if (result.photoCount > 0) {
            message += `\n\n📸 ${result.photoCount} Foto${result.photoCount > 1 ? 's' : ''} wurde${result.photoCount > 1 ? 'n' : ''} der Galerie hinzugefügt.`;
          }

          message += '\n\nSchau dir die Vorschau an und ergänze bei Bedarf weitere Informationen.';

          addBotMessage(message);
        } else if (result.photoCount > 0) {
          // No screenshots detected, just photos - add them to the gallery
          addBotMessage(
            `📸 Ich habe ${result.photoCount} Foto${result.photoCount > 1 ? 's' : ''} der Immobilie erkannt und zur Galerie hinzugefügt.\n\n` +
            `Lade weitere Bilder hoch, ein PDF-Exposé oder erzähle mir von deiner Immobilie.`
          );
        } else {
          // Unknown images - try to add them to gallery as fallback
          const dataTransfer = new DataTransfer();
          imageFiles.forEach(file => dataTransfer.items.add(file));
          await processImageFiles(dataTransfer.files);

          addBotMessage(
            `Ich konnte die Bilder nicht eindeutig klassifizieren (möglicherweise unklare Screenshots). Die Bilder wurden zur Galerie hinzugefügt.\n\n` +
            `Du kannst ein PDF-Exposé, Videos hochladen oder mir die Daten direkt mitteilen.`
          );
        }

      } catch (error) {
        console.error('[Upload] Error classifying/analyzing images:', error);

        // Fallback: Just add all images to the gallery
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        await processImageFiles(dataTransfer.files);

        addBotMessage(
          `Fehler bei der Bildanalyse. Die Bilder wurden zur Galerie hinzugefügt.\n\n` +
          `Du kannst ein PDF-Exposé, Videos hochladen oder mir die Daten direkt mitteilen.`
        );
      }
    }

    // Handle video upload (only first video, max 100MB)
    if (videoFiles.length > 0) {
      const videoFile = videoFiles[0];
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

      // Validate file size
      if (videoFile.size > MAX_VIDEO_SIZE) {
        addBotMessage('Das Video ist zu groß. Maximale Größe: 100MB');
        return;
      }

      addBotMessage(`Video "${videoFile.name}" wird hochgeladen...`);

      try {
        const formData = new FormData();
        formData.append('video', videoFile);

        const token = localStorage.getItem('auth_token');
        if (!token) throw new Error('Keine Authentifizierung gefunden');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        const response = await fetch(`${apiUrl}/upload/property-video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload fehlgeschlagen mit Status ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data?.url) {
          setVideoUrl(result.data.url);
          addBotMessage('Video erfolgreich hochgeladen! Es wird in der Vorschau angezeigt.');
        } else {
          throw new Error(result.message || 'Upload fehlgeschlagen');
        }
      } catch (error: any) {
        console.error('[Upload] Video upload error:', error);
        addBotMessage(`Video-Upload fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  // Preview data (memoized to prevent unnecessary re-renders)
  const previewData: PropertyPreviewData = useMemo(() => ({
    type: listingData.property_type || 'apartment',
    title: listingData.title || 'Deine Immobilie',
    location: listingData.location || '',
    address: listingData.address || '', // Show street address in location component
    price: listingData.price || 0,
    sqm: listingData.sqm || 0,
    rooms: listingData.rooms || 0,
    plot_size: listingData.plot_size,
    condition: listingData.condition || 'maintained',
    images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    video_url: videoUrl,
    description: listingData.description || '',
    features: listingData.features || [],
    important_notes: listingData.important_notes || undefined,
    postal_code: listingData.postal_code,
    // Additional details from AI
    year_built: listingData.year_built,
    bathrooms: listingData.bathrooms,
    floor_level: listingData.floor_level,
    total_floors: listingData.total_floors,
    available_from: listingData.available_from,
    heating_type: listingData.heating_type,
    energy_efficiency_class: listingData.energy_efficiency_class,
    // AI Rating fields
    ai_investment_score: listingData.ai_score,
    ai_rating_explanation: listingData.ai_rating_explanation,
    strengths: listingData.strengths,
    weaknesses: listingData.weaknesses,
    opportunities: listingData.opportunities,
    risks: listingData.risks,
    // Seller evaluation (from KI analysis)
    seller_evaluation: listingData.seller_evaluation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: user?.id || '',
    // Only show owner info when listing is complete
    owner: isComplete ? {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      company: profile?.company || null,
      avatar_url: profile?.avatar_url || null,
      user_type: profile?.user_type || 'private',
      phone: profile?.phone || null,
    } : undefined,
    // Note: Seller evaluation is shown separately via SellerAnalysis component
  }), [listingData, uploadedImages, videoUrl, user, profile, isComplete]);

  // Convert messages from Message format to ChatMessage format for UniversalChat
  const convertedMessages: ChatMessage[] = useMemo(() => {
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.type as 'user' | 'bot',
    }));
  }, [messages]);

  return (
    <SlideshowManagerProvider>
      <div
        className="w-full relative"
        style={{ height: 'calc(100vh - 80px)' }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Global Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm border-4 border-dashed border-white rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Images size={64} className="mx-auto mb-4 text-white" />
              <p className="text-2xl font-semibold text-white">Dateien hier ablegen</p>
              <p className="text-white/80 mt-2">Bilder, Videos oder PDF-Exposé</p>
            </div>
          </div>
        )}

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden px-2 sm:px-4 py-3">
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

        <div className="flex flex-col lg:flex-row overflow-hidden h-[calc(100%-70px)] lg:h-full">
          {/* Chat Section - 1/3 Breite */}
          <div className={`h-full min-h-0 overflow-hidden lg:w-1/3 lg:border-r lg:border-gray-200 ${mobileView !== 'chat' ? 'hidden lg:block' : ''}`}>
            <UniversalChat
              messages={convertedMessages}
              header={{
                title: isEditMode ? "Inserat bearbeiten" : "Inserat erstellen",
                icon: <Sparkles className="w-5 h-5 text-primary" />,
              }}
              input={{
                placeholder: isEditMode
                  ? "Was möchtest du ändern?"
                  : "Erzähl mir davon...",
                disabled: extractDataMutation.isLoading || isAnalyzingPdf,
                showFileUpload: true,
                acceptedFileTypes: "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm,video/mpeg",
                multipleFiles: true,
              }}
              inputValue={textInput}
              onInputChange={setTextInput}
              onSendMessage={() => handleSendMessage()}
              isTyping={extractDataMutation.isLoading || isAnalyzingPdf || classifyAndAnalyzeImagesMutation.isPending}
              isUploading={isUploadingImages}
              fileInputRef={fileInputRef}
              onFileInputChange={handleFileUploadWithExtraction}
              messagesEndRef={messagesEndRef}
              showTimestamps={false}
              showSenderNames={false}
              className="h-full bg-white"
            />
          </div>

          {/* Right Column - Preview + Bilder - 2/3 Breite */}
          <div className={`lg:w-2/3 flex flex-col lg:flex-row h-full ${mobileView === 'chat' ? 'hidden lg:flex' : ''}`}>
            {/* Preview Section - 1/2 der rechten Spalte */}
            <div className={`w-full lg:w-1/2 h-full min-h-0 overflow-hidden flex flex-col ${mobileView === 'images' ? 'hidden lg:flex' : ''}`}>
              <div className="bg-white h-full max-h-full overflow-hidden relative flex flex-col">
                {(listingData.location || listingData.price || listingData.property_type) ? (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
                      <PropertyPreview
                        data={previewData}
                        showConsentSection={false}
                        hideProviderInfo={isImportMode}
                        evaluationViewType="seller"
                        propertyId={listingData.id}
                        onTriggerEvaluation={handleTriggerKIEvaluation}
                        isGeneratingEvaluation={createPropertyMutation.isPending || generateKIEvaluationMutation.isPending}
                      />
                    </div>

                    {/* Fixed Submit Button */}
                    {(isComplete || isEditMode || isImportMode) && (
                      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 lg:p-6">
                        <button
                          onClick={() => handleSubmit()}
                          disabled={isSubmitting}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 lg:py-4 rounded-xl text-base lg:text-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={20} className="lg:w-6 lg:h-6 animate-spin" />
                              <span>{isImportMode ? 'Wird gespeichert...' : isEditMode ? 'Wird aktualisiert...' : 'Wird erstellt...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{isImportMode ? 'In den Favoriten übernehmen' : isEditMode ? 'Änderungen speichern' : 'Inserat erstellen'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <Eye size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Vorschau wird geladen...
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                      Sobald du Informationen über deine Immobilie im Chat eingibst, erscheint hier eine Live-Vorschau deines Inserats.
                    </p>
                    <div className="bg-gray-50 rounded-xl p-6 max-w-md">
                      <p className="text-sm text-gray-700 font-medium mb-3">
                        💡 Tipp: Gib einfach alle Details auf einmal ein:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2 text-left">
                        <li>• Objekttyp (Wohnung, Haus, etc.)</li>
                        <li>• Lage und Adresse</li>
                        <li>• Preis und Größe</li>
                        <li>• Zimmeranzahl und Zustand</li>
                        <li>• Besondere Ausstattung</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Slideshow Section - 1/2 der rechten Spalte */}
            <div className={`w-full lg:w-1/2 h-[60vh] lg:h-full min-h-0 overflow-hidden p-4 lg:p-6 ${mobileView === 'preview' ? 'hidden lg:block' : ''}`}>
              <div className="w-full h-full overflow-hidden flex flex-col rounded-2xl">
                <div className="flex-1 min-h-0">
                  <PropertyImageSlideshow
                    images={uploadedImages.length > 0 ? uploadedImages : [getPlaceholderImage()]}
                    videoUrl={videoUrl}
                    title={listingData.title || 'Deine Immobilie'}
                    duration={3000}
                    showCounter={uploadedImages.length > 0}
                    showProgressBars={uploadedImages.length > 0}
                    rounded="none"
                    aspectRatio="auto"
                    className="h-full"
                    propertyType={listingData.property_type || undefined}
                    onDeleteImage={uploadedImages.length > 0 ? handleDeleteImage : undefined}
                    onDeleteVideo={videoUrl ? handleDeleteVideo : undefined}
                    overlay={uploadedImages.length === 0 && !videoUrl ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="text-center text-white">
                          <Images size={48} className="mx-auto mb-3 opacity-80" />
                          <h3 className="text-xl font-semibold">Noch keine Medien</h3>
                          <p className="text-sm opacity-80 mt-1">Lade Bilder oder Videos über den Chat hoch</p>
                        </div>
                      </div>
                    ) : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Upload Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Images size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Keine Medien hochgeladen
              </h3>
              <p className="text-gray-600">
                Möchtest du noch Bilder oder Videos zu deinem Inserat hinzufügen? Medien erhöhen die Aufmerksamkeit deutlich.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  setMobileView('images');
                  fileInputRef.current?.click();
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Bilder oder Videos hochladen
              </button>
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  handleSubmit(true);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors"
              >
                Ohne Bilder fortfahren
              </button>
            </div>
          </div>
        </div>
      )}
    </SlideshowManagerProvider>
  );
}
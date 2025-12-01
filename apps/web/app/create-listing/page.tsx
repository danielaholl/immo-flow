'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../components/Header';
import { PropertyImageSlideshow } from '../components';
import { createProperty, sendChatMessage, evaluatePropertyInvestment } from '@immoflow/api';
import { PropertyImagePlaceholder } from '@immoflow/ui';
import { Building2, Home, Castle, Warehouse, Sparkles, Check, ChevronRight, ImagePlus, X, Send, MapPin } from 'lucide-react';

type MessageType = 'bot' | 'user';
type InputType = 'quick-reply' | 'text' | 'textarea' | 'number' | 'multi-select' | 'image-upload' | 'appointment-select' | 'none';

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
  unit?: string;
  placeholder?: string;
  defaultValue?: string;
  multiSelectOptions?: QuickReplyOption[];
}

interface ViewingAppointment {
  date: string;
  time: string;
}

interface ListingData {
  user_type?: string;
  property_type: string;
  title: string;
  location: string;
  price: number;
  commission_rate?: number;
  require_address_consent?: boolean;
  sqm: number;
  rooms: number;
  condition: string;
  features: string[];
  images: string[];
  description?: string;
  viewing_appointments?: ViewingAppointment[];
}

const QUESTIONS: Omit<Message, 'id'>[] = [
  {
    type: 'bot',
    content: 'Willkommen beim Inserat-Assistenten! 🏠 Ich helfe Ihnen Schritt für Schritt, Ihr perfektes Immobilieninserat zu erstellen. Lassen Sie uns beginnen!',
    inputType: 'none',
  },
  {
    type: 'bot',
    content: 'Welche Art von Immobilie möchten Sie inserieren?',
    inputType: 'quick-reply',
    options: [
      { label: 'Wohnung', value: 'apartment', icon: <Building2 size={20} /> },
      { label: 'Haus', value: 'house', icon: <Home size={20} /> },
      { label: 'Villa', value: 'villa', icon: <Castle size={20} /> },
      { label: 'Gewerbe', value: 'commercial', icon: <Warehouse size={20} /> },
    ],
  },
  {
    type: 'bot',
    content: 'Geben Sie Ihrer Immobilie einen aussagekräftigen Titel:',
    inputType: 'text',
    defaultValue: 'Charmante Altbauwohnung mit Balkon',
  },
  {
    type: 'bot',
    content: 'Wo befindet sich die Immobilie?',
    inputType: 'text',
    defaultValue: 'Berlin Prenzlauer Berg',
  },
  {
    type: 'bot',
    content: 'Was ist der Verkaufspreis?',
    inputType: 'number',
    unit: '€',
    defaultValue: '320000',
  },
  {
    type: 'bot',
    content: 'Bieten Sie diese Immobilie mit Provision an?',
    inputType: 'quick-reply',
    options: [
      { label: 'Ja, mit Provision', value: 'with_commission' },
      { label: 'Nein, ohne Provision', value: 'no_commission' },
    ],
  },
  {
    type: 'bot',
    content: 'Wie hoch ist die Provision (in %)?',
    inputType: 'number',
    unit: '%',
    defaultValue: '3.57',
  },
  {
    type: 'bot',
    content: 'Soll die Adresse erst nach Provisionsvereinbarung angezeigt werden?',
    inputType: 'quick-reply',
    options: [
      { label: 'Ja, erst nach Vereinbarung', value: 'require_consent' },
      { label: 'Nein, Adresse direkt anzeigen', value: 'show_immediately' },
    ],
  },
  {
    type: 'bot',
    content: 'Wie groß ist die Wohnfläche?',
    inputType: 'number',
    unit: 'm²',
    defaultValue: '75',
  },
  {
    type: 'bot',
    content: 'Wie viele Zimmer hat die Immobilie?',
    inputType: 'number',
    unit: 'Zimmer',
    defaultValue: '3',
  },
  {
    type: 'bot',
    content: 'In welchem Zustand befindet sich die Immobilie?',
    inputType: 'quick-reply',
    options: [
      { label: 'Neubau', value: 'new' },
      { label: 'Erstbezug', value: 'first_occupancy' },
      { label: 'Renoviert', value: 'renovated' },
      { label: 'Gepflegt', value: 'maintained' },
      { label: 'Renovierungsbedürftig', value: 'needs_renovation' },
    ],
  },
  {
    type: 'bot',
    content: 'Welche Ausstattungsmerkmale hat die Immobilie? (Mehrfachauswahl möglich)',
    inputType: 'multi-select',
    multiSelectOptions: [
      { label: 'Balkon', value: 'balkon' },
      { label: 'Terrasse', value: 'terrasse' },
      { label: 'Garten', value: 'garten' },
      { label: 'Einbauküche', value: 'einbaukueche' },
      { label: 'Fußbodenheizung', value: 'fussbodenheizung' },
      { label: 'Keller', value: 'keller' },
      { label: 'Aufzug', value: 'aufzug' },
      { label: 'Garage', value: 'garage' },
      { label: 'Stellplatz', value: 'stellplatz' },
      { label: 'Barrierefrei', value: 'barrierefrei' },
    ],
  },
  {
    type: 'bot',
    content: 'Laden Sie Bilder Ihrer Immobilie hoch (optional):',
    inputType: 'image-upload',
  },
  {
    type: 'bot',
    content: 'Ich habe eine Beschreibung für Sie erstellt. Sie können diese anpassen oder übernehmen:',
    inputType: 'textarea',
    placeholder: 'Beschreibung bearbeiten...',
  },
  {
    type: 'bot',
    content: 'Wann können Interessenten die Immobilie besichtigen? Wählen Sie bis zu 3 Termine:',
    inputType: 'appointment-select',
  },
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Wohnung',
  house: 'Haus',
  villa: 'Villa',
  commercial: 'Gewerbe',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neubau',
  first_occupancy: 'Erstbezug',
  renovated: 'Renoviert',
  maintained: 'Gepflegt',
  needs_renovation: 'Renovierungsbedürftig',
};

export default function CreateListingPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [listingData, setListingData] = useState<Partial<ListingData>>({});
  const [selectedAppointments, setSelectedAppointments] = useState<ViewingAppointment[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const conversationStartedRef = useRef(false);

  // Debug: Log listingData changes
  useEffect(() => {
    console.log('ListingData updated:', listingData);
  }, [listingData]);

  // Update preview in real-time for text inputs
  useEffect(() => {
    if (currentQuestionIndex === 2 && textInput) {
      // Title
      setListingData(prev => ({ ...prev, title: textInput }));
    } else if (currentQuestionIndex === 3 && textInput) {
      // Location
      setListingData(prev => ({ ...prev, location: textInput }));
    } else if (currentQuestionIndex === 12 && textInput) {
      // Description
      setListingData(prev => ({ ...prev, description: textInput }));
    }
  }, [textInput, currentQuestionIndex]);

  // Update preview in real-time for number inputs
  useEffect(() => {
    if (currentQuestionIndex === 4 && numberInput) {
      // Price
      setListingData(prev => ({ ...prev, price: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 6 && numberInput) {
      // Commission rate
      setListingData(prev => ({ ...prev, commission_rate: parseFloat(numberInput) }));
    } else if (currentQuestionIndex === 8 && numberInput) {
      // Sqm
      setListingData(prev => ({ ...prev, sqm: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 9 && numberInput) {
      // Rooms
      setListingData(prev => ({ ...prev, rooms: parseInt(numberInput) }));
    }
  }, [numberInput, currentQuestionIndex]);

  // Update preview in real-time for features selection
  useEffect(() => {
    if (currentQuestionIndex === 11 && selectedFeatures.length > 0) {
      // Features
      setListingData(prev => ({ ...prev, features: selectedFeatures }));
    }
  }, [selectedFeatures, currentQuestionIndex]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/create-listing');
    }
  }, [authLoading, user, router]);

  // Start conversation
  useEffect(() => {
    if (user && !conversationStartedRef.current) {
      conversationStartedRef.current = true;
      addBotMessage(0);
    }
  }, [user]);

  // Auto-scroll chat to bottom with smooth behavior (only affects chat container)
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        const scrollContainer = chatContainerRef.current.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Auto-focus input and set default value when new question appears
  useEffect(() => {
    if (isTyping || isComplete) return;

    const currentQuestion = messages[messages.length - 1];
    if (!currentQuestion) return;

    // Set default values
    if (currentQuestion.inputType === 'text' && currentQuestion.defaultValue) {
      setTextInput(currentQuestion.defaultValue);
    } else if (currentQuestion.inputType === 'number' && currentQuestion.defaultValue) {
      setNumberInput(currentQuestion.defaultValue);
    }

    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      if (currentQuestion.inputType === 'text' && textInputRef.current) {
        textInputRef.current.focus();
        textInputRef.current.select(); // Select text for easy replacement
      } else if (currentQuestion.inputType === 'number' && numberInputRef.current) {
        numberInputRef.current.focus();
        numberInputRef.current.select(); // Select text for easy replacement
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isTyping, isComplete]);

  // Reset preview index when images change
  const currentPreviewImages = listingData.images?.length ? listingData.images : uploadedImages;
  useEffect(() => {
    if (previewImageIndex >= currentPreviewImages.length && currentPreviewImages.length > 0) {
      setPreviewImageIndex(currentPreviewImages.length - 1);
    } else if (currentPreviewImages.length === 0) {
      setPreviewImageIndex(0);
    }
  }, [currentPreviewImages.length, previewImageIndex]);

  // Auto-slideshow for preview images
  useEffect(() => {
    if (currentPreviewImages.length <= 1) return;

    const interval = setInterval(() => {
      setPreviewImageIndex((prev) =>
        prev >= currentPreviewImages.length - 1 ? 0 : prev + 1
      );
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [currentPreviewImages.length]);

  const addBotMessage = async (questionIndex: number) => {
    if (questionIndex >= QUESTIONS.length) {
      setIsComplete(true);
      return;
    }

    setIsTyping(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

    setIsTyping(false);

    const question = QUESTIONS[questionIndex];
    const newMessage: Message = {
      id: `bot-${Date.now()}`,
      ...question,
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentQuestionIndex(questionIndex);

    // If it's the welcome message, automatically show next question
    if (question.inputType === 'none') {
      setTimeout(() => addBotMessage(questionIndex + 1), 1000);
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

  const handleQuickReply = (option: QuickReplyOption) => {
    addUserMessage(option.label);

    // Save to listing data based on current question
    if (currentQuestionIndex === 1) {
      const newData = { ...listingData, property_type: option.value };
      console.log('Setting property_type:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 5) {
      // Provision Ja/Nein
      if (option.value === 'with_commission') {
        const newData = { ...listingData, user_type: 'agent' };
        console.log('Setting user_type agent:', newData);
        setListingData(newData);
        // Show commission rate question
        setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
      } else {
        // No commission - skip commission rate and consent question
        const newData = { ...listingData, user_type: 'private', commission_rate: undefined, require_address_consent: false };
        console.log('Setting user_type private:', newData);
        setListingData(newData);
        setTimeout(() => addBotMessage(currentQuestionIndex + 3), 500);
      }
      return;
    } else if (currentQuestionIndex === 7) {
      // Address consent requirement
      const newData = {
        ...listingData,
        require_address_consent: option.value === 'require_consent'
      };
      console.log('Setting require_address_consent:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 10) {
      const newData = { ...listingData, condition: option.value };
      console.log('Setting condition:', newData);
      setListingData(newData);
    }

    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;

    addUserMessage(textInput);

    // Save to listing data based on current question
    if (currentQuestionIndex === 2) {
      const newData = { ...listingData, title: textInput };
      console.log('Setting title:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 3) {
      const newData = { ...listingData, location: textInput };
      console.log('Setting location:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 12) {
      // Description (index 12, before appointments)
      const newData = { ...listingData, description: textInput };
      console.log('Setting description:', newData);
      setListingData(newData);
    }

    setTextInput('');
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleNumberSubmit = () => {
    if (!numberInput) return;

    const question = QUESTIONS[currentQuestionIndex];
    addUserMessage(`${numberInput} ${question.unit}`);

    // Save to listing data based on current question
    if (currentQuestionIndex === 4) {
      const newData = { ...listingData, price: parseInt(numberInput) };
      console.log('Setting price:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 6) {
      const newData = { ...listingData, commission_rate: parseFloat(numberInput) };
      console.log('Setting commission_rate:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 8) {
      const newData = { ...listingData, sqm: parseInt(numberInput) };
      console.log('Setting sqm:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 9) {
      const newData = { ...listingData, rooms: parseInt(numberInput) };
      console.log('Setting rooms:', newData);
      setListingData(newData);
    }

    setNumberInput('');

    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleFeatureToggle = (value: string) => {
    setSelectedFeatures(prev =>
      prev.includes(value)
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  const handleFeaturesSubmit = () => {
    const featureLabels = selectedFeatures.map(value => {
      const option = QUESTIONS[currentQuestionIndex].multiSelectOptions?.find(o => o.value === value);
      return option?.label || value;
    });

    addUserMessage(featureLabels.length > 0 ? featureLabels.join(', ') : 'Keine Auswahl');
    setListingData(prev => ({ ...prev, features: featureLabels }));
    setSelectedFeatures([]);
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('Uploading', files.length, 'images');

    // Convert files to data URLs for preview
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    // Update listingData as well
    setListingData(prev => ({ ...prev, images: newImages }));
  };

  // Drag & Drop handlers for image reordering
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    console.log('handleDrop called:', { draggedImageIndex, dropIndex });

    if (draggedImageIndex === null) {
      console.log('No dragged image');
      return;
    }

    if (draggedImageIndex === dropIndex) {
      console.log('Same position, skipping');
      setDraggedImageIndex(null);
      return;
    }

    const newImages = [...uploadedImages];
    const draggedImage = newImages[draggedImageIndex];

    console.log('Before reorder:', newImages);

    // Remove from old position
    newImages.splice(draggedImageIndex, 1);
    // Insert at new position
    newImages.splice(dropIndex, 0, draggedImage);

    console.log('After reorder:', newImages);

    setUploadedImages(newImages);
    // Update listingData to persist the order
    setListingData(prev => ({ ...prev, images: newImages }));
    setDraggedImageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const handleImagesSubmit = async () => {
    addUserMessage(uploadedImages.length > 0 ? `${uploadedImages.length} Bild(er) hochgeladen` : 'Keine Bilder');
    setListingData(prev => ({ ...prev, images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'] }));

    // Auto-generate description with AI after images
    setIsGeneratingDescription(true);
    setTimeout(async () => {
      addBotMessage(currentQuestionIndex + 1);
      try {
        const generatedDesc = await generateDescriptionWithAI();
        setTextInput(generatedDesc);
      } catch (error) {
        console.error('Error generating description:', error);
        setTextInput('');
      } finally {
        setIsGeneratingDescription(false);
      }
    }, 500);
  };

  // Generate available appointment dates (next 2 weeks)
  const generateAppointmentOptions = (): ViewingAppointment[] => {
    const options: ViewingAppointment[] = [];
    const today = new Date();
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const times = ['10:00', '14:00', '16:00'];

    for (let i = 1; i <= 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0) { // Skip Sundays
        const time = times[i % times.length];
        options.push({
          date: `${weekdays[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`,
          time: `${time} Uhr`,
        });
      }
    }
    return options.slice(0, 6); // Max 6 options
  };

  const appointmentOptions = generateAppointmentOptions();

  const handleAppointmentToggle = (appointment: ViewingAppointment) => {
    setSelectedAppointments(prev => {
      const exists = prev.some(a => a.date === appointment.date && a.time === appointment.time);
      if (exists) {
        return prev.filter(a => !(a.date === appointment.date && a.time === appointment.time));
      } else if (prev.length < 3) {
        return [...prev, appointment];
      }
      return prev;
    });
  };

  const handleAppointmentsSubmit = () => {
    const appointmentText = selectedAppointments.length > 0
      ? selectedAppointments.map(a => `${a.date} ${a.time}`).join(', ')
      : 'Keine Termine';
    addUserMessage(appointmentText);
    setListingData(prev => ({ ...prev, viewing_appointments: selectedAppointments }));
    setSelectedAppointments([]);
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  // Auto-generate description using AI API
  const generateDescriptionWithAI = async (): Promise<string> => {
    const type = PROPERTY_TYPE_LABELS[listingData.property_type || ''] || 'Immobilie';
    const location = listingData.location || 'attraktiver Lage';
    const sqm = listingData.sqm ? `${listingData.sqm}m²` : '';
    const rooms = listingData.rooms ? `${listingData.rooms} Zimmer` : '';
    const condition = CONDITION_LABELS[listingData.condition || ''] || '';
    const features = listingData.features?.join(', ') || '';
    const price = listingData.price ? formatPrice(listingData.price) : '';

    // Fallback description
    const fallbackDesc = () => {
      const parts = [];
      if (type && type !== 'Immobilie') parts.push(type);
      if (location) parts.push(`in ${location}`);
      if (sqm) parts.push(`mit ${sqm}`);
      if (rooms) parts.push(`und ${rooms}`);
      if (condition) parts.push(`${condition}`);

      let desc = parts.join(' ') + '.';
      if (features) desc += ` Ausstattung: ${features}.`;

      return desc.length > 150 ? desc.substring(0, 147) + '...' : desc;
    };

    const prompt = `Erstelle eine kurze, ansprechende Immobilien-Beschreibung (max 150 Zeichen) für: ${type} in ${location}, ${sqm}, ${rooms}, ${condition}. Features: ${features}. Preis: ${price}. Nur die Beschreibung, ohne Anführungszeichen.`;

    try {
      console.log('Generating AI description...');

      // Timeout nach 10 Sekunden
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const apiPromise = sendChatMessage({ message: prompt });

      const response = await Promise.race([apiPromise, timeoutPromise]);

      console.log('AI response:', response);

      // Ensure max 150 characters
      let desc = response.message.trim();
      // Remove quotes if present
      desc = desc.replace(/^["']|["']$/g, '');

      if (desc.length > 150) {
        desc = desc.substring(0, 147) + '...';
      }

      return desc || fallbackDesc();
    } catch (error) {
      console.error('Error generating description:', error);
      return fallbackDesc();
    }
  };

  const handlePublish = async () => {
    console.log('[handlePublish] Starting...', { hasUser: !!user });
    if (!user) {
      console.log('[handlePublish] No user, returning');
      return;
    }

    setIsSubmitting(true);
    try {
      const propertyData = {
        title: listingData.title || 'Neue Immobilie',
        location: listingData.location || '',
        price: listingData.price || 0,
        sqm: listingData.sqm || 0,
        rooms: listingData.rooms || 0,
        images: listingData.images || [],
        features: listingData.features || [],
        description: listingData.description || '',
        highlights: [],
        red_flags: [],
        user_id: user.id,
        commission_rate: listingData.commission_rate,
        require_address_consent: listingData.require_address_consent || false,
      };

      console.log('[handlePublish] Property data prepared:', propertyData);
      console.log('[handlePublish] Calling createProperty...');

      const createdProperty = await createProperty(propertyData);

      console.log('[handlePublish] Property created:', createdProperty.id);

      // Trigger AI investment evaluation in background (non-blocking)
      evaluatePropertyInvestment(createdProperty.id).catch((err) => {
        console.error('Error evaluating property investment:', err);
        // Don't block user flow if evaluation fails
      });

      console.log('[handlePublish] Navigating to property page...');
      // Use window.location.href for reliable navigation after async operation
      window.location.href = `/property/${createdProperty.id}`;
      console.log('[handlePublish] Navigation called');
    } catch (error) {
      console.error('[handlePublish] Error creating property:', error);
      alert('Fehler beim Erstellen des Inserats. Bitte versuchen Sie es erneut.');
    } finally {
      console.log('[handlePublish] Finally block, setting isSubmitting to false');
      setIsSubmitting(false);
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

  const progress = Math.round(((currentQuestionIndex) / (QUESTIONS.length - 1)) * 100);

  const currentQuestion = messages[messages.length - 1];

  // Calculate price per sqm
  const previewPricePerSqm = listingData.price && listingData.sqm && listingData.sqm > 0
    ? Math.round(listingData.price / listingData.sqm)
    : 0;

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <p className="text-gray-500">Laden...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      {/* Progress Bar - Full Width */}
      <div className="w-full bg-white border-b border-gray-200 px-6 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Fortschritt</span>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="h-[calc(100vh-128px)] flex flex-col px-4 py-4">

        {/* Three Column Layout - Images | Details | Chat */}
        <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Left Column - Image Slideshow (Sticky) */}
          <div className="lg:w-1/3 lg:sticky lg:top-20 lg:h-[calc(100vh-160px)] p-4 lg:p-6">
            <PropertyImageSlideshow
              images={currentPreviewImages}
              title={listingData.title || 'Immobilie'}
              duration={4000}
              showCounter={true}
              showProgressBars={true}
              className="h-full shadow-xl"
              slideshowId="create-listing-preview"
            />
          </div>

          {/* Middle Column - Property Details (Scrollable) */}
          <div className="lg:w-1/3 lg:overflow-y-auto p-4 lg:p-8 lg:h-[calc(100vh-160px)]">
            {/* Price */}
            <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '33px' }}>
              {listingData.price && listingData.price > 0 ? formatPrice(listingData.price) : 'Preis nicht angegeben'}
            </h1>

            {/* Commission */}
            {listingData.commission_rate && listingData.commission_rate > 0 && (
              <p className="text-base text-gray-600 mb-4">
                zzgl. {listingData.commission_rate}% Provision
              </p>
            )}

            {/* Location */}
            {listingData.location && (
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin size={18} />
                <span style={{ fontSize: '18px' }}>{listingData.location}</span>
              </div>
            )}

            {/* Title */}
            {listingData.title && (
              <h2 className="font-semibold text-gray-900 mb-6" style={{ fontSize: '22px' }}>
                {listingData.title}
              </h2>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Zimmer</p>
                <p className="text-lg font-semibold text-gray-900">
                  {listingData.rooms && listingData.rooms > 0 ? listingData.rooms : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fläche</p>
                <p className="text-lg font-semibold text-gray-900">
                  {listingData.sqm && listingData.sqm > 0 ? `${listingData.sqm} m²` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Preis/m²</p>
                <p className="text-lg font-semibold text-gray-900">
                  {previewPricePerSqm > 0 ? formatPrice(previewPricePerSqm) : '-'}
                </p>
              </div>
            </div>

            {/* Description */}
            {listingData.description && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Beschreibung</h3>
                <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                  {listingData.description}
                </p>
              </div>
            )}

            {/* Features */}
            {listingData.features && listingData.features.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausstattung</h3>
                <div className="flex flex-wrap gap-2">
                  {listingData.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-full text-base font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!listingData.title && !listingData.location && !listingData.description && !listingData.price && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  Die Vorschau wird aktualisiert, sobald Sie Informationen eingeben
                </p>
              </div>
            )}

            {/* Publish Button */}
            {isComplete && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Wird veröffentlicht...' : 'Inserat veröffentlichen'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Chat Assistant (Scrollable) */}
          <div className="lg:w-1/3 lg:overflow-y-auto p-4 lg:p-8 flex flex-col lg:h-[calc(100vh-160px)]">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">KI-Assistent</h3>

              <div
                ref={chatContainerRef}
                className="bg-white rounded-2xl shadow-lg flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'bot' && (
                      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {message.type === 'bot' ? (
                      <p className="text-[18px] leading-relaxed text-gray-800 pt-2 max-w-[85%]">{message.content}</p>
                    ) : (
                      <div className="bg-gray-100 text-gray-900 rounded-2xl px-5 py-3 max-w-[75%]">
                        <p className="text-[18px] leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-5 py-4">
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
                      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[18px] leading-relaxed text-green-700 pt-2 max-w-[85%]">
                        Perfekt! 🎉 Ihr Inserat ist fertig. Überprüfen Sie die Vorschau oben und klicken Sie auf &quot;Veröffentlichen&quot;.
                      </p>
                    </div>
                  )}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white">
              {!isComplete && !isTyping && currentQuestion && (
                <>
                  {/* Quick Reply Buttons */}
                  {currentQuestion.inputType === 'quick-reply' && currentQuestion.options && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleQuickReply(option)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-center"
                        >
                          {option.icon}
                          <span className="font-medium text-gray-800">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text Input */}
                  {currentQuestion.inputType === 'text' && (
                    <div className="flex gap-2">
                      <input
                        ref={textInputRef}
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        placeholder={currentQuestion.placeholder}
                        className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        className="px-4 py-3 bg-primary text-white rounded-xl disabled:opacity-50 hover:bg-primary-dark transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  )}

                  {/* Number Input */}
                  {currentQuestion.inputType === 'number' && (
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center bg-white border-2 border-gray-200 rounded-xl focus-within:border-primary transition-colors">
                        <input
                          ref={numberInputRef}
                          type="number"
                          value={numberInput}
                          onChange={(e) => setNumberInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleNumberSubmit()}
                          placeholder={currentQuestion.placeholder}
                          className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
                        />
                        <span className="pr-4 text-gray-500 font-medium">{currentQuestion.unit}</span>
                      </div>
                      <button
                        onClick={handleNumberSubmit}
                        disabled={!numberInput}
                        className="px-4 py-3 bg-primary text-white rounded-xl disabled:opacity-50 hover:bg-primary-dark transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  )}

                  {/* Multi-Select */}
                  {currentQuestion.inputType === 'multi-select' && currentQuestion.multiSelectOptions && (
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto">
                        {currentQuestion.multiSelectOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleFeatureToggle(option.value)}
                            className={`px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                              selectedFeatures.includes(option.value)
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-primary/30'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {selectedFeatures.includes(option.value) && <Check size={14} />}
                              {option.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleFeaturesSubmit}
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                      >
                        Weiter
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Image Upload */}
                  {currentQuestion.inputType === 'image-upload' && (
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {/* Uploaded Images Preview */}
                      {uploadedImages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Ziehen Sie Bilder, um die Reihenfolge zu ändern</p>
                          <div className="flex gap-3 overflow-x-auto pb-2 pt-2 px-1">
                            {uploadedImages.map((img, idx) => (
                              <div
                                key={`${img}-${idx}`}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'move';
                                  handleDragStart(idx);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDrop(idx);
                                }}
                                onDragEnd={handleDragEnd}
                                className={`relative flex-shrink-0 cursor-move transition-all ${
                                  draggedImageIndex === idx ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                                }`}
                              >
                                <div className="relative group">
                                  <img
                                    src={img}
                                    alt={`Upload ${idx + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-primary transition-colors pointer-events-none"
                                  />
                                  {/* Image Number Badge */}
                                  <div className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-medium pointer-events-none">
                                    {idx + 1}
                                  </div>
                                  {/* Remove Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImage(idx);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                        >
                          <ImagePlus size={20} />
                          Bilder auswählen
                        </button>
                        <button
                          onClick={handleImagesSubmit}
                          className="py-3 px-6 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
                        >
                          Weiter
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {/* Allowed formats info */}
                      <p className="text-xs text-gray-400 text-center">
                        Erlaubte Formate: JPG, PNG, WebP, GIF • Max. 10 MB pro Bild
                      </p>
                    </div>
                  )}

                  {/* Appointment Selection */}
                  {currentQuestion.inputType === 'appointment-select' && (
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {appointmentOptions.map((appointment, idx) => {
                          const isSelected = selectedAppointments.some(
                            a => a.date === appointment.date && a.time === appointment.time
                          );
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAppointmentToggle(appointment)}
                              className={`p-3 rounded-xl border-2 text-left transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 bg-white hover:border-primary/30'
                              }`}
                            >
                              <div className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                                {appointment.date}
                              </div>
                              <div className={`text-sm ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                                {appointment.time}
                              </div>
                              {isSelected && (
                                <Check size={16} className="absolute top-2 right-2 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mb-3 text-center">
                        {selectedAppointments.length}/3 Termine ausgewählt
                      </p>
                      <button
                        onClick={handleAppointmentsSubmit}
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                      >
                        Weiter
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Textarea Input (Description) */}
                  {currentQuestion.inputType === 'textarea' && (
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                      {isGeneratingDescription ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            <span className="text-gray-600">KI erstellt Beschreibung...</span>
                          </div>
                          <button
                            onClick={() => setIsGeneratingDescription(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={currentQuestion.placeholder || 'Beschreibung eingeben...'}
                            rows={4}
                            maxLength={150}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors resize-none text-gray-800"
                          />
                          <div className="flex items-center justify-between mt-2 mb-3">
                            <span className="text-xs text-gray-500">
                              {textInput.length}/150 Zeichen
                            </span>
                            <button
                              onClick={async () => {
                                setIsGeneratingDescription(true);
                                try {
                                  const newDesc = await generateDescriptionWithAI();
                                  setTextInput(newDesc);
                                } finally {
                                  setIsGeneratingDescription(false);
                                }
                              }}
                              className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                            >
                              <Sparkles size={12} />
                              Neu generieren
                            </button>
                          </div>
                          <button
                            onClick={handleTextSubmit}
                            disabled={!textInput.trim()}
                            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            Weiter
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

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
  postal_code?: string;
  street_address?: string;
  price: number;
  commission_rate?: number;
  require_address_consent?: boolean;
  sqm: number;
  usable_area?: number;
  usable_area_ratio?: string;
  rooms: number;
  bathrooms?: number;
  condition: string;
  features: string[];
  images: string[];
  description?: string;
  viewing_appointments?: ViewingAppointment[];
  total_floors?: number;
  floor_level?: string;
  available_from?: string;
  monthly_fee?: number;
  year_built?: number;
  heating_type?: string;
  energy_source?: string;
  energy_certificate?: string;
}

const QUESTIONS: Omit<Message, 'id'>[] = [
  // 1. Willkommen (ohne Icon)
  {
    type: 'bot',
    content: 'Hey! Lass uns gemeinsam dein Inserat erstellen.',
    inputType: 'none',
  },
  // 2. Bilder hochladen
  {
    type: 'bot',
    content: 'Laden Sie Bilder Ihrer Immobilie hoch (optional):',
    inputType: 'image-upload',
  },
  // 3. Immobilientyp
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
  // 4. Standort PLZ
  {
    type: 'bot',
    content: 'Wo befindet sich die Immobilie? (Postleitzahl)',
    inputType: 'text',
    defaultValue: '10405',
  },
  // 5. Straße mit Nummer
  {
    type: 'bot',
    content: 'Wie lautet die Straße und Hausnummer?',
    inputType: 'text',
    defaultValue: 'Prenzlauer Allee 123',
  },
  // 6. Wie viele Stockwerke hat das Haus?
  {
    type: 'bot',
    content: 'Wie viele Stockwerke hat das Gebäude insgesamt?',
    inputType: 'number',
    unit: 'Stockwerke',
    defaultValue: '5',
  },
  // 7. Welches Stockwerk?
  {
    type: 'bot',
    content: 'In welchem Stockwerk befindet sich die Immobilie?',
    inputType: 'quick-reply',
    options: [
      { label: 'Erdgeschoss', value: 'EG' },
      { label: 'Dachgeschoss', value: 'DG' },
      { label: '1. OG', value: '1' },
      { label: '2. OG', value: '2' },
      { label: '3. OG', value: '3' },
      { label: '4. OG+', value: '4' },
    ],
  },
  // 8. Fläche (sqm)
  {
    type: 'bot',
    content: 'Wie groß ist die Wohnfläche?',
    inputType: 'number',
    unit: 'm²',
    defaultValue: '75',
  },
  // 9. Nutzfläche mit Anteil
  {
    type: 'bot',
    content: 'Gibt es Nutzfläche (z.B. Keller, Dachboden)? Wenn ja, mit welchem Anteil wird sie gerechnet?',
    inputType: 'quick-reply',
    options: [
      { label: 'Voll (1/1)', value: '1/1' },
      { label: 'Halb (1/2)', value: '1/2' },
      { label: 'Viertel (1/4)', value: '1/4' },
      { label: 'Nicht vorhanden', value: 'none' },
    ],
  },
  // 10. Anzahl Zimmer
  {
    type: 'bot',
    content: 'Wie viele Zimmer hat die Immobilie?',
    inputType: 'number',
    unit: 'Zimmer',
    defaultValue: '3',
  },
  // 11. Anzahl Badezimmer
  {
    type: 'bot',
    content: 'Wie viele Badezimmer gibt es?',
    inputType: 'number',
    unit: 'Badezimmer',
    defaultValue: '1',
  },
  // 12. Objekt Zustand
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
  // 13. Ausstattung (Features)
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
  // 14. Bezugfrei ab
  {
    type: 'bot',
    content: 'Wann ist die Immobilie bezugsfrei?',
    inputType: 'quick-reply',
    options: [
      { label: 'Sofort', value: 'sofort' },
      { label: 'Nach Vereinbarung', value: 'nach_vereinbarung' },
    ],
  },
  // 15. Stichpunkte
  {
    type: 'bot',
    content: 'Gib mir ein paar Stichpunkte zu deiner Immobilie (z.B. Besonderheiten, Lage, Ausstattung):',
    inputType: 'text',
    defaultValue: 'ruhige Lage, renoviert 2020, Südbalkon',
  },
  // 16. Beschreibung (AI-generiert)
  {
    type: 'bot',
    content: 'Perfekt! Ich erstelle jetzt eine Beschreibung basierend auf deinen Angaben:',
    inputType: 'textarea',
    placeholder: 'Beschreibung wird generiert...',
  },
  // 17. Titel (MOVED hier)
  {
    type: 'bot',
    content: 'Geben Sie Ihrer Immobilie einen aussagekräftigen Titel:',
    inputType: 'text',
    defaultValue: 'Charmante Altbauwohnung mit Balkon',
  },
  // 18. Kaufpreis (inkl. Garage/Stellplatz)
  {
    type: 'bot',
    content: 'Was ist der Kaufpreis (inkl. Garage/Stellplatz)?',
    inputType: 'number',
    unit: '€',
    defaultValue: '320000',
  },
  // 19. Höhe Hausgeld
  {
    type: 'bot',
    content: 'Wie hoch ist das monatliche Hausgeld?',
    inputType: 'number',
    unit: '€/Monat',
    defaultValue: '250',
  },
  // 20. Baujahr
  {
    type: 'bot',
    content: 'In welchem Jahr wurde das Gebäude gebaut?',
    inputType: 'number',
    unit: '',
    defaultValue: '1920',
  },
  // 21. Heizungsart
  {
    type: 'bot',
    content: 'Welche Heizungsart hat die Immobilie?',
    inputType: 'quick-reply',
    options: [
      { label: 'Zentralheizung', value: 'central' },
      { label: 'Fußbodenheizung', value: 'floor' },
      { label: 'Gasheizung', value: 'gas' },
      { label: 'Wärmepumpe', value: 'heat_pump' },
      { label: 'Fernwärme', value: 'district' },
      { label: 'Sonstige', value: 'other' },
    ],
  },
  // 22. Energieträger
  {
    type: 'bot',
    content: 'Welcher Energieträger wird verwendet?',
    inputType: 'quick-reply',
    options: [
      { label: 'Gas', value: 'gas' },
      { label: 'Öl', value: 'oil' },
      { label: 'Strom', value: 'electricity' },
      { label: 'Fernwärme', value: 'district_heating' },
      { label: 'Solar', value: 'solar' },
      { label: 'Sonstige', value: 'other' },
    ],
  },
  // 23. Energieausweis
  {
    type: 'bot',
    content: 'Welcher Energieausweis liegt vor?',
    inputType: 'quick-reply',
    options: [
      { label: 'Bedarfsausweis', value: 'demand' },
      { label: 'Verbrauchsausweis', value: 'consumption' },
      { label: 'Nicht vorhanden', value: 'none' },
    ],
  },
  // 24. Provision
  {
    type: 'bot',
    content: 'Bieten Sie diese Immobilie mit Provision an?',
    inputType: 'quick-reply',
    options: [
      { label: 'Ja, mit Provision', value: 'with_commission' },
      { label: 'Nein, ohne Provision', value: 'no_commission' },
    ],
  },
  // 25. Provisions-Satz
  {
    type: 'bot',
    content: 'Wie hoch ist die Provision (in %)?',
    inputType: 'number',
    unit: '%',
    defaultValue: '3.57',
  },
  // 26. Adress- und Provisions-Vereinbarung
  {
    type: 'bot',
    content: 'Soll die Adresse erst nach Provisionsvereinbarung angezeigt werden?',
    inputType: 'quick-reply',
    options: [
      { label: 'Ja, erst nach Vereinbarung', value: 'require_consent' },
      { label: 'Nein, Adresse direkt anzeigen', value: 'show_immediately' },
    ],
  },
  // 27. Besichtigungstermine
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
  const [keyPoints, setKeyPoints] = useState('');
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
    if (currentQuestionIndex === 5 && textInput) {
      // Street address
      setListingData(prev => ({ ...prev, street_address: textInput }));
    } else if (currentQuestionIndex === 15 && textInput) {
      // Key points (Stichpunkte)
      setKeyPoints(textInput);
    } else if (currentQuestionIndex === 16 && textInput) {
      // Description
      setListingData(prev => ({ ...prev, description: textInput }));
    } else if (currentQuestionIndex === 17 && textInput) {
      // Title
      setListingData(prev => ({ ...prev, title: textInput }));
    }
  }, [textInput, currentQuestionIndex]);

  // Update preview in real-time for number inputs
  useEffect(() => {
    if (currentQuestionIndex === 6 && numberInput) {
      // Total floors
      setListingData(prev => ({ ...prev, total_floors: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 8 && numberInput) {
      // Sqm (Wohnfläche)
      setListingData(prev => ({ ...prev, sqm: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 10 && numberInput) {
      // Rooms
      setListingData(prev => ({ ...prev, rooms: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 11 && numberInput) {
      // Bathrooms
      setListingData(prev => ({ ...prev, bathrooms: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 18 && numberInput) {
      // Price
      setListingData(prev => ({ ...prev, price: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 19 && numberInput) {
      // Monthly fee (Hausgeld)
      setListingData(prev => ({ ...prev, monthly_fee: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 20 && numberInput) {
      // Year built
      setListingData(prev => ({ ...prev, year_built: parseInt(numberInput) }));
    } else if (currentQuestionIndex === 25 && numberInput) {
      // Commission rate
      setListingData(prev => ({ ...prev, commission_rate: parseFloat(numberInput) }));
    }
  }, [numberInput, currentQuestionIndex]);

  // Update preview in real-time for features selection
  useEffect(() => {
    if (currentQuestionIndex === 13 && selectedFeatures.length > 0) {
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

    const question = QUESTIONS[questionIndex];
    const newMessage: Message = {
      id: `bot-${Date.now()}`,
      ...question,
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentQuestionIndex(questionIndex);

    // Set default value for text/number inputs if available
    if (question.inputType === 'text' && question.defaultValue) {
      setTextInput(question.defaultValue);
    } else if (question.inputType === 'number' && question.defaultValue) {
      setNumberInput(question.defaultValue);
    }

    // If it's the welcome message, automatically show next question
    if (question.inputType === 'none') {
      setTimeout(() => addBotMessage(questionIndex + 1), 500);
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
    if (currentQuestionIndex === 2) {
      // Property type
      const newData = { ...listingData, property_type: option.value };
      console.log('Setting property_type:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 7) {
      // Floor level (EG, DG, 1. OG, etc.)
      const newData = { ...listingData, floor_level: option.value };
      console.log('Setting floor_level:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 9) {
      // Usable area ratio
      if (option.value === 'none') {
        const newData = { ...listingData, usable_area: 0, usable_area_ratio: 'none' };
        console.log('Setting usable_area to none:', newData);
        setListingData(newData);
      } else {
        const newData = { ...listingData, usable_area_ratio: option.value };
        console.log('Setting usable_area_ratio:', newData);
        setListingData(newData);
      }
    } else if (currentQuestionIndex === 12) {
      // Condition
      const newData = { ...listingData, condition: option.value };
      console.log('Setting condition:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 14) {
      // Available from (Bezugsfrei ab)
      const newData = { ...listingData, available_from: option.value };
      console.log('Setting available_from:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 21) {
      // Heating type
      const newData = { ...listingData, heating_type: option.value };
      console.log('Setting heating_type:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 22) {
      // Energy source
      const newData = { ...listingData, energy_source: option.value };
      console.log('Setting energy_source:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 23) {
      // Energy certificate
      const newData = { ...listingData, energy_certificate: option.value };
      console.log('Setting energy_certificate:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 24) {
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
    } else if (currentQuestionIndex === 26) {
      // Address consent requirement
      const newData = {
        ...listingData,
        require_address_consent: option.value === 'require_consent'
      };
      console.log('Setting require_address_consent:', newData);
      setListingData(newData);
    }

    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    addUserMessage(textInput);

    // Save to listing data based on current question
    if (currentQuestionIndex === 3) {
      // Postal Code - Get city and district from AI (Index 3)
      const postalCode = textInput.trim();

      // Show loading message
      const loadingMessage: Message = {
        id: `bot-loading-${Date.now()}`,
        type: 'bot',
        content: 'Ermittle Stadtteil und Ort...',
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Get location details from AI
      const fullLocation = await getLocationFromPostalCode(postalCode);

      // Remove loading message and add result
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingMessage.id);
        return [...filtered, {
          id: `bot-location-${Date.now()}`,
          type: 'bot',
          content: `📍 ${fullLocation}`,
        }];
      });

      const newData = { ...listingData, postal_code: postalCode, location: fullLocation };
      console.log('Setting postal_code and location:', newData);
      setListingData(newData);
      setTextInput('');
      setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
      return; // Early return to prevent default flow
    } else if (currentQuestionIndex === 4) {
      // Street address (Index 4)
      const newData = { ...listingData, street_address: textInput };
      console.log('Setting street_address:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 15) {
      // Key points (Stichpunkte)
      console.log('Setting key points:', textInput);
      const userKeyPoints = textInput;
      setKeyPoints(userKeyPoints);
      setTextInput('');

      // Move to description question and auto-generate description
      setTimeout(async () => {
        addBotMessage(currentQuestionIndex + 1);
        // Generate description after a short delay
        setTimeout(async () => {
          setIsGeneratingDescription(true);
          try {
            const generatedDesc = await generateDescriptionWithAI(userKeyPoints);
            setTextInput(generatedDesc);
            setListingData(prev => ({ ...prev, description: generatedDesc }));
          } finally {
            setIsGeneratingDescription(false);
          }
        }, 500);
      }, 500);
      return; // Early return to prevent default flow
    } else if (currentQuestionIndex === 16) {
      // Description
      const newData = { ...listingData, description: textInput };
      console.log('Setting description:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 17) {
      // Title
      const newData = { ...listingData, title: textInput };
      console.log('Setting title:', newData);
      setListingData(newData);
    }

    setTextInput('');
    setTimeout(() => addBotMessage(currentQuestionIndex + 1), 500);
  };

  const handleNumberSubmit = async () => {
    if (!numberInput) return;

    const question = QUESTIONS[currentQuestionIndex];
    addUserMessage(`${numberInput} ${question.unit}`);

    // Save to listing data based on current question
    if (currentQuestionIndex === 6) {
      // Total floors
      const newData = { ...listingData, total_floors: parseInt(numberInput) };
      console.log('Setting total_floors:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 8) {
      // Sqm (Wohnfläche)
      const newData = { ...listingData, sqm: parseInt(numberInput) };
      console.log('Setting sqm:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 10) {
      // Rooms
      const newData = { ...listingData, rooms: parseInt(numberInput) };
      console.log('Setting rooms:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 11) {
      // Bathrooms
      const newData = { ...listingData, bathrooms: parseInt(numberInput) };
      console.log('Setting bathrooms:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 18) {
      // Price (Kaufpreis)
      const price = parseInt(numberInput);
      const newData = { ...listingData, price };
      console.log('Setting price:', newData);
      setListingData(newData);

      // Calculate and show price per sqm in chat
      if (listingData.sqm && listingData.sqm > 0) {
        const pricePerSqm = Math.round(price / listingData.sqm);
        const pricePerSqmMessage: Message = {
          id: `bot-price-per-sqm-${Date.now()}`,
          type: 'bot',
          content: `Das entspricht ${formatPrice(pricePerSqm)}/m²`,
        };
        setTimeout(() => {
          setMessages(prev => [...prev, pricePerSqmMessage]);
        }, 500);
      }
    } else if (currentQuestionIndex === 19) {
      // Monthly fee (Hausgeld)
      const newData = { ...listingData, monthly_fee: parseInt(numberInput) };
      console.log('Setting monthly_fee:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 20) {
      // Year built
      const newData = { ...listingData, year_built: parseInt(numberInput) };
      console.log('Setting year_built:', newData);
      setListingData(newData);
    } else if (currentQuestionIndex === 25) {
      // Commission rate
      const newData = { ...listingData, commission_rate: parseFloat(numberInput) };
      console.log('Setting commission_rate:', newData);
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

  // Helper function to process image files
  const processImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log('Uploading', files.length, 'images');

    // Convert files to data URLs for preview
    Array.from(files).forEach(file => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        console.warn('Skipping non-image file:', file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFiles(e.target.files);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  // Drag and drop handlers for file upload
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOverUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    processImageFiles(files);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    // Update listingData as well
    setListingData(prev => ({ ...prev, images: newImages }));
  };

  // Drag & Drop handlers for image reordering
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Best practice reorder function (inspired by react-beautiful-dnd)
  const reorderImages = (list: string[], startIndex: number, endIndex: number): string[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragStart = (index: number) => {
    console.log('handleDragStart:', index);
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

    console.log('Before reorder:', uploadedImages);
    console.log('Moving from index', draggedImageIndex, 'to index', dropIndex);

    // Use best practice reorder function (react-beautiful-dnd approach)
    const newImages = reorderImages(uploadedImages, draggedImageIndex, dropIndex);

    console.log('After reorder:', newImages);

    setUploadedImages(newImages);
    setListingData(prev => ({ ...prev, images: newImages }));
    setDraggedImageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const handleImagesSubmit = async () => {
    addUserMessage(uploadedImages.length > 0 ? `${uploadedImages.length} Bild(er) hochgeladen` : 'Keine Bilder');
    setListingData(prev => ({ ...prev, images: uploadedImages.length > 0 ? uploadedImages : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'] }));

    // Simply move to next question
    setTimeout(() => {
      addBotMessage(currentQuestionIndex + 1);
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

  // Get location details from postal code using AI
  const getLocationFromPostalCode = async (postalCode: string): Promise<string> => {
    const prompt = `Für die Postleitzahl ${postalCode} in Deutschland: Nenne mir nur den Stadtteil und die Stadt im Format "Stadtteil, Stadt" (z.B. "Prenzlauer Berg, Berlin" oder "Altstadt, München"). Antworte nur mit dem Stadtteil und Stadt, nichts anderes.`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const apiPromise = sendChatMessage({ message: prompt });
      const response = await Promise.race([apiPromise, timeoutPromise]);

      let location = response.message.trim();
      // Remove quotes if present
      location = location.replace(/^["']|["']$/g, '');

      return location;
    } catch (error) {
      console.error('Error getting location from postal code:', error);
      return postalCode; // Fallback to just the postal code
    }
  };

  // Auto-generate description using AI API
  const generateDescriptionWithAI = async (userKeyPoints?: string): Promise<string> => {
    const type = PROPERTY_TYPE_LABELS[listingData.property_type || ''] || 'Immobilie';
    const location = listingData.location || 'attraktiver Lage';
    const sqm = listingData.sqm ? `${listingData.sqm}m²` : '';
    const rooms = listingData.rooms ? `${listingData.rooms} Zimmer` : '';
    const condition = CONDITION_LABELS[listingData.condition || ''] || '';
    const features = listingData.features?.join(', ') || '';
    const price = listingData.price ? formatPrice(listingData.price) : '';
    const points = userKeyPoints || keyPoints;

    // Fallback description
    const fallbackDesc = () => {
      const parts = [];
      if (type && type !== 'Immobilie') parts.push(type);
      if (location) parts.push(`in ${location}`);
      if (sqm) parts.push(`mit ${sqm}`);
      if (rooms) parts.push(`und ${rooms}`);
      if (condition) parts.push(`${condition}`);
      if (points) parts.push(`${points}`);

      let desc = parts.join(' ') + '.';
      if (features) desc += ` Ausstattung: ${features}.`;

      return desc.length > 500 ? desc.substring(0, 497) + '...' : desc;
    };

    const prompt = `Erstelle eine ansprechende Immobilien-Beschreibung (max. 500 Zeichen, ca. 5-7 Sätze) basierend auf:
Art: ${type}
Lage: ${location}
Größe: ${sqm}, ${rooms}
Zustand: ${condition}
Features: ${features}
Preis: ${price}
Stichpunkte des Besitzers: ${points || 'keine angegeben'}

Schreibe einen verkaufsstarken Text in professionellem Stil. Die Beschreibung soll informativ und ansprechend sein. Ohne Anführungszeichen.`;

    try {
      console.log('Generating AI description...');

      // Timeout nach 10 Sekunden
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const apiPromise = sendChatMessage({ message: prompt });

      const response = await Promise.race([apiPromise, timeoutPromise]);

      console.log('AI response:', response);

      // Ensure max 500 characters
      let desc = response.message.trim();
      // Remove quotes if present
      desc = desc.replace(/^["']|["']$/g, '');

      if (desc.length > 500) {
        desc = desc.substring(0, 497) + '...';
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
        // Basic info
        title: listingData.title || 'Neue Immobilie',
        description: listingData.description || '',
        property_type: listingData.property_type,

        // Location
        location: listingData.location || '',
        postal_code: listingData.postal_code,
        street_address: listingData.street_address,

        // Pricing
        price: listingData.price || 0,
        commission_rate: listingData.commission_rate,
        monthly_fee: listingData.monthly_fee,
        require_address_consent: listingData.require_address_consent || false,

        // Size & Rooms
        sqm: listingData.sqm || 0,
        usable_area: listingData.usable_area,
        usable_area_ratio: listingData.usable_area_ratio,
        rooms: listingData.rooms || 0,
        bathrooms: listingData.bathrooms,

        // Building info
        total_floors: listingData.total_floors,
        floor_level: listingData.floor_level,
        year_built: listingData.year_built,
        condition: listingData.condition,

        // Energy & Heating
        heating_type: listingData.heating_type,
        energy_source: listingData.energy_source,
        energy_certificate: listingData.energy_certificate,

        // Features & availability
        features: listingData.features || [],
        available_from: listingData.available_from,
        images: listingData.images || [],

        // AI & Metadata
        highlights: [],
        red_flags: [],
        user_id: user.id,
        viewing_appointments: listingData.viewing_appointments,
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

  const handleRestart = () => {
    // Reset all states
    setMessages([]);
    setCurrentQuestionIndex(0);
    setIsTyping(false);
    setTextInput('');
    setNumberInput('');
    setSelectedFeatures([]);
    setUploadedImages([]);
    setListingData({});
    setSelectedAppointments([]);
    setIsComplete(false);
    setIsSubmitting(false);
    setIsGeneratingDescription(false);
    setPreviewImageIndex(0);
    setKeyPoints('');

    // Start conversation again
    setTimeout(() => {
      addBotMessage(0);
    }, 300);
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
    <main className="h-screen overflow-hidden bg-gray-50">
      <Header />

      {/* Progress Bar - Full Width */}
      <div className="w-full bg-white border-b border-gray-200 px-6 py-4">
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

      <div className="h-[calc(100vh-148px)] flex flex-col">

        {/* Three Column Layout - Images | Details | Chat */}
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Image Slideshow */}
          <div className="lg:w-1/3 p-4 lg:p-6 h-full">
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
          <div className="lg:w-1/3 lg:overflow-y-auto p-4 lg:p-8 h-full">
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
          <div className="lg:w-1/3 flex flex-col h-full overflow-hidden border-l border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 px-4 lg:px-8 pt-4 lg:pt-8">KI-Assistent</h3>

              <div
                ref={chatContainerRef}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
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
              <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white min-h-[100px]">
              {!isComplete && currentQuestion && (
                <>
                  {/* Quick Reply Buttons */}
                  {currentQuestion.inputType === 'quick-reply' && currentQuestion.options && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleQuickReply(option)}
                          disabled={isTyping}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                        onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleTextSubmit()}
                        placeholder={currentQuestion.placeholder}
                        disabled={isTyping}
                        className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || isTyping}
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
                          onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleNumberSubmit()}
                          placeholder={currentQuestion.placeholder}
                          disabled={isTyping}
                          className="flex-1 px-4 py-3 bg-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="pr-4 text-gray-500 font-medium">{currentQuestion.unit}</span>
                      </div>
                      <button
                        onClick={handleNumberSubmit}
                        disabled={!numberInput || isTyping}
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
                            disabled={isTyping}
                            className={`px-3 py-2 rounded-lg border-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
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
                        disabled={isTyping}
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Weiter
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Image Upload */}
                  {currentQuestion.inputType === 'image-upload' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {/* Drag and Drop Zone */}
                      <div
                        onClick={() => !isTyping && fileInputRef.current?.click()}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOverUpload}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDropUpload}
                        className={`mb-4 border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                          isDragOver
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50'
                        } ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                          isDragOver ? 'bg-primary/10' : 'bg-gray-100'
                        }`}>
                          <ImagePlus
                            size={32}
                            className={`${isDragOver ? 'text-primary' : 'text-gray-400'}`}
                          />
                        </div>
                        <h4 className={`text-lg font-semibold mb-2 ${isDragOver ? 'text-primary' : 'text-gray-900'}`}>
                          Bilder hochladen
                        </h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {isDragOver ? 'Bilder hier ablegen...' : 'Klicken Sie hier oder ziehen Sie Bilder hierher'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Erlaubte Formate: JPG, PNG, WebP, GIF • Max. 10 MB pro Bild
                        </p>
                      </div>

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
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('onDrop triggered for index:', idx);
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

                      <button
                        onClick={handleImagesSubmit}
                        disabled={isTyping}
                        className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Weiter
                        <ChevronRight size={18} />
                      </button>
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
                            rows={6}
                            maxLength={500}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors resize-none text-gray-800"
                          />
                          <div className="flex items-center justify-between mt-2 mb-3">
                            <span className="text-xs text-gray-500">
                              {textInput.length}/500 Zeichen
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

              {/* Restart Button when completed */}
              {isComplete && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Neustarten
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

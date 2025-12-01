'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { getPropertyById, updateProperty, sendChatMessage } from '@immoflow/api';
import type { Property } from '@immoflow/database';
import { Home, Sparkles, Check, ChevronRight, ImagePlus, X, Send, Image as ImageIcon, Calendar } from 'lucide-react';

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
  property_type: string;
  title: string;
  location: string;
  price: number;
  sqm: number;
  rooms: number;
  condition: string;
  features: string[];
  images: string[];
  description?: string;
  viewing_appointments?: ViewingAppointment[];
}

const FEATURE_OPTIONS = [
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
];

// Edit options for quick selection
const EDIT_OPTIONS: QuickReplyOption[] = [
  { label: 'Titel', value: 'title' },
  { label: 'Standort', value: 'location' },
  { label: 'Preis', value: 'price' },
  { label: 'Fläche', value: 'sqm' },
  { label: 'Zimmer', value: 'rooms' },
  { label: 'Beschreibung', value: 'description' },
  { label: 'Ausstattung', value: 'features' },
  { label: 'Bilder', value: 'images' },
  { label: 'Termine', value: 'appointments' },
];

export default function EditListingPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [listingData, setListingData] = useState<Partial<ListingData>>({});
  const [selectedAppointments, setSelectedAppointments] = useState<ViewingAppointment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [editField, setEditField] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const conversationStartedRef = useRef(false);

  // Load property data
  useEffect(() => {
    async function loadProperty() {
      if (!propertyId) return;

      try {
        const data = await getPropertyById(propertyId);
        if (!data) {
          router.push('/');
          return;
        }
        setProperty(data);

        // Initialize listing data from property
        setListingData({
          title: data.title,
          location: data.location,
          price: data.price,
          sqm: data.sqm,
          rooms: data.rooms,
          features: data.features || [],
          images: data.images || [],
          description: data.description || '',
        });
        setUploadedImages(data.images || []);
        setSelectedFeatures(data.features || []);
      } catch (error) {
        console.error('Error loading property:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [propertyId, router]);

  // Check ownership and redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?redirectTo=/property/${propertyId}/edit`);
    }
    if (!loading && property && user && property.user_id !== user.id) {
      router.push(`/property/${propertyId}`);
    }
  }, [authLoading, user, loading, property, propertyId, router]);

  // Start conversation
  useEffect(() => {
    if (user && property && !conversationStartedRef.current) {
      conversationStartedRef.current = true;
      addBotMessage(`Willkommen zurück! 🏠 Sie bearbeiten jetzt "${property.title}". Was möchten Sie ändern?`);
    }
  }, [user, property]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Auto-slideshow for preview
  useEffect(() => {
    const images = listingData.images || [];
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setPreviewImageIndex((prev) =>
        prev >= images.length - 1 ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [listingData.images?.length]);

  const addBotMessage = async (content: string, inputType?: InputType, options?: QuickReplyOption[]) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
    setIsTyping(false);

    const newMessage: Message = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content,
      inputType,
      options,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleEditFieldSelect = async (option: QuickReplyOption) => {
    addUserMessage(option.label);
    setEditField(option.value);

    switch (option.value) {
      case 'title':
        setTextInput(listingData.title || '');
        await addBotMessage('Geben Sie den neuen Titel ein:', 'text');
        break;
      case 'location':
        setTextInput(listingData.location || '');
        await addBotMessage('Geben Sie den neuen Standort ein:', 'text');
        break;
      case 'price':
        setNumberInput(listingData.price?.toString() || '');
        await addBotMessage('Geben Sie den neuen Preis ein:', 'number');
        break;
      case 'sqm':
        setNumberInput(listingData.sqm?.toString() || '');
        await addBotMessage('Geben Sie die neue Wohnfläche ein:', 'number');
        break;
      case 'rooms':
        setNumberInput(listingData.rooms?.toString() || '');
        await addBotMessage('Geben Sie die neue Zimmeranzahl ein:', 'number');
        break;
      case 'description':
        setTextInput(listingData.description || '');
        await addBotMessage('Bearbeiten Sie die Beschreibung:', 'textarea');
        break;
      case 'features':
        await addBotMessage('Wählen Sie die Ausstattungsmerkmale aus:', 'multi-select');
        break;
      case 'images':
        await addBotMessage('Laden Sie neue Bilder hoch oder entfernen Sie bestehende:', 'image-upload');
        break;
      case 'appointments':
        await addBotMessage('Wählen Sie die Besichtigungstermine aus (max. 3):', 'appointment-select');
        break;
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !editField) return;

    addUserMessage(textInput);

    switch (editField) {
      case 'title':
        setListingData(prev => ({ ...prev, title: textInput }));
        break;
      case 'location':
        setListingData(prev => ({ ...prev, location: textInput }));
        break;
      case 'description':
        setListingData(prev => ({ ...prev, description: textInput }));
        break;
    }

    setTextInput('');
    setEditField(null);
    await addBotMessage('Änderung übernommen! Was möchten Sie noch bearbeiten?');
  };

  const handleNumberSubmit = async () => {
    if (!numberInput || !editField) return;

    const units: Record<string, string> = {
      price: '€',
      sqm: 'm²',
      rooms: 'Zimmer',
    };

    addUserMessage(`${numberInput} ${units[editField] || ''}`);

    switch (editField) {
      case 'price':
        setListingData(prev => ({ ...prev, price: parseInt(numberInput) }));
        break;
      case 'sqm':
        setListingData(prev => ({ ...prev, sqm: parseInt(numberInput) }));
        break;
      case 'rooms':
        setListingData(prev => ({ ...prev, rooms: parseInt(numberInput) }));
        break;
    }

    setNumberInput('');
    setEditField(null);
    await addBotMessage('Änderung übernommen! Was möchten Sie noch bearbeiten?');
  };

  const handleFeatureToggle = (value: string) => {
    setSelectedFeatures(prev =>
      prev.includes(value)
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  const handleFeaturesSubmit = async () => {
    const featureLabels = selectedFeatures.map(value => {
      const option = FEATURE_OPTIONS.find(o => o.value === value);
      return option?.label || value;
    });

    addUserMessage(featureLabels.length > 0 ? featureLabels.join(', ') : 'Keine Auswahl');
    setListingData(prev => ({ ...prev, features: featureLabels }));
    setEditField(null);
    await addBotMessage('Ausstattung aktualisiert! Was möchten Sie noch bearbeiten?');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target!.result as string]);
          setListingData(prev => ({
            ...prev,
            images: [...(prev.images || []), event.target!.result as string]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setListingData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const handleImagesSubmit = async () => {
    addUserMessage(`${uploadedImages.length} Bild(er) gespeichert`);
    setEditField(null);
    await addBotMessage('Bilder aktualisiert! Was möchten Sie noch bearbeiten?');
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
      if (date.getDay() !== 0) {
        const time = times[i % times.length];
        options.push({
          date: `${weekdays[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`,
          time: `${time} Uhr`,
        });
      }
    }
    return options.slice(0, 6);
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

  const handleAppointmentsSubmit = async () => {
    const appointmentText = selectedAppointments.length > 0
      ? selectedAppointments.map(a => `${a.date} ${a.time}`).join(', ')
      : 'Keine Termine';
    addUserMessage(appointmentText);
    setListingData(prev => ({ ...prev, viewing_appointments: selectedAppointments }));
    setEditField(null);
    await addBotMessage('Termine aktualisiert! Was möchten Sie noch bearbeiten?');
  };

  const generateDescriptionWithAI = async (): Promise<string> => {
    const location = listingData.location || '';
    const sqm = listingData.sqm ? `${listingData.sqm}m²` : '';
    const rooms = listingData.rooms ? `${listingData.rooms} Zimmer` : '';
    const features = listingData.features?.join(', ') || '';
    const price = listingData.price ? formatPrice(listingData.price) : '';

    const prompt = `Erstelle eine kurze, ansprechende Immobilien-Beschreibung (100-150 Zeichen) für folgende Immobilie:
- Lage: ${location}
- Größe: ${sqm}
- Zimmer: ${rooms}
- Ausstattung: ${features}
- Preis: ${price}

Die Beschreibung soll professionell und einladend sein. Antworte nur mit der Beschreibung, ohne Anführungszeichen.`;

    try {
      const response = await sendChatMessage({ message: prompt });
      let desc = response.message.trim();
      if (desc.length > 150) {
        desc = desc.substring(0, 147) + '...';
      }
      return desc;
    } catch (error) {
      console.error('Error generating description:', error);
      return `Immobilie in ${location} mit ${sqm}, ${rooms}.`;
    }
  };

  const handleSave = async () => {
    if (!property || !user) return;

    setIsSubmitting(true);
    try {
      await updateProperty(property.id, {
        title: listingData.title,
        location: listingData.location,
        price: listingData.price,
        sqm: listingData.sqm,
        rooms: listingData.rooms,
        features: listingData.features,
        images: listingData.images,
        description: listingData.description,
      });
      router.push(`/property/${property.id}`);
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
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

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <p className="text-gray-500">Laden...</p>
        </div>
      </main>
    );
  }

  if (!user || !property) {
    return null;
  }

  const previewImages = listingData.images || [];
  const previewPricePerSqm = listingData.price && listingData.sqm && listingData.sqm > 0
    ? Math.round(listingData.price / listingData.sqm)
    : 0;

  // Live Preview Component - Airbnb Style
  const LivePreview = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Image Carousel */}
      <div className="relative h-72 group">
        {previewImages.length > 0 ? (
          <>
            <div className="absolute top-2 left-3 right-3 flex gap-1 z-10">
              {previewImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewImageIndex(idx)}
                  className="flex-1 h-1 rounded-full overflow-hidden bg-white/30 cursor-pointer"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      idx <= previewImageIndex ? 'bg-white w-full' : 'bg-transparent w-0'
                    }`}
                  />
                </button>
              ))}
            </div>
            <img
              src={previewImages[previewImageIndex] || previewImages[0]}
              alt={`Bild ${previewImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-300">
              <ImageIcon size={40} strokeWidth={1.5} />
              <p className="text-sm mt-2 font-medium">Keine Bilder</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        <div className="p-5">
          <p className="text-base text-gray-500 font-medium mb-2">
            {listingData.location || 'Standort'}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3 leading-tight">
            {listingData.title || 'Titel'}
          </h1>
          <div className="flex items-center gap-1.5 text-base text-gray-600 mb-4 flex-wrap">
            {listingData.sqm && <span>{listingData.sqm} m²</span>}
            {listingData.sqm && listingData.rooms && <span className="text-gray-300">·</span>}
            {listingData.rooms && <span>{listingData.rooms} Zimmer</span>}
          </div>
          <div className="border-t border-gray-100 my-4"></div>
          <div className="mb-4">
            <span className="text-3xl font-semibold text-gray-900">
              {listingData.price ? formatPrice(listingData.price) : '–––'}
            </span>
            {previewPricePerSqm > 0 && (
              <p className="text-base text-gray-500 mt-1">
                {formatPrice(previewPricePerSqm)} pro m²
              </p>
            )}
          </div>
          <div className="border-t border-gray-100 my-4"></div>
          {listingData.features && listingData.features.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ausstattung</h3>
              <div className="grid grid-cols-2 gap-2">
                {listingData.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <Check size={18} className="text-gray-600 flex-shrink-0" />
                    <span className="text-base text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {listingData.description && (
            <div className="mb-4">
              <div className="border-t border-gray-100 my-4"></div>
              <p className="text-base text-gray-600 leading-relaxed">
                {listingData.description}
              </p>
            </div>
          )}
          {/* Besichtigungstermine */}
          {listingData.viewing_appointments && listingData.viewing_appointments.length > 0 && (
            <div className="mb-4">
              <div className="border-t border-gray-100 my-4"></div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={20} className="text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Besichtigungstermine</h3>
              </div>
              <div className="space-y-2">
                {listingData.viewing_appointments.map((apt, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-medium text-sm text-gray-900">{apt.date}</div>
                    <div className="text-sm text-gray-500">{apt.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <div className="h-[calc(100vh-64px)] flex flex-col px-4 py-4">
        {/* Header */}
        <div className="mb-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inserat bearbeiten</h1>
              <p className="text-gray-500">{property.title}</p>
            </div>
            <button
              onClick={() => router.push(`/property/${property.id}`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Abbrechen
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-6xl mx-auto w-full flex-1 min-h-0 overflow-auto lg:overflow-hidden">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
            <div
              ref={chatContainerRef}
              className="bg-white rounded-2xl shadow-lg overflow-hidden flex-1 min-h-0"
            >
              <div className="h-full overflow-y-auto p-6 space-y-5">
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

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-4 flex-shrink-0">
              {!isTyping && !editField && (
                <div className="flex flex-wrap gap-2">
                  {EDIT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleEditFieldSelect(option)}
                      className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-red-50 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Text Input */}
              {editField && ['title', 'location'].includes(editField) && (
                <div className="flex gap-2">
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim()}
                    className="px-4 py-3 bg-primary hover:opacity-90 text-white rounded-xl disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              )}

              {/* Number Input */}
              {editField && ['price', 'sqm', 'rooms'].includes(editField) && (
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-white border-2 border-gray-200 rounded-xl focus-within:border-primary transition-colors">
                    <input
                      ref={numberInputRef}
                      type="number"
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNumberSubmit()}
                      className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
                    />
                    <span className="pr-4 text-gray-500 font-medium">
                      {editField === 'price' ? '€' : editField === 'sqm' ? 'm²' : 'Zimmer'}
                    </span>
                  </div>
                  <button
                    onClick={handleNumberSubmit}
                    disabled={!numberInput}
                    className="px-4 py-3 bg-primary hover:opacity-90 text-white rounded-xl disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              )}

              {/* Description Textarea */}
              {editField === 'description' && (
                <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                  {isGeneratingDescription ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                        <span className="text-gray-600">KI erstellt Beschreibung...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Beschreibung eingeben..."
                        rows={4}
                        maxLength={150}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none"
                      />
                      <div className="flex items-center justify-between mt-2 mb-3">
                        <span className="text-xs text-gray-500">{textInput.length}/150 Zeichen</span>
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
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Sparkles size={12} />
                          Neu generieren
                        </button>
                      </div>
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Übernehmen
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Multi-Select Features */}
              {editField === 'features' && (
                <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {FEATURE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFeatureToggle(option.value)}
                        className={`px-3 py-1.5 rounded-lg border-2 transition-colors text-sm ${
                          selectedFeatures.includes(option.value)
                            ? 'border-primary bg-red-50 text-primary'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {selectedFeatures.includes(option.value) && <Check size={14} />}
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleFeaturesSubmit}
                    className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    Übernehmen
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Image Upload */}
              {editField === 'images' && (
                <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {uploadedImages.length > 0 && (
                    <div className="flex gap-3 mb-4 overflow-x-auto pb-2 pt-2 px-1">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0">
                          <img
                            src={img}
                            alt={`Bild ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                    >
                      <ImagePlus size={20} />
                      Bilder hinzufügen
                    </button>
                    <button
                      onClick={handleImagesSubmit}
                      className="py-3 px-6 bg-primary hover:opacity-90 text-white rounded-xl font-medium flex items-center gap-2"
                    >
                      Fertig
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Appointment Selection */}
              {editField === 'appointments' && (
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
                          className={`p-3 rounded-xl border-2 text-left transition-colors relative ${
                            isSelected
                              ? 'border-primary bg-red-50'
                              : 'border-gray-200 bg-white hover:border-primary/50'
                          }`}
                        >
                          <div className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                            {appointment.date}
                          </div>
                          <div className={`text-sm ${isSelected ? 'text-primary/80' : 'text-gray-500'}`}>
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
                    className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    Übernehmen
                    <ChevronRight size={18} />
                  </button>
                </div>
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

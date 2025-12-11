/**
 * Custom hook for handling conversational AI chat
 */
import { useState, useRef, useEffect } from 'react';
import type { Message, ConversationMessage, ListingData } from '../types';

interface UseConversationalAIResult {
  messages: Message[];
  conversationHistory: ConversationMessage[];
  isComplete: boolean;
  textInput: string;
  textInputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  setTextInput: (value: string) => void;
  addBotMessage: (content: string, extractedData?: ListingData) => void;
  addUserMessage: (content: string) => void;
  updateConversationHistory: (history: ConversationMessage[]) => void;
  setIsComplete: (value: boolean) => void;
  initializeWelcomeMessages: (mode?: 'create' | 'edit' | 'import') => void;
}

export function useConversationalAI(): UseConversationalAIResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const updateConversationHistory = (history: ConversationMessage[]) => {
    setConversationHistory(history);
  };

  const initializeWelcomeMessages = (mode: 'create' | 'edit' | 'import' = 'create') => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Different welcome messages based on mode
    if (mode === 'import') {
      addBotMessage('Hey! Ich helfe dir, dein Inserat zu importieren. Lade einfach Screenshots des Inserats oder ein PDF-Exposé hoch, und ich extrahiere automatisch alle Daten für dich. Du kannst dann die Daten bei Bedarf noch anpassen.');
    } else {
      // Default message for create/edit mode
      addBotMessage('Hey! Erzähl mir einfach, was du über deine Immobilie weißt - Typ, Lage, Preis, Größe, Zimmer, Zustand, Ausstattung usw. Du kannst auch direkt Bilder hochladen. Ich helfe dir dann, ein perfektes Inserat zu erstellen!');
    }
  };

  return {
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
  };
}

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
      addBotMessage(`Hey! 👋

Lade ein Exposé, Screenshots oder Bilder hoch - oder beschreib die Immobilie.

**Ich frage dich zuerst nach dem Objekttyp**, dann nur nach den wichtigsten Daten.

Los geht's!`);
    } else if (mode === 'edit') {
      // Edit mode
      addBotMessage(`Hey! 👋

Du kannst jetzt deine Immobilie bearbeiten. Sag mir einfach, was du ändern möchtest.

Beispiele:
• "Ändere den Preis auf 500.000 Euro"
• "Die Wohnung hat 4 Zimmer, nicht 3"
• "Ergänze: Balkon mit Südausrichtung"

Was möchtest du anpassen?`);
    } else {
      // Create mode
      addBotMessage(`Hey! 👋

Lass uns gemeinsam deine Immobilie erfassen.

**Zuerst:** Um welchen Objekttyp handelt es sich?
• Wohnung
• Haus
• Mehrfamilienhaus
• Grundstück
• Gewerbe/Büro
• Stellplatz
• ...

Danach frage ich nur nach den wichtigsten Daten für die Berechnung. Alle weiteren Details kannst du optional ergänzen.`);
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

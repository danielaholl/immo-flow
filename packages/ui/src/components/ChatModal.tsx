'use client';

import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatMessage } from '@immoflow/api';
import { X, Send, Sparkles, Home } from 'lucide-react';
import type { Message } from './ChatAssistant';

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle?: string;
}

/**
 * Modal Dialog für KI-Assistenten
 * Basiert auf dem Design-Screenshot
 */
export function ChatModal({ isOpen, onClose, propertyId, propertyTitle }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && propertyTitle) {
      const greetingMessage: Message = {
        id: 'initial',
        role: 'assistant',
        content: `Hallo! Ich bin Ihr KI-Assistent für die Immobilie "${propertyTitle}". Wie kann ich Ihnen helfen?`,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
    }
  }, [isOpen, propertyTitle]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await sendChatMessage({
        message: userInput,
        propertyId,
        conversationHistory,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(response.timestamp),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const frequentQuestions = [
    'Wie hoch sind die Nebenkosten?',
    'Gibt es einen Stellplatz?',
    'Wann wurde saniert?',
    'Wie ist die Energieeffizienz?',
    'Was macht die Lage besonders?',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">KI-Assistent</h2>
              <p className="text-sm text-gray-500">Sofortige Antworten</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white rounded-3xl px-5 py-3'
                      : 'bg-gray-100 text-gray-900 rounded-2xl px-5 py-4'
                  }`}
                >
                  <p className="text-[16px] leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-5 py-4">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Frequent Questions */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">Häufig gestellte Fragen:</p>
            <div className="flex flex-wrap gap-2">
              {frequentQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="px-3 py-2 text-sm text-gray-800 bg-white border-2 border-primary/20 rounded-lg hover:border-primary hover:bg-primary/5 hover:text-primary transition-all font-medium"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-2 border-gray-300 rounded-xl bg-white focus-within:border-primary transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="z.B. Wie hoch sind die Nebenkosten?"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-base disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 bg-primary hover:bg-primary-dark disabled:bg-gray-100 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                aria-label="Senden"
              >
                <Send className={`w-5 h-5 ${!input.trim() || isLoading ? 'text-gray-400' : 'text-white'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

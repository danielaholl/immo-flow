import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatMessage } from '@immoflow/api';
import { Search, Home, User } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatAssistantProps {
  onSearch?: (query: string) => void;
  className?: string;
  propertyId?: string;
}

/**
 * ChatGPT-style Chat Assistant
 * Clean, minimal design focused on conversation
 */
export function ChatAssistant({ onSearch, className = '', propertyId }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

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
      // Build conversation history for context
      const conversationHistory: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the real AI API
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

      // Trigger search if callback provided
      if (onSearch) {
        onSearch(userInput);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler beim Abrufen der Antwort. Bitte versuchen Sie es erneut.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const examplePrompts = [
    '3-Zimmer Wohnung in Berlin unter 500.000€',
    'Neubau mit Balkon in München',
    'Beste Investment-Immobilien',
    'Wohnung mit guter Rendite',
  ];

  return (
    <>
      {/* Input Area - Premium Airbnb Style at Top */}
      <div className="w-full pb-6 pt-6 mb-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative flex items-center bg-white rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.12),0_12px_48px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100">

            {/* Input Section */}
            <div className="flex-1 pl-8 pr-4 py-5">
              <div className="flex flex-col">

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Welche Immobilie gefällt es dir heute?"
                  rows={1}
                  disabled={isLoading}
                  className="w-full resize-none outline-none text-gray-800 placeholder-gray-400 text-[15px] leading-tight max-h-20 overflow-y-auto disabled:opacity-50 bg-transparent font-normal"
                  style={{ minHeight: '22px' }}
                />
              </div>
            </div>

            {/* Search Button - Premium Airbnb Style */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-14 h-14 mr-2.5 bg-gradient-to-br from-[#FF385C] via-[#E61E4D] to-[#D70466] hover:from-[#E61E4D] hover:via-[#D70466] hover:to-[#C1003D] text-white rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(230,30,77,0.4)] hover:shadow-[0_4px_20px_rgba(230,30,77,0.6)] hover:scale-105 active:scale-95"
              aria-label="Suchen"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-3 font-medium">
            ImmoFlow nutzt KI. Prüfe wichtige Informationen.
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`w-full ${className}`}>
        {messages.length === 0 ? (
          // Empty state with example prompts
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6 px-4 py-8">
            <div className="flex flex-wrap justify-center gap-2 w-full max-w-3xl">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:shadow-sm transition-all group hover:text-gray-900"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages
          <div className="space-y-6 max-w-3xl mx-auto py-8 px-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className={`flex-1 ${message.role === 'user' ? 'max-w-2xl' : ''}`}>
                  <div
                    className={`rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-gray-100 text-gray-900 ml-auto'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-5 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </>

  );
}

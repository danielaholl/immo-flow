'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, ArrowLeft, Paperclip, Bot } from 'lucide-react';
import type { UniversalChatProps, ChatMessage } from './types';

/**
 * Universal Chat Component
 *
 * A reusable chat component with Airbnb-style design.
 * Can be used for user-to-user messaging, AI chat, or any conversational UI.
 */
export function UniversalChat({
  messages,
  header,
  input = {},
  style = {},
  inputValue = '',
  onInputChange,
  onSendMessage,
  onFileUpload,
  isTyping = false,
  typingText = 'schreibt...',
  isSending = false,
  isUploading = false,
  enableDragDrop = false,
  className = '',
  showTimestamps = true,
  showSenderNames = true,
  messagesEndRef: externalMessagesEndRef,
  emptyState,
}: UniversalChatProps) {
  const internalMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalMessagesEndRef || internalMessagesEndRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localInputValue, setLocalInputValue] = useState('');

  // Use controlled or uncontrolled input
  const currentValue = onInputChange ? inputValue : localInputValue;
  const handleInputChange = onInputChange || setLocalInputValue;

  // Default input config
  const {
    placeholder = 'Nachricht eingeben...',
    disabled = false,
    showFileUpload = false,
    acceptedFileTypes = 'image/jpeg,image/png,image/webp,application/pdf',
    multipleFiles = true,
  } = input;

  // Default style config
  const {
    userBubble = {
      bgColor: 'bg-gray-900',
      textColor: 'text-white',
      borderRadius: 'rounded-xl rounded-br-none',
    },
    botBubble = {
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      borderColor: 'border border-gray-200',
      borderRadius: 'rounded-xl rounded-bl-none',
    },
    systemMessage = {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border border-yellow-200',
    },
  } = style;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle send message
  const handleSend = useCallback(() => {
    if (!currentValue.trim() || isSending || disabled) return;
    onSendMessage?.(currentValue.trim());
    if (!onInputChange) {
      setLocalInputValue('');
    }
  }, [currentValue, isSending, disabled, onSendMessage, onInputChange]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload?.(e.target.files);
      e.target.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload?.(e.dataTransfer.files);
    }
  };

  // Render message bubble
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.sender === 'user';
    const isSystem = msg.sender === 'system';
    const isBot = msg.sender === 'bot' || msg.sender === 'ai';

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center">
          <div className={`${systemMessage.bgColor} ${systemMessage.borderColor} rounded-xl px-4 py-2 max-w-md text-center`}>
            <p className={`text-base ${systemMessage.textColor}`}>{msg.content}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
          {/* Sender Info */}
          {!isUser && showSenderNames && msg.senderName && (
            <div className="flex items-center gap-2 mb-1 ml-1">
              {isBot && <Bot size={16} className="text-primary" />}
              <span className="text-sm text-gray-500 font-medium">
                {msg.senderName}
              </span>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`px-4 py-3 ${
              isUser
                ? `${userBubble.bgColor} ${userBubble.textColor} ${userBubble.borderRadius}`
                : `${botBubble.bgColor} ${botBubble.textColor} ${botBubble.borderColor} ${botBubble.borderRadius}`
            }`}
          >
            <p className="text-base whitespace-pre-wrap break-words">{msg.content}</p>
          </div>

          {/* Timestamp */}
          {showTimestamps && msg.timestamp && (
            <div className={`mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
              <span className="text-sm text-gray-500">
                {msg.timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          {header.showBackButton && (
            <button
              onClick={header.onBackClick}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Zurück"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
          )}

          <div className="flex items-center gap-3">
            {header.icon ? (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {header.icon}
              </div>
            ) : null}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg text-gray-900 line-clamp-1">
                {header.title}
              </h2>
              {header.subtitle && (
                <p className="text-sm text-gray-500">{header.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-white relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && enableDragDrop && (
          <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl px-6 py-4 shadow-lg">
              <Paperclip size={48} className="text-primary mx-auto mb-2" />
              <p className="text-lg font-medium text-primary">Dateien hier ablegen</p>
              <p className="text-sm text-gray-500 mt-1">Bilder oder PDF</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && emptyState ? (
          <div className="flex items-center justify-center h-full">
            {emptyState}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(renderMessage)}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-600">{typingText}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload indicator */}
            {isUploading && (
              <div className="flex justify-end">
                <div className="bg-primary/10 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <p className="text-sm text-primary">Dateien werden verarbeitet...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        {/* Hidden file input */}
        {showFileUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            multiple={multipleFiles}
            onChange={handleFileChange}
            className="hidden"
          />
        )}

        <div className="flex gap-3 items-center">
          {/* File Upload Button */}
          {showFileUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              title="Datei hochladen"
            >
              <Paperclip size={20} />
            </button>
          )}

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={currentValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className="w-full resize-none border border-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent text-base h-12"
              rows={1}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!currentValue.trim() || isSending || disabled}
            className="bg-gray-900 text-white h-12 w-12 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

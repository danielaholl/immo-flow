'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Send, Loader2, ArrowLeft, Paperclip, Bot } from 'lucide-react';
import type { UniversalChatProps, ChatMessage, GalleryState, MessageAttachment } from './types';
import { AttachmentCard } from './AttachmentCard';
import { AttachmentGallery } from './AttachmentGallery';

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
  onFileInputChange,
  isTyping = false,
  isSending = false,
  isUploading = false,
  className = '',
  showTimestamps = true,
  showSenderNames = true,
  messagesEndRef: externalMessagesEndRef,
  emptyState,
  fileInputRef: externalFileInputRef,
  scrollToBottomRef,
}: UniversalChatProps) {
  const internalMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalMessagesEndRef || internalMessagesEndRef;
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localInputValue, setLocalInputValue] = useState('');
  const [galleryState, setGalleryState] = useState<GalleryState>({
    isOpen: false,
    attachments: [],
    initialIndex: 0,
  });

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

  // Collect all image attachments from messages for gallery navigation
  const allImageAttachments = useMemo(() => {
    return messages.flatMap((msg) =>
      (msg.attachments || []).filter((a) => a.type.startsWith('image/'))
    );
  }, [messages]);

  // Open gallery for a specific attachment
  const openGallery = useCallback((attachment: MessageAttachment) => {
    const index = allImageAttachments.findIndex((a) => a.url === attachment.url);
    setGalleryState({
      isOpen: true,
      attachments: allImageAttachments,
      initialIndex: index >= 0 ? index : 0,
    });
  }, [allImageAttachments]);

  // Track if this is the initial render for scroll behavior
  const isInitialScrollRef = useRef(true);

  // Scroll to bottom function with conditional animation
  const scrollToBottom = useCallback((animate: boolean = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: animate ? 'smooth' : 'instant'
    });
  }, []);

  // Expose scrollToBottom function via ref for external triggering
  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = scrollToBottom;
    }
    return () => {
      if (scrollToBottomRef) {
        scrollToBottomRef.current = null;
      }
    };
  }, [scrollToBottom, scrollToBottomRef]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isInitialScrollRef.current) {
      // First render: scroll without animation
      scrollToBottom(false);
      isInitialScrollRef.current = false;
    } else {
      // Subsequent updates: scroll with animation
      scrollToBottom(true);
    }
  }, [messages, isTyping, scrollToBottom]);

  // Keep focus on textarea after messages update or typing stops
  useEffect(() => {
    if (!disabled && !isTyping && !galleryState.isOpen) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, disabled, galleryState.isOpen]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Line height is ~26px (text-base 16px * leading-relaxed 1.625)
      // Max 20 lines = 520px
      const lineHeight = 26;
      const maxLines = 20;
      const maxHeight = lineHeight * maxLines;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [currentValue]);

  // Handle send message
  const handleSend = useCallback(() => {
    if (!currentValue.trim() || isSending || disabled) return;
    onSendMessage?.(currentValue.trim());
    if (!onInputChange) {
      setLocalInputValue('');
    }
    // Refocus textarea after sending
    setTimeout(() => textareaRef.current?.focus(), 50);
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
    // If external handler provided, use it (for full control over the event)
    if (onFileInputChange) {
      onFileInputChange(e);
      return;
    }
    // Otherwise use the simplified FileList callback
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload?.(e.target.files);
      e.target.value = '';
    }
  };

  // Render message with attachments as standalone cards (WhatsApp/Telegram style)
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.sender === 'user';
    const isSystem = msg.sender === 'system';
    const isBot = msg.sender === 'bot' || msg.sender === 'ai';

    const hasContent = msg.content && msg.content.trim();
    const hasAttachments = msg.attachments && msg.attachments.length > 0;

    // System messages
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
      <div key={msg.id} className="space-y-2">
        {/* Text Content in Bubble (only if there's text) */}
        {hasContent && (
          <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
              {/* Sender Info */}
              {!isUser && showSenderNames && msg.senderName && (
                <div className="flex items-center gap-2 mb-1 ml-1">
                  {msg.sender === 'bot' && <Bot size={16} className="text-primary" />}
                  <span className="text-sm text-gray-500 font-medium">
                    {msg.senderName}
                  </span>
                </div>
              )}

              {/* Message Bubble - Text Only */}
              <div
                className={`px-4 py-3 ${
                  isUser
                    ? `${userBubble.bgColor} ${userBubble.textColor} ${userBubble.borderRadius}`
                    : `${botBubble.bgColor} ${botBubble.textColor} ${botBubble.borderColor} ${botBubble.borderRadius}`
                }`}
              >
                <p className="text-base whitespace-pre-wrap break-words">{msg.content}</p>
              </div>

              {/* Timestamp for text-only messages */}
              {showTimestamps && msg.timestamp && !hasAttachments && (
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
        )}

        {/* Attachments as Standalone Cards (outside bubble) */}
        {hasAttachments && (
          <div className={`space-y-2 ${hasContent ? 'mt-1' : ''}`}>
            {msg.attachments!.map((attachment, idx) => {
              const isImage = attachment.type.startsWith('image/');
              return (
                <AttachmentCard
                  key={`${msg.id}-attachment-${idx}`}
                  attachment={attachment}
                  isUser={isUser}
                  onClick={isImage ? () => openGallery(attachment) : undefined}
                />
              );
            })}

            {/* Timestamp after attachments */}
            {showTimestamps && msg.timestamp && (
              <div className={`${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                <span className="text-sm text-gray-500">
                  {msg.timestamp.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}
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
              className={`p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors ${header.backButtonMobileOnly ? 'lg:hidden' : ''}`}
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

      {/* Messages Area Wrapper */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scrollable messages area */}
        <div className="h-full overflow-y-auto overflow-x-hidden p-6 bg-white">
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
                <div className={`${botBubble.bgColor} ${botBubble.borderColor} ${botBubble.borderRadius} px-4 py-3`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
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
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="bg-white p-4 flex-shrink-0">
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

        {/* ChatGPT-style input container */}
        <div className="relative flex flex-col bg-white rounded-2xl border border-gray-200 transition-colors">
          {/* Textarea - Top area */}
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-w-0 resize-none bg-transparent px-4 pt-4 pb-2 focus:outline-none text-base leading-relaxed overflow-y-auto"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '520px' }}
          />

          {/* Bottom row with buttons */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left side - Plus button */}
            <div className="flex items-center gap-2">
              {showFileUpload && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || disabled}
                  className="p-2 text-gray-900 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Datei hochladen"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Right side - Send button */}
            <button
              onClick={handleSend}
              disabled={!currentValue.trim() || isSending || disabled}
              className="w-9 h-9 flex items-center justify-center bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-full transition-colors disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery Lightbox */}
      <AttachmentGallery
        isOpen={galleryState.isOpen}
        attachments={galleryState.attachments}
        initialIndex={galleryState.initialIndex}
        onClose={() => setGalleryState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

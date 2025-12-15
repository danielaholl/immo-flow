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
  enableDragDrop,
  className = '',
  showTimestamps = true,
  showSenderNames = true,
  messagesEndRef: externalMessagesEndRef,
  emptyState,
  fileInputRef: externalFileInputRef,
  onDragEnter: externalDragEnter,
  onDragLeave: externalDragLeave,
  onDragOver: externalDragOver,
  onDrop: externalDrop,
  isDragOver: externalIsDragOver,
}: UniversalChatProps) {
  const internalMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalMessagesEndRef || internalMessagesEndRef;
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalIsDragOver, setInternalIsDragOver] = useState(false);
  const isDragOver = externalIsDragOver !== undefined ? externalIsDragOver : internalIsDragOver;
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

  // Drag & Drop is enabled by default when file upload is available
  const isDragDropEnabled = enableDragDrop ?? (showFileUpload || !!externalDrop || !!onFileUpload);

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

  // Drag & Drop handlers - use external handlers if provided, otherwise use internal
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (externalDragEnter) {
      externalDragEnter(e);
      return;
    }
    if (!isDragDropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setInternalIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (externalDragLeave) {
      externalDragLeave(e);
      return;
    }
    if (!isDragDropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setInternalIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (externalDragOver) {
      externalDragOver(e);
      return;
    }
    if (!isDragDropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (externalDrop) {
      externalDrop(e);
      return;
    }
    if (!isDragDropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setInternalIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload?.(e.dataTransfer.files);
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

      {/* Messages Area Wrapper - relative container for overlay */}
      <div className="flex-1 relative overflow-hidden">
        {/* Drag overlay - Airbnb style (outside scrollable area) */}
        {isDragOver && isDragDropEnabled && (
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] border-2 border-dashed border-gray-900 rounded-xl z-10 flex items-center justify-center pointer-events-none transition-all">
            <div className="bg-white rounded-2xl px-8 py-6 shadow-xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Paperclip size={32} className="text-gray-900" />
              </div>
              <p className="text-lg font-semibold text-gray-900 text-center">Dateien hier ablegen</p>
              <p className="text-sm text-gray-500 mt-1 text-center">Bilder oder PDF-Dokumente</p>
            </div>
          </div>
        )}

        {/* Scrollable messages area */}
        <div
          className="h-full overflow-y-auto overflow-x-hidden p-6 bg-white"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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

        <div className="flex gap-3 items-stretch">
          {/* File Upload Button */}
          {showFileUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 w-12 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              title="Datei hochladen"
            >
              <Paperclip size={20} />
            </button>
          )}

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="flex-1 min-w-0 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-0 focus:border-gray-900 bg-transparent text-base h-12 leading-normal transition-colors"
            rows={1}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!currentValue.trim() || isSending || disabled}
            className="bg-gray-900 text-white w-12 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
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

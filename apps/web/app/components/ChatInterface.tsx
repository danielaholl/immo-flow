/**
 * @deprecated Use UniversalChat component instead.
 * This component is kept for backwards compatibility.
 *
 * Chat Interface Component for conversational listing creation
 * @see ../components/UniversalChat/UniversalChat.tsx for the new implementation
 */
'use client';

import { Sparkles, ImagePlus, Send, Loader2, FileText, Paperclip } from 'lucide-react';
import type { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  textInput: string;
  textInputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploadingImages: boolean;
  isExtracting: boolean;
  isComplete: boolean;
  isSubmitting: boolean;
  isDragOver: boolean;
  currentStep: 'welcome' | 'chat';
  isEditMode?: boolean;
  isImportMode?: boolean;
  onTextInputChange: (value: string) => void;
  onSendMessage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileInputClick: () => void;
  onSubmit: () => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function ChatInterface({
  messages,
  textInput,
  textInputRef,
  messagesEndRef,
  fileInputRef,
  isUploadingImages,
  isExtracting,
  isComplete,
  isSubmitting,
  isDragOver,
  currentStep,
  isEditMode = false,
  isImportMode = false,
  onTextInputChange,
  onSendMessage,
  onImageUpload,
  onFileInputClick,
  onSubmit,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: ChatInterfaceProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="lg:w-6 lg:h-6" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-bold">Ela - Deine KI-Assistentin</h2>
            <p className="text-xs lg:text-sm text-white/80">Powered by GPT-4</p>
          </div>
        </div>
      </div>

      {/* Messages - Drag & Drop Zone */}
      <div
        className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-3 lg:space-y-4 relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl px-4 py-3 lg:px-6 lg:py-4 shadow-lg">
              <Paperclip size={36} className="lg:w-12 lg:h-12 text-primary mx-auto mb-2" />
              <p className="text-base lg:text-lg font-medium text-primary">
                Dateien hier ablegen
              </p>
              <p className="text-xs text-gray-500 mt-1">Bilder oder PDF-Exposé</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] lg:max-w-[80%] rounded-2xl px-3 py-2 lg:px-4 lg:py-3 ${
                msg.type === 'user'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <p className="text-sm lg:text-base whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isExtracting && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-1">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {isUploadingImages && (
          <div className="flex justify-end">
            <div className="bg-primary/10 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-2">
              <Loader2 size={14} className="lg:w-4 lg:h-4 animate-spin text-primary" />
              <p className="text-xs lg:text-sm text-primary">
                Dateien werden verarbeitet...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      {currentStep === 'chat' && (
        <div className="p-3 lg:p-4 border-t border-gray-200">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            onChange={(e) => {
              console.log('[ChatInterface] File input onChange triggered', {
                files: e.target.files?.length,
                isImportMode,
              });
              onImageUpload(e);
            }}
            className="hidden"
          />

          <div className="flex gap-2">
            {/* File Upload Button (Images + PDF) */}
            <button
              onClick={onFileInputClick}
              disabled={isUploadingImages}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 lg:p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Bilder oder PDF-Exposé hochladen"
            >
              <Paperclip size={18} className="lg:w-5 lg:h-5" />
            </button>

            {/* Text Input */}
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => onTextInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder={isEditMode ? "Was möchtest du ändern?" : "Beschreibe deine Immobilie oder lade ein PDF hoch..."}
              disabled={isExtracting}
              className="flex-1 px-3 py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            {/* Send Button */}
            <button
              onClick={onSendMessage}
              disabled={!textInput.trim() || isExtracting}
              className="bg-primary hover:bg-primary/90 text-white p-2.5 lg:p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} className="lg:w-5 lg:h-5" />
            </button>
          </div>

          {/* Button removed - now in Preview section */}
          {isComplete && false && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full mt-2 lg:mt-3 bg-green-600 hover:bg-green-700 text-white py-2.5 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="lg:w-5 lg:h-5 animate-spin" />
                  <span className="text-sm lg:text-base">Wird erstellt...</span>
                </>
              ) : (
                'Inserat veröffentlichen'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { FileText, ExternalLink } from 'lucide-react';
import type { MessageAttachment } from './types';

interface AttachmentCardProps {
  attachment: MessageAttachment;
  isUser: boolean;
  onClick?: () => void;
}

/**
 * Standalone Attachment Card Component
 * Displays file attachments as thumbnail cards (WhatsApp/Telegram style)
 */
export function AttachmentCard({
  attachment,
  isUser,
  onClick,
}: AttachmentCardProps) {
  const isPdf = attachment.type === 'application/pdf';

  // Use thumbnail for PDFs if available, otherwise original for images
  const previewUrl = isPdf ? attachment.thumbnailUrl : attachment.url;

  const handlePdfClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          relative max-w-[280px] rounded-2xl overflow-hidden shadow-sm
          border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
          ${(onClick || isPdf) ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        `}
        onClick={isPdf ? handlePdfClick : onClick}
      >
        {/* Preview Image (for images and PDF thumbnails) */}
        {previewUrl ? (
          <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700">
            <img
              src={previewUrl}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
            {/* PDF Overlay Badge */}
            {isPdf && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                <FileText size={12} />
                PDF
              </div>
            )}
            {/* Open in new tab indicator for PDF */}
            {isPdf && (
              <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-md">
                <ExternalLink size={14} />
              </div>
            )}
          </div>
        ) : isPdf ? (
          /* Fallback for PDFs without thumbnail */
          <div className="aspect-[4/3] bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center relative">
            <div className="text-center">
              <FileText size={48} className="text-red-500 dark:text-red-400 mx-auto mb-2" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">PDF</span>
            </div>
            <div className="absolute top-2 right-2 bg-red-500/80 text-white p-1.5 rounded-md">
              <ExternalLink size={14} />
            </div>
          </div>
        ) : (
          /* Fallback for other file types */
          <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {attachment.name.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

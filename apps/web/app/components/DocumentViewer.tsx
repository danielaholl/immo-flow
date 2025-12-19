'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, ExternalLink } from 'lucide-react';
import type { PropertyDocument } from '../create-listing/types';

interface DocumentViewerProps {
  document: PropertyDocument;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const isPdf = document.mimetype === 'application/pdf';

  const handleDownload = () => {
    window.open(document.url, '_blank');
  };

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3 text-white min-w-0">
          <FileText size={20} className="flex-shrink-0" />
          <span className="font-medium truncate">{document.filename}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isPdf && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(50, z - 25))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Verkleinern"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white text-sm w-14 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(200, z + 25))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Vergrößern"
              >
                <ZoomIn size={18} />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Herunterladen"
          >
            <Download size={18} />
          </button>
          {isPdf && (
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="In neuem Tab öffnen"
            >
              <ExternalLink size={18} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isPdf ? (
          // Embedded PDF Viewer
          <iframe
            src={`${document.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full bg-white"
            title={document.filename}
          />
        ) : (
          // Image Display
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <img
              src={document.url}
              alt={document.filename}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Eye, Clock, UserCheck, FileText, GripVertical, X, ChevronDown } from 'lucide-react';
import type { PropertyDocument, DocumentVisibility } from '../create-listing/types';
import { DOCUMENT_CATEGORIES, VISIBILITY_LABELS, VISIBILITY_COLORS } from '../create-listing/types';
import { truncateFilename } from '../create-listing/utils/documentUtils';

interface DocumentVisibilityManagerProps {
  documents: PropertyDocument[];
  onDocumentsChange: (documents: PropertyDocument[]) => void;
  onDocumentRemove?: (id: string) => void;
  onDocumentClick?: (doc: PropertyDocument) => void;
  disabled?: boolean;
  defaultExpanded?: boolean;
}

const VISIBILITY_ORDER: DocumentVisibility[] = ['public', 'auto_approved', 'manual_approval'];

const VISIBILITY_ICONS: Record<DocumentVisibility, React.ReactNode> = {
  public: <Eye size={16} />,
  auto_approved: <Clock size={16} />,
  manual_approval: <UserCheck size={16} />,
};

const VISIBILITY_HEADER_COLORS: Record<DocumentVisibility, string> = {
  public: 'bg-green-500 text-white',
  auto_approved: 'bg-blue-500 text-white',
  manual_approval: 'bg-orange-500 text-white',
};

export function DocumentVisibilityManager({
  documents,
  onDocumentsChange,
  onDocumentRemove,
  onDocumentClick,
  disabled = false,
  defaultExpanded = true,
}: DocumentVisibilityManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverVisibility, setDragOverVisibility] = useState<DocumentVisibility | null>(null);

  // Group documents by visibility
  const documentsByVisibility = VISIBILITY_ORDER.reduce((acc, visibility) => {
    acc[visibility] = documents.filter(doc => doc.visibility === visibility);
    return acc;
  }, {} as Record<DocumentVisibility, PropertyDocument[]>);

  const handleDragStart = useCallback((e: React.DragEvent, docId: string) => {
    if (disabled) return;
    setDraggedDocId(docId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', docId);
  }, [disabled]);

  const handleDragEnd = useCallback(() => {
    setDraggedDocId(null);
    setDragOverVisibility(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, visibility: DocumentVisibility) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverVisibility(visibility);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setDragOverVisibility(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetVisibility: DocumentVisibility) => {
    if (disabled) return;
    e.preventDefault();
    const docId = e.dataTransfer.getData('text/plain');

    if (docId) {
      const updatedDocuments = documents.map(doc =>
        doc.id === docId ? { ...doc, visibility: targetVisibility } : doc
      );
      onDocumentsChange(updatedDocuments);
    }

    setDraggedDocId(null);
    setDragOverVisibility(null);
  }, [disabled, documents, onDocumentsChange]);

  const handleRemoveDocument = useCallback((docId: string) => {
    if (onDocumentRemove) {
      onDocumentRemove(docId);
    } else {
      const updatedDocuments = documents.filter(doc => doc.id !== docId);
      onDocumentsChange(updatedDocuments);
    }
  }, [documents, onDocumentsChange, onDocumentRemove]);

  const getCategoryLabel = (category: string) => {
    return DOCUMENT_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-gray-700" />
          <span className="text-lg font-semibold text-gray-900">Dokumenten-Freigabe</span>
          <span className="text-sm text-gray-500 font-normal">
            ({documents.length} {documents.length === 1 ? 'Datei' : 'Dateien'})
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-500 mb-4">
            Ziehe Dokumente zwischen den Bereichen, um die Freigabe anzupassen.
          </p>

          {VISIBILITY_ORDER.map((visibility, sectionIndex) => {
            const docs = documentsByVisibility[visibility];
            const isDropTarget = dragOverVisibility === visibility;
            const colors = VISIBILITY_COLORS[visibility];

            return (
              <div
                key={visibility}
                onDragOver={(e) => handleDragOver(e, visibility)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, visibility)}
                className={`transition-colors ${isDropTarget ? colors.bg : ''} ${
                  sectionIndex > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''
                }`}
              >
                {/* Section title */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={colors.text}>
                    {VISIBILITY_ICONS[visibility]}
                  </span>
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {VISIBILITY_LABELS[visibility]}
                  </span>
                  <span className="text-xs text-gray-400">({docs.length})</span>
                </div>

                {/* Documents list */}
                <div className="min-h-[40px]">
                  {docs.length === 0 ? (
                    <div className="flex items-center h-[40px] text-gray-400 text-sm pl-6">
                      Dokumente hierher ziehen
                    </div>
                  ) : (
                    docs.map((doc) => (
                      <div
                        key={doc.id}
                        draggable={!disabled}
                        onDragStart={(e) => handleDragStart(e, doc.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onDocumentClick?.(doc)}
                        className={`flex items-center gap-3 py-2 pl-2 pr-2 rounded-lg transition-all ${
                          draggedDocId === doc.id
                            ? 'opacity-50 bg-gray-100'
                            : 'hover:bg-gray-50'
                        } ${disabled ? 'cursor-default' : onDocumentClick ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                      >
                        {/* Drag handle */}
                        {!disabled && (
                          <GripVertical size={20} className="text-gray-500 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                        )}

                        {/* Thumbnail or icon */}
                        {doc.thumbnailUrl ? (
                          <img
                            src={doc.thumbnailUrl}
                            alt={doc.filename}
                            className="w-9 h-9 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-gray-400" />
                          </div>
                        )}

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {truncateFilename(doc.filename, 10)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getCategoryLabel(doc.category)}
                          </p>
                        </div>

                        {/* Remove button */}
                        {!disabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocument(doc.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Dokument entfernen"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

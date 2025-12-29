'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2, Check, Pencil } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SellerKnowledgeManagerProps {
  propertyId: string;
  defaultExpanded?: boolean;
}

const MAX_PREVIEW_LENGTH = 150;

export function SellerKnowledgeManager({
  propertyId,
  defaultExpanded = false,
}: SellerKnowledgeManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  const utils = trpc.useUtils();

  // Fetch current notes
  const { data, isLoading } = trpc.sellerKnowledge.get.useQuery(
    { propertyId },
    { enabled: !!propertyId }
  );

  // Update mutation
  const updateMutation = trpc.sellerKnowledge.update.useMutation({
    onSuccess: () => {
      utils.sellerKnowledge.get.invalidate({ propertyId });
      setIsEditing(false);
    },
  });

  const notes = data?.notes || '';
  const hasContent = notes.trim().length > 0;
  const isLongText = notes.length > MAX_PREVIEW_LENGTH;
  const displayText = isTextExpanded || !isLongText
    ? notes
    : notes.substring(0, MAX_PREVIEW_LENGTH) + '...';

  const handleStartEdit = () => {
    setEditedNotes(notes);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedNotes('');
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate({ propertyId, notes: editedNotes });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KI-Wissensbasis</h3>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {/* Description */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-300">
              Informationen fuer den KI-Assistenten. Wird auch automatisch aus Chat-Antworten ergaenzt.
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500 mx-auto" />
            </div>
          ) : isEditing ? (
            /* Edit Mode */
            <div className="p-4">
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y text-gray-700 dark:text-gray-200"
                placeholder="z.B. Die Tiefgarage wird 2025 saniert (Sonderumlage 10.000 EUR). Die Heizung wurde 2020 erneuert. Das Bad ist original von 1995..."
                maxLength={50000}
                autoFocus
              />
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editedNotes.length.toLocaleString('de-DE')} / 50.000 Zeichen
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Speichern
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="p-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 relative">
                {!hasContent && (
                  <div className="text-gray-400 dark:text-gray-500 italic">
                    Noch keine Informationen hinterlegt.
                  </div>
                )}
                {hasContent && (
                  <div className="pr-24">
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {displayText}
                    </div>
                    {isLongText && (
                      <button
                        onClick={() => setIsTextExpanded(!isTextExpanded)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm mt-2"
                      >
                        {isTextExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={handleStartEdit}
                  className="absolute top-2 right-2 flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                  Bearbeiten
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

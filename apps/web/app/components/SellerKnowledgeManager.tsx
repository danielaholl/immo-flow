'use client';

import { useState } from 'react';
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SellerKnowledgeManagerProps {
  propertyId: string;
  defaultExpanded?: boolean;
}

// Knowledge entry type
interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  sourceType: string | null;
  sourceMessageId: string | null;
  category: string | null;
  isActive: boolean | null;
  confidenceScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Category labels in German
const CATEGORY_LABELS: Record<string, string> = {
  costs: 'Kosten',
  renovation: 'Renovierung',
  legal: 'Rechtliches',
  technical: 'Technisch',
  neighborhood: 'Umgebung',
  amenities: 'Ausstattung',
  other: 'Sonstiges',
};

const CATEGORY_COLORS: Record<string, string> = {
  costs: 'bg-green-100 text-green-800',
  renovation: 'bg-yellow-100 text-yellow-800',
  legal: 'bg-purple-100 text-purple-800',
  technical: 'bg-blue-100 text-blue-800',
  neighborhood: 'bg-orange-100 text-orange-800',
  amenities: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export function SellerKnowledgeManager({
  propertyId,
  defaultExpanded = false,
}: SellerKnowledgeManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ topic: '', content: '', category: '' });

  const utils = trpc.useUtils();

  // Fetch knowledge entries
  const { data: entries, isLoading } = trpc.sellerKnowledge.getByProperty.useQuery({
    propertyId,
    includeInactive: true,
  });

  // Mutations
  const createMutation = trpc.sellerKnowledge.create.useMutation({
    onSuccess: () => {
      utils.sellerKnowledge.getByProperty.invalidate({ propertyId });
      setShowAddModal(false);
    },
  });

  const updateMutation = trpc.sellerKnowledge.update.useMutation({
    onSuccess: () => {
      utils.sellerKnowledge.getByProperty.invalidate({ propertyId });
      setEditingEntry(null);
    },
  });

  const deleteMutation = trpc.sellerKnowledge.delete.useMutation({
    onSuccess: () => {
      utils.sellerKnowledge.getByProperty.invalidate({ propertyId });
    },
  });

  const toggleActiveMutation = trpc.sellerKnowledge.toggleActive.useMutation({
    onSuccess: () => {
      utils.sellerKnowledge.getByProperty.invalidate({ propertyId });
    },
  });

  const activeCount = entries?.filter((e: KnowledgeEntry) => e.isActive).length || 0;
  const learnedCount = entries?.filter((e: KnowledgeEntry) => e.sourceType === 'chat_learned').length || 0;

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry.id);
    setEditForm({
      topic: entry.topic,
      content: entry.content,
      category: entry.category || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    updateMutation.mutate({
      id: editingEntry,
      topic: editForm.topic,
      content: editForm.content,
      category: editForm.category as any || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Diesen Eintrag wirklich loeschen?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">KI-Wissensbasis</h3>
          {learnedCount > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {learnedCount} gelernt
            </span>
          )}
          <span className="text-sm text-gray-500 font-normal">
            ({activeCount} aktiv)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-500" />
        ) : (
          <ChevronDown size={20} className="text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Description */}
          <div className="p-4 bg-purple-50 border-b border-purple-100">
            <p className="text-sm text-purple-800">
              Hier koennen Sie Informationen speichern, die der KI-Assistent bei Anfragen zu diesem
              Objekt nutzt. Die KI lernt auch automatisch aus Ihren Chat-Antworten.
            </p>
          </div>

          {/* Add Button */}
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={18} />
              <span>Neue Information hinzufuegen</span>
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-gray-400 mx-auto" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && entries?.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Brain size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Noch keine Informationen gespeichert.</p>
              <p className="text-sm mt-1">
                Fuegen Sie wichtige Details hinzu oder antworten Sie auf Kaeufer-Fragen im Chat.
              </p>
            </div>
          )}

          {/* Entry List */}
          {entries && entries.length > 0 && (
            <div className="divide-y divide-gray-100">
              {(entries as KnowledgeEntry[]).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 ${!entry.isActive ? 'bg-gray-50 opacity-60' : ''}`}
                >
                  {editingEntry === entry.id ? (
                    /* Edit Mode */
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.topic}
                        onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Thema"
                      />
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        placeholder="Information"
                      />
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Kategorie waehlen...</option>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {updateMutation.isPending ? 'Speichern...' : 'Speichern'}
                        </button>
                        <button
                          onClick={() => setEditingEntry(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Source Icon */}
                          {entry.sourceType === 'chat_learned' ? (
                            <Bot size={16} className="text-purple-500 flex-shrink-0" />
                          ) : (
                            <User size={16} className="text-gray-400 flex-shrink-0" />
                          )}
                          {/* Topic */}
                          <span className="font-medium text-gray-900 truncate">
                            {entry.topic}
                          </span>
                          {/* Category Badge */}
                          {entry.category && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other
                              }`}
                            >
                              {CATEGORY_LABELS[entry.category] || entry.category}
                            </span>
                          )}
                          {/* Confidence */}
                          {entry.sourceType === 'chat_learned' && entry.confidenceScore && (
                            <span className="text-xs text-gray-400">
                              ({Math.round(entry.confidenceScore * 100)}%)
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{entry.content}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Toggle Active */}
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: entry.id,
                              isActive: !entry.isActive,
                            })
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title={entry.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {entry.isActive ? (
                            <ToggleRight size={20} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil size={18} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Loeschen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddKnowledgeModal
          propertyId={propertyId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            utils.sellerKnowledge.getByProperty.invalidate({ propertyId });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Inline Add Modal Component
function AddKnowledgeModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  const createMutation = trpc.sellerKnowledge.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!topic.trim() || !content.trim()) {
      setError('Thema und Information sind Pflichtfelder');
      return;
    }

    createMutation.mutate({
      propertyId,
      topic: topic.trim(),
      content: content.trim(),
      category: category as any || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Neue Information hinzufuegen</h2>
          <p className="text-sm text-gray-500 mt-1">
            Diese Information wird der KI als Kontext fuer Anfragen bereitgestellt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thema *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="z.B. Tiefgaragensanierung"
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Information *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              placeholder="Beschreiben Sie die Details..."
              maxLength={10000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Kategorie waehlen (optional)</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

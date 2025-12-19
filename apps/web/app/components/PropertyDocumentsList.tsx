'use client';

import { useState, useEffect } from 'react';
import { FileText, Layout, Zap, File, ChevronRight, ChevronDown, Loader2, Lock, LockOpen, FileCheck, MapPin, BookOpen, Eye, Clock, UserCheck } from 'lucide-react';
import type { PropertyDocument, DocumentCategory, DocumentVisibility } from '../create-listing/types';
import { truncateFilename } from '../create-listing/utils/documentUtils';

// Visibility configuration for owner grouping
const VISIBILITY_ORDER: DocumentVisibility[] = ['public', 'auto_approved', 'manual_approval'];

const VISIBILITY_CONFIG: Record<DocumentVisibility, { label: string; color: string; icon: React.ReactNode }> = {
  public: { label: 'Öffentlich', color: 'text-green-600', icon: <Eye size={14} /> },
  auto_approved: { label: 'Automatisch freigeben', color: 'text-blue-600', icon: <Clock size={14} /> },
  manual_approval: { label: 'Manuell freigeben', color: 'text-orange-600', icon: <UserCheck size={14} /> },
};
import { trpc } from '@/lib/trpc';

interface PropertyDocumentsListProps {
  /** Pre-loaded documents (optional - for backwards compatibility) */
  documents?: PropertyDocument[];
  /** Property ID for lazy loading documents */
  propertyId?: string;
  /** Number of documents (from DB) - used to decide if lazy loading is needed */
  documentsCount?: number;
  onDocumentClick: (document: PropertyDocument) => void;
  selectedDocumentId?: string;
  defaultExpanded?: boolean;
  /** Whether user has access to auto_approved documents (after consent) */
  hasDocumentAccess?: boolean;
  /** Whether user has access to manual_approval documents (after owner approval) */
  hasManualApproval?: boolean;
  /** Whether the current user is the property owner */
  isOwner?: boolean;
  /** Callback when access is granted */
  onAccessGranted?: () => void;
  /** Callback when user clicks lock icon to request document access */
  onRequestDocumentAccess?: () => void;
  /** Number of users waiting for manual document approval (owner only) */
  pendingManualApprovalCount?: number;
  /** Callback to approve manual documents for all pending users (owner only) */
  onApproveManualDocs?: () => void;
}

const categoryIcons: Record<DocumentCategory, React.ReactNode> = {
  grundriss: <Layout size={18} className="text-blue-500" />,
  energieausweis: <Zap size={18} className="text-green-500" />,
  expose: <FileText size={18} className="text-purple-500" />,
  lageplan: <MapPin size={18} className="text-indigo-500" />,
  sonstiges: <File size={18} className="text-gray-500" />,
  etw_protokoll: <FileCheck size={18} className="text-blue-500" />,
  mietvertrag: <FileCheck size={18} className="text-orange-500" />,
  kaufvertrag: <FileCheck size={18} className="text-orange-500" />,
  grundbuchauszug: <BookOpen size={18} className="text-orange-500" />,
};

const categoryLabels: Record<DocumentCategory, string> = {
  grundriss: 'Grundriss',
  energieausweis: 'Energieausweis',
  expose: 'Exposé',
  lageplan: 'Lageplan',
  sonstiges: 'Sonstiges',
  etw_protokoll: 'ETW Protokoll',
  mietvertrag: 'Mietvertrag',
  kaufvertrag: 'Kaufvertrag',
  grundbuchauszug: 'Grundbuchauszug',
};

export function PropertyDocumentsList({
  documents: preloadedDocuments,
  propertyId,
  documentsCount = 0,
  onDocumentClick,
  selectedDocumentId,
  defaultExpanded = false,
  hasDocumentAccess = false,
  hasManualApproval = false,
  isOwner = false,
  onAccessGranted,
  onRequestDocumentAccess,
  pendingManualApprovalCount = 0,
  onApproveManualDocs,
}: PropertyDocumentsListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [shouldFetch, setShouldFetch] = useState(false);

  // Reset shouldFetch when propertyId changes
  useEffect(() => {
    setShouldFetch(false);
  }, [propertyId]);

  // Delay the fetch to let important content load first
  // Only fetch if documentsCount > 0 (we know there are documents to load)
  useEffect(() => {
    if (propertyId && !preloadedDocuments?.length && documentsCount > 0) {
      const timer = setTimeout(() => {
        setShouldFetch(true);
      }, 500); // 500ms delay to prioritize main content
      return () => clearTimeout(timer);
    }
  }, [propertyId, preloadedDocuments?.length, documentsCount]);

  // Lazy load documents if propertyId is provided and documentsCount > 0
  const { data: lazyDocuments, isLoading } = trpc.properties.getDocuments.useQuery(
    { propertyId: propertyId! },
    {
      enabled: shouldFetch && !!propertyId && !preloadedDocuments?.length && documentsCount > 0,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Use preloaded documents if available, otherwise use lazy-loaded ones
  const documents = preloadedDocuments?.length
    ? preloadedDocuments
    : (lazyDocuments as PropertyDocument[]) || [];

  const hasDocuments = documents && documents.length > 0;
  // Use loaded documents length, or fall back to documentsCount from DB
  const documentCount = documents?.length || documentsCount || 0;
  const isLoadingDocuments = isLoading && !preloadedDocuments?.length && documentsCount > 0;

  // Check if there are any protected documents (for showing lock icon in header)
  const hasProtectedDocuments = documents?.some(
    (doc) => doc.visibility === 'auto_approved' || doc.visibility === 'manual_approval'
  );

  // Check if user has full access to all documents
  const hasFullAccess = isOwner || (hasDocumentAccess && hasManualApproval);

  // Check if document is accessible based on visibility
  const isDocumentAccessible = (doc: PropertyDocument): boolean => {
    if (isOwner) return true;
    // Public documents are always accessible
    if (doc.visibility === 'public') return true;
    // Auto-approved documents are accessible after consent
    if (doc.visibility === 'auto_approved') return hasDocumentAccess;
    // Manual approval documents require explicit owner approval
    if (doc.visibility === 'manual_approval') return hasManualApproval;
    return false;
  };

  // Don't render if no documents exist (based on documentsCount from DB)
  if (documentCount === 0 && !isLoadingDocuments) {
    return null;
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header with separate clickable Lock and Accordion */}
      <div className="w-full p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Lock/Unlock indicator - clickable, before title */}
          {!isOwner && hasProtectedDocuments && !isLoadingDocuments && (
            hasFullAccess ? (
              <span
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-green-50 border border-green-200"
                title="Alle Unterlagen freigeschaltet"
              >
                <LockOpen size={20} className="text-green-600" />
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Trigger access flow first, then expand
                  onRequestDocumentAccess?.();
                  if (!isExpanded) setIsExpanded(true);
                }}
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 transition-all shadow-sm hover:shadow-md cursor-pointer"
                title="Unterlagen freischalten"
              >
                <Lock size={20} className="text-amber-600" />
              </button>
            )
          )}
          {/* Accordion trigger area */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <FileText size={20} className="text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Objektunterlagen</h3>
            {isLoadingDocuments ? (
              <Loader2 size={16} className="text-gray-400 animate-spin" />
            ) : (
              <span className="text-sm text-gray-500 font-normal">
                ({documentCount} {documentCount === 1 ? 'Datei' : 'Dateien'})
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronDown
            size={20}
            className={`text-gray-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Collapsible Content */}
      {isLoadingDocuments && isExpanded ? (
        <div className="px-6 pb-6">
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !hasDocuments ? (
        isExpanded && (
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-500">
              Keine Unterlagen vorhanden.
            </p>
          </div>
        )
      ) : isExpanded ? (
        <div className="px-6 pb-6">
          {isOwner ? (
            // OWNER: Gruppiert nach Sichtbarkeit
            <div className="space-y-4">
              {VISIBILITY_ORDER.map(visibility => {
                const config = VISIBILITY_CONFIG[visibility];
                const groupDocs = documents.filter(d => d.visibility === visibility);

                if (groupDocs.length === 0) return null;

                return (
                  <div key={visibility}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className={`text-xs uppercase tracking-wide font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">({groupDocs.length})</span>
                    </div>
                    <div className="space-y-2">
                      {groupDocs.map(doc => {
                        const thumbnailSrc = doc.thumbnailUrl || (doc.mimetype?.startsWith('image/') ? doc.url : null);
                        const fileType = doc.mimetype === 'application/pdf' ? 'PDF-Dokument' : 'Bild';

                        return (
                          <button
                            key={doc.id}
                            onClick={() => onDocumentClick(doc)}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                              selectedDocumentId === doc.id
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                              {thumbnailSrc ? (
                                <img src={thumbnailSrc} alt={doc.filename} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${
                                  selectedDocumentId === doc.id ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                  {categoryIcons[doc.category]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className={`text-sm font-medium ${
                                selectedDocumentId === doc.id ? 'text-white' : 'text-gray-900'
                              }`}>
                                {categoryLabels[doc.category]}
                              </p>
                              <p className={`text-xs ${
                                selectedDocumentId === doc.id ? 'text-gray-300' : 'text-gray-500'
                              }`}>
                                {fileType}
                              </p>
                            </div>
                            <ChevronRight size={16} className={
                              selectedDocumentId === doc.id ? 'text-white' : 'text-gray-400'
                            } />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // KÄUFER: Sortierte Liste (public → auto_approved → manual_approval)
            <div className="divide-y divide-gray-200">
              {[...documents]
                .sort((a, b) => {
                  const order = { public: 0, auto_approved: 1, manual_approval: 2 };
                  return (order[a.visibility] ?? 3) - (order[b.visibility] ?? 3);
                })
                .map(doc => {
                  const thumbnailSrc = doc.thumbnailUrl || (doc.mimetype?.startsWith('image/') ? doc.url : null);
                  const isAccessible = isDocumentAccessible(doc);

                  // Untertitel basierend auf Zugriffsstatus
                  const getAccessInfo = () => {
                    if (isAccessible) {
                      return { text: 'Verfügbar', color: 'text-green-600' };
                    }
                    if (doc.visibility === 'auto_approved') {
                      return { text: 'Wird nach Zustimmung freigegeben', color: 'text-blue-600' };
                    }
                    if (doc.visibility === 'manual_approval') {
                      return { text: 'Wird vom Anbieter freigeschaltet', color: 'text-orange-600' };
                    }
                    return { text: 'Nicht verfügbar', color: 'text-gray-500' };
                  };

                  const accessInfo = getAccessInfo();

                  return (
                    <button
                      key={doc.id}
                      onClick={() => isAccessible && onDocumentClick(doc)}
                      disabled={!isAccessible}
                      className={`w-full flex items-center gap-3 py-2 px-2 transition-all bg-white ${
                        !isAccessible
                          ? 'cursor-not-allowed opacity-75'
                          : selectedDocumentId === doc.id
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-12 h-12 overflow-hidden flex-shrink-0">
                        {thumbnailSrc && isAccessible ? (
                          <img src={thumbnailSrc} alt={doc.filename} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            {!isAccessible ? (
                              <Lock size={24} className="text-gray-400" />
                            ) : (
                              categoryIcons[doc.category]
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-medium ${
                          !isAccessible ? 'text-gray-500' : 'text-gray-900'
                        }`}>
                          {isAccessible ? truncateFilename(doc.filename.replace(/\.[^/.]+$/, ''), 10) : categoryLabels[doc.category]}
                        </p>
                        <p className={`text-xs ${accessInfo.color}`}>
                          {accessInfo.text}
                        </p>
                      </div>
                      {isAccessible && (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

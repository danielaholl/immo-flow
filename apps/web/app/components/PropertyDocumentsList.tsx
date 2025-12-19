'use client';

import { useState, useEffect } from 'react';
import { FileText, Layout, Zap, File, ChevronRight, ChevronDown, Loader2, Lock, FileCheck, Eye, Clock, MapPin, BookOpen } from 'lucide-react';
import type { PropertyDocument, DocumentCategory, DocumentVisibility } from '../create-listing/types';
import { truncateFilename } from '../create-listing/utils/documentUtils';
import { VISIBILITY_LABELS } from '../create-listing/types';
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

// Visibility icons for document access status
const visibilityIcons: Record<DocumentVisibility, React.ReactNode> = {
  public: <Eye size={12} className="text-green-600" />,
  auto_approved: <Clock size={12} className="text-blue-600" />,
  manual_approval: <Lock size={12} className="text-orange-600" />,
};

const visibilityColors: Record<DocumentVisibility, string> = {
  public: 'text-green-600',
  auto_approved: 'text-blue-600',
  manual_approval: 'text-orange-600',
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

  // Group documents by visibility (not category)
  const visibilityGroups: { key: DocumentVisibility; label: string; color: string; docs: PropertyDocument[] }[] = hasDocuments
    ? [
        {
          key: 'public',
          label: 'Öffentlich',
          color: 'text-green-600',
          docs: documents.filter(d => d.visibility === 'public'),
        },
        {
          key: 'auto_approved',
          label: 'Automatisch freigeben',
          color: 'text-blue-600',
          docs: documents.filter(d => d.visibility === 'auto_approved'),
        },
        {
          key: 'manual_approval',
          label: 'Nur manuell freigeben',
          color: 'text-orange-600',
          docs: documents.filter(d => d.visibility === 'manual_approval'),
        },
      ]
    : [];

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

  // Check if document requires access request (not public)
  const requiresAccessRequest = (doc: PropertyDocument): boolean => {
    return doc.visibility !== 'public';
  };

  // Count non-public documents
  const nonPublicDocsCount = documents?.filter(doc => doc.visibility !== 'public').length || 0;
  const hasNonPublicDocs = nonPublicDocsCount > 0;

  // Don't render if no documents exist (based on documentsCount from DB)
  if (documentCount === 0 && !isLoadingDocuments) {
    return null;
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Clickable Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Objektunterlagen</h3>
          {isLoadingDocuments ? (
            <Loader2 size={16} className="text-gray-400 animate-spin" />
          ) : (
            <span className="text-sm text-gray-500 font-normal">
              ({documentCount} {documentCount === 1 ? 'Datei' : 'Dateien'})
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

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
        <div className="px-6 pb-6 space-y-2">
          {isOwner ? (
            // VERKÄUFER: Gruppiert nach Sichtbarkeit
            <div className="space-y-4">
              {visibilityGroups.map(group => {
                if (group.docs.length === 0) return null;

                return (
                  <div key={group.key}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs uppercase tracking-wide font-medium ${group.color}`}>
                        {group.label}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.docs.map(doc => {
                        const thumbnailSrc = doc.thumbnailUrl || (doc.mimetype?.startsWith('image/') ? doc.url : null);
                        const isAccessible = isDocumentAccessible(doc);

                        return (
                          <button
                            key={doc.id}
                            onClick={() => isAccessible && onDocumentClick(doc)}
                            disabled={!isAccessible}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                              !isAccessible
                                ? 'bg-gray-50 cursor-not-allowed opacity-75'
                                : selectedDocumentId === doc.id
                                  ? 'bg-gray-900 text-white'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            {/* Thumbnail Preview or Lock Icon */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                              {!isAccessible ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <Lock size={20} className="text-gray-400" />
                                </div>
                              ) : thumbnailSrc ? (
                                <img
                                  src={thumbnailSrc}
                                  alt={doc.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${
                                  selectedDocumentId === doc.id ? 'bg-gray-700' : 'bg-gray-200'
                                }`}>
                                  {categoryIcons[doc.category]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-sm font-medium ${
                                  !isAccessible
                                    ? 'text-gray-500'
                                    : selectedDocumentId === doc.id
                                      ? 'text-white'
                                      : 'text-gray-900'
                                }`}>
                                  {truncateFilename(doc.filename, 10)}
                                </p>
                                <span className={`text-xs ${
                                  selectedDocumentId === doc.id ? 'text-gray-300' : 'text-gray-400'
                                }`}>
                                  ({categoryLabels[doc.category]})
                                </span>
                              </div>
                              <p className={`text-xs ${
                                !isAccessible
                                  ? 'text-gray-400'
                                  : selectedDocumentId === doc.id
                                    ? 'text-gray-300'
                                    : 'text-gray-500'
                              }`}>
                                {doc.mimetype === 'application/pdf' ? 'PDF-Dokument' : 'Bild'}
                              </p>
                            </div>
                            {isAccessible ? (
                              <ChevronRight size={16} className={
                                selectedDocumentId === doc.id ? 'text-white' : 'text-gray-400'
                              } />
                            ) : (
                              <Lock size={16} className="text-gray-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // KÄUFER: Flache Liste mit Lock-Icons (keine Gruppierung)
            documents.map(doc => {
              const thumbnailSrc = doc.thumbnailUrl || (doc.mimetype?.startsWith('image/') ? doc.url : null);
              const isAccessible = isDocumentAccessible(doc);

              return (
                <button
                  key={doc.id}
                  onClick={() => isAccessible && onDocumentClick(doc)}
                  disabled={!isAccessible}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                    !isAccessible
                      ? 'bg-gray-50 cursor-not-allowed opacity-75'
                      : selectedDocumentId === doc.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Thumbnail Preview or Lock Icon */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    {!isAccessible ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Lock size={20} className="text-gray-400" />
                      </div>
                    ) : thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={doc.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${
                        selectedDocumentId === doc.id ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        {categoryIcons[doc.category]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium ${
                        !isAccessible
                          ? 'text-gray-500'
                          : selectedDocumentId === doc.id
                            ? 'text-white'
                            : 'text-gray-900'
                      }`}>
                        {truncateFilename(doc.filename, 10)}
                      </p>
                      <span className={`text-xs ${
                        selectedDocumentId === doc.id ? 'text-gray-300' : 'text-gray-400'
                      }`}>
                        ({categoryLabels[doc.category]})
                      </span>
                    </div>
                    <p className={`text-xs ${
                      !isAccessible
                        ? 'text-gray-400'
                        : selectedDocumentId === doc.id
                          ? 'text-gray-300'
                          : 'text-gray-500'
                    }`}>
                      {doc.mimetype === 'application/pdf' ? 'PDF-Dokument' : 'Bild'}
                    </p>
                  </div>
                  {isAccessible ? (
                    <ChevronRight size={16} className={
                      selectedDocumentId === doc.id ? 'text-white' : 'text-gray-400'
                    } />
                  ) : (
                    <Lock size={16} className="text-gray-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

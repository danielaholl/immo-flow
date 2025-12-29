'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Image from 'next/image';
import { FileText, Layout, Zap, File, ChevronRight, ChevronDown, ChevronUp, Loader2, Lock, LockOpen, FileCheck, MapPin, BookOpen, Eye, Clock, UserCheck } from 'lucide-react';
import type { PropertyDocument, DocumentCategory, DocumentVisibility } from '../create-listing/types';
import { truncateFilename } from '../create-listing/utils/documentUtils';

// Hook to check if screen is mobile (below lg breakpoint)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

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
  onDocumentClick: (document: PropertyDocument | null) => void;
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
  const isMobile = useIsMobile();

  // Handle document click - on mobile, open in new tab; on desktop, use callback with toggle
  const handleDocumentClick = useCallback((doc: PropertyDocument) => {
    if (isMobile) {
      // On mobile, open document URL in new tab
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } else {
      // On desktop: Toggle - if already selected, close; otherwise show
      if (selectedDocumentId === doc.id) {
        onDocumentClick(null);
      } else {
        onDocumentClick(doc);
      }
    }
  }, [isMobile, onDocumentClick, selectedDocumentId]);

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
    <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
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
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRequestDocumentAccess?.();
                  if (!isExpanded) setIsExpanded(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onRequestDocumentAccess?.();
                    if (!isExpanded) setIsExpanded(true);
                  }
                }}
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 transition-all shadow-sm hover:shadow-md cursor-pointer"
                title="Unterlagen freischalten"
              >
                <Lock size={20} className="text-amber-600" />
              </span>
            )
          )}
          <FileText size={20} className="text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objektunterlagen</h3>
          {isLoadingDocuments ? (
            <Loader2 size={16} className="text-gray-400 animate-spin" />
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
              <span className="lg:hidden">({documentCount})</span>
              <span className="hidden lg:inline">({documentCount} {documentCount === 1 ? 'Datei' : 'Dateien'})</span>
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {isLoadingDocuments && isExpanded ? (
        <div className="px-6 pb-6">
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !hasDocuments ? (
        isExpanded && (
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keine Unterlagen vorhanden.
            </p>
          </div>
        )
      ) : isExpanded ? (
        <div className="px-6 pb-6">
          {/* Einheitliches Design für Owner und Käufer - flache Liste */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
                  if (isOwner) {
                    // Für Owner: Sichtbarkeit anzeigen
                    const config = VISIBILITY_CONFIG[doc.visibility];
                    return { text: config.label, color: config.color };
                  }
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
                const isSelected = selectedDocumentId === doc.id;

                return (
                  <button
                    key={doc.id}
                    onClick={() => isAccessible && handleDocumentClick(doc)}
                    disabled={!isAccessible}
                    className={`w-full flex items-center gap-3 py-2 px-2 transition-all ${
                      !isAccessible
                        ? 'cursor-not-allowed opacity-75 bg-white dark:bg-gray-900'
                        : isSelected
                          ? 'bg-gray-900 dark:bg-gray-700'
                          : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="w-12 h-12 overflow-hidden flex-shrink-0 relative">
                      {thumbnailSrc && isAccessible ? (
                        <Image src={thumbnailSrc} alt={doc.filename} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'bg-gray-800 dark:bg-gray-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
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
                        !isAccessible ? 'text-gray-500 dark:text-gray-400' : isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}>
                        {isAccessible ? truncateFilename(doc.filename.replace(/\.[^/.]+$/, ''), 10) : categoryLabels[doc.category]}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-gray-300' : accessInfo.color}`}>
                        {accessInfo.text}
                      </p>
                    </div>
                    {isAccessible && (
                      <ChevronRight size={16} className={isSelected ? 'text-white' : 'text-gray-400'} />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

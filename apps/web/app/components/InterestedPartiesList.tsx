'use client';

import { useState } from 'react';
import { User, Mail, Phone, Clock, Check, X, Loader2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { DocumentAccessRequest } from '@/app/types/document-access';

interface InterestedPartiesListProps {
  propertyId: string;
  defaultExpanded?: boolean;
}

export function InterestedPartiesList({ propertyId, defaultExpanded = true }: InterestedPartiesListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const utils = trpc.useUtils();

  const { data: requests, isLoading } = trpc.documentAccess.getAccessRequests.useQuery({
    propertyId
  });

  const { data: pendingCount } = trpc.documentAccess.getPendingRequestsCount.useQuery({
    propertyId
  });

  const respondMutation = trpc.documentAccess.respondToRequest.useMutation({
    onSuccess: () => {
      utils.documentAccess.getAccessRequests.invalidate();
      utils.documentAccess.getPendingRequestsCount.invalidate();
    }
  });

  const approveAllMutation = trpc.documentAccess.approveAllPending.useMutation({
    onSuccess: () => {
      utils.documentAccess.getAccessRequests.invalidate();
      utils.documentAccess.getPendingRequestsCount.invalidate();
    }
  });

  const approveManualDocsMutation = trpc.documentAccess.approveManualDocsForUser.useMutation({
    onSuccess: () => {
      utils.documentAccess.getAccessRequests.invalidate();
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingRequests = requests?.filter((r: DocumentAccessRequest) => r.status === 'pending') || [];
  const approvedRequests = requests?.filter((r: DocumentAccessRequest) => r.status === 'approved') || [];
  const deniedRequests = requests?.filter((r: DocumentAccessRequest) => r.status === 'denied') || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Interessenten</h3>
          {(pendingCount?.count ?? 0) > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount?.count} neu
            </span>
          )}
          <span className="text-sm text-gray-500 font-normal">
            ({requests?.length || 0} gesamt)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-500" />
        ) : (
          <ChevronDown size={20} className="text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <>
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <User size={48} className="mx-auto mb-2 text-gray-300" />
              <p>Noch keine Interessenten</p>
              <p className="text-sm mt-1">Interessenten erscheinen hier, wenn sie Zugriff auf geschützte Unterlagen anfordern.</p>
            </div>
          ) : (
            <>
              {/* Approve all button */}
              {pendingRequests.length > 1 && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => approveAllMutation.mutate({ propertyId })}
                    disabled={approveAllMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    {approveAllMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Alle {pendingRequests.length} Anfragen genehmigen
                  </button>
                </div>
              )}

              {/* Pending requests */}
              {pendingRequests.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                    Ausstehend ({pendingRequests.length})
                  </p>
                  <div className="space-y-2">
                    {pendingRequests.map((request: DocumentAccessRequest) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onRespond={(status) => respondMutation.mutate({ requestId: request.id, status })}
                        isPending={respondMutation.isPending}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Approved requests */}
              {approvedRequests.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                    Genehmigt ({approvedRequests.length})
                  </p>
                  <div className="space-y-2">
                    {approvedRequests.map((request: DocumentAccessRequest) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        formatDate={formatDate}
                        onApproveManualDocs={() => approveManualDocsMutation.mutate({ requestId: request.id })}
                        isApprovingManualDocs={approveManualDocsMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Denied requests */}
              {deniedRequests.length > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                    Abgelehnt ({deniedRequests.length})
                  </p>
                  <div className="space-y-2">
                    {deniedRequests.map((request: DocumentAccessRequest) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: DocumentAccessRequest;
  onRespond?: (status: 'approved' | 'denied') => void;
  isPending?: boolean;
  formatDate: (date: string) => string;
  onApproveManualDocs?: () => void;
  isApprovingManualDocs?: boolean;
}

function RequestCard({ request, onRespond, isPending, formatDate, onApproveManualDocs, isApprovingManualDocs }: RequestCardProps) {
  const fullName = [request.user_first_name, request.user_last_name].filter(Boolean).join(' ') || 'Unbekannt';
  const score = request.interest_score;

  // Score-Balken Farbe basierend auf Wert
  const getScoreColor = (s: number) => {
    if (s >= 7) return 'bg-green-500';
    if (s >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`p-3 rounded-xl border ${
      request.status === 'pending'
        ? 'bg-orange-50 border-orange-200'
        : request.status === 'approved'
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
    }`}>
      {/* Row 1: Name links, Score rechts */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <User size={14} className="text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">{fullName}</span>
        </div>
        {score !== null && score !== undefined && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreColor(score)} transition-all`}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">{score}/10</span>
          </div>
        )}
      </div>

      {/* Email */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Mail size={14} className="flex-shrink-0" />
        <a href={`mailto:${request.user_email}`} className="hover:text-gray-900 truncate">
          {request.user_email}
        </a>
      </div>

      {/* Phone */}
      {request.user_phone && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone size={14} className="flex-shrink-0" />
          <a href={`tel:${request.user_phone}`} className="hover:text-gray-900">
            {request.user_phone}
          </a>
        </div>
      )}

      {/* Row Bottom: Datum links, Buttons rechts */}
      <div className="flex items-center justify-between gap-2 mt-2">
        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} />
          <span>{formatDate(request.requested_at)}</span>
        </div>

        {/* Actions or Status */}
        {request.status === 'pending' && onRespond ? (
          <div className="flex gap-1">
            <button
              onClick={() => onRespond('approved')}
              disabled={isPending}
              className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              title="Genehmigen"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              onClick={() => onRespond('denied')}
              disabled={isPending}
              className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              title="Ablehnen"
            >
              <X size={14} />
            </button>
          </div>
        ) : request.status === 'denied' ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Abgelehnt
          </span>
        ) : request.status === 'approved' && onApproveManualDocs ? (
          request.manual_docs_approved ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Vollzugriff
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApproveManualDocs();
              }}
              disabled={isApprovingManualDocs}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              {isApprovingManualDocs ? (
                <Loader2 size={10} className="animate-spin inline" />
              ) : (
                'Freigeben'
              )}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

/**
 * Types for document access control system
 */

export type DocumentAccessStatus = 'pending' | 'approved' | 'denied';
export type DocumentReleaseMode = 'automatic' | 'manual';

export interface DocumentAccessRequest {
  id: string;
  property_id: string;
  user_id: string;
  status: DocumentAccessStatus;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  user_phone: string | null;
  requested_at: string;
  responded_at: string | null;
  broker_response_message: string | null;
  manual_docs_approved: boolean;
  interest_score: number | null;
  // Extended fields (joined from properties)
  property_title?: string;
}

export interface DocumentAccessStatusResult {
  hasAccess: boolean;
  status: DocumentAccessStatus | null;
  request: DocumentAccessRequest | null;
}

export interface RequestAccessResult {
  request: DocumentAccessRequest;
  isAutoApproved: boolean;
}

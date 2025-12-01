/**
 * Commission Consents API functions
 * Server-side functions for managing commission and data sharing consents
 */
import { supabase } from '@immoflow/database';

export interface CommissionConsent {
  id: string;
  user_id: string;
  property_id: string;
  commission_accepted: boolean | null;
  data_sharing_accepted: boolean | null;
  consent_given_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CommissionConsentInsert {
  user_id: string;
  property_id: string;
  commission_accepted: boolean;
  data_sharing_accepted: boolean;
  consent_given_at?: string;
}

/**
 * Check if user has given consent for a property
 */
export async function getConsent(
  userId: string,
  propertyId: string
): Promise<CommissionConsent | null> {
  const { data, error } = await supabase
    .from('commission_consents')
    .select('*')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching consent:', error);
    throw new Error(`Failed to fetch consent: ${error.message}`);
  }

  return data;
}

/**
 * Create or update consent for a property
 */
export async function upsertConsent(
  consent: CommissionConsentInsert
): Promise<CommissionConsent> {
  const { data, error } = await supabase
    .from('commission_consents')
    .upsert(
      {
        ...consent,
        consent_given_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,property_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting consent:', error);
    throw new Error(`Failed to save consent: ${error.message}`);
  }

  return data;
}

/**
 * Check if user has full consent (both commission and data sharing)
 */
export async function hasFullConsent(
  userId: string,
  propertyId: string
): Promise<boolean> {
  const consent = await getConsent(userId, propertyId);

  if (!consent) {
    return false;
  }

  return Boolean(consent.commission_accepted && consent.data_sharing_accepted);
}

/**
 * Remove consent for a property
 */
export async function removeConsent(
  userId: string,
  propertyId: string
): Promise<void> {
  const { error } = await supabase
    .from('commission_consents')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error removing consent:', error);
    throw new Error(`Failed to remove consent: ${error.message}`);
  }
}

/**
 * Get all consents for a user
 */
export async function getUserConsents(userId: string): Promise<CommissionConsent[]> {
  const { data, error } = await supabase
    .from('commission_consents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user consents:', error);
    throw new Error(`Failed to fetch user consents: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all consents for a property (for property owner)
 */
export async function getPropertyConsents(propertyId: string): Promise<CommissionConsent[]> {
  const { data, error } = await supabase
    .from('commission_consents')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching property consents:', error);
    throw new Error(`Failed to fetch property consents: ${error.message}`);
  }

  return data || [];
}

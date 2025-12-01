/**
 * User Profile API functions
 */
import { supabase } from '@immoflow/database';

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  global_address_consent: boolean | null;
  consent_given_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PropertyConsent {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string | null;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching user profile:', error);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data;
}

/**
 * Grant consent for a specific property
 */
export async function grantPropertyConsent(userId: string, propertyId: string): Promise<PropertyConsent> {
  const { data, error } = await supabase
    .from('property_consents')
    .insert({
      user_id: userId,
      property_id: propertyId,
    })
    .select()
    .single();

  if (error) {
    // If already exists, that's fine
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('property_consents')
        .select('*')
        .eq('user_id', userId)
        .eq('property_id', propertyId)
        .single();
      return existing as PropertyConsent;
    }
    console.error('Error granting property consent:', error);
    throw new Error(`Failed to grant property consent: ${error.message}`);
  }

  return data;
}

/**
 * Check if user has consent for a specific property
 */
export async function hasPropertyConsent(userId: string, propertyId: string): Promise<boolean> {
  // First check global consent
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('global_address_consent')
    .eq('user_id', userId)
    .single();

  if (profile?.global_address_consent) {
    return true;
  }

  // Then check specific property consent
  const { data, error } = await supabase
    .from('property_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false; // Not found
    }
    return false;
  }

  return !!data;
}

/**
 * Get all property IDs user has consented to
 */
export async function getUserPropertyConsents(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('property_consents')
    .select('property_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting user property consents:', error);
    return [];
  }

  return data?.map(c => c.property_id) ?? [];
}

/**
 * Grant global address consent for all properties
 */
export async function grantGlobalAddressConsent(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      global_address_consent: true,
      consent_given_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error granting global address consent:', error);
    throw new Error(`Failed to grant global address consent: ${error.message}`);
  }

  return data;
}

/**
 * Revoke global address consent
 */
export async function revokeGlobalAddressConsent(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      global_address_consent: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error revoking global address consent:', error);
    throw new Error(`Failed to revoke global address consent: ${error.message}`);
  }

  return data;
}

/**
 * Check if user has global address consent
 */
export async function hasGlobalAddressConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('global_address_consent')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false; // Not found
    }
    console.error('Error checking global address consent:', error);
    return false;
  }

  return data?.global_address_consent ?? false;
}

/**
 * Reset all consents (admin function)
 * Sets global_address_consent to false for all users and deletes all property_consents
 */
export async function resetAllConsents(): Promise<{ usersUpdated: number; consentsDeleted: number }> {
  // Delete all property consents
  const { data: deletedConsents, error: deleteError } = await supabase
    .from('property_consents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (workaround for no-condition delete)
    .select();

  if (deleteError) {
    console.error('Error deleting property consents:', deleteError);
  }

  // Set global_address_consent to false for all users
  const { data: updatedProfiles, error: updateError } = await supabase
    .from('user_profiles')
    .update({ global_address_consent: false })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all (workaround)
    .select();

  if (updateError) {
    console.error('Error updating user profiles:', updateError);
  }

  return {
    usersUpdated: updatedProfiles?.length ?? 0,
    consentsDeleted: deletedConsents?.length ?? 0,
  };
}

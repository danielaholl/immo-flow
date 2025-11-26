/**
 * Bookings API functions
 */
import { supabase, Booking, BookingInsert } from '@immoflow/database';

/**
 * Get all bookings for a user
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(*)')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching user bookings:', error);
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all bookings for a property
 */
export async function getPropertyBookings(propertyId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching property bookings:', error);
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new booking
 */
export async function createBooking(booking: BookingInsert): Promise<Booking> {
  // Check if the time slot is available
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('property_id', booking.property_id)
    .eq('date', booking.date)
    .single();

  if (existingBooking) {
    throw new Error('This time slot is already booked');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return data;
}

/**
 * Update a booking
 */
export async function updateBooking(
  id: string,
  updates: Partial<BookingInsert>
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating booking:', error);
    throw new Error(`Failed to update booking: ${error.message}`);
  }

  return data;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling booking:', error);
    throw new Error(`Failed to cancel booking: ${error.message}`);
  }
}

/**
 * Delete a booking
 */
export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);

  if (error) {
    console.error('Error deleting booking:', error);
    throw new Error(`Failed to delete booking: ${error.message}`);
  }
}

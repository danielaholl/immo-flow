/**
 * Validation schemas using Zod
 * Used for form validation, API requests, etc.
 */
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  phone: z.string().optional(),
});

// Property schemas
export const propertySchema = z.object({
  title: z.string().min(10, 'Titel muss mindestens 10 Zeichen lang sein'),
  description: z.string().min(50, 'Beschreibung muss mindestens 50 Zeichen lang sein'),
  location: z.string().min(3, 'Standort erforderlich'),
  price: z.number().positive('Preis muss positiv sein'),
  sqm: z.number().positive('Fläche muss positiv sein'),
  rooms: z.number().positive('Zimmeranzahl muss positiv sein'),
  images: z.array(z.string().url()).min(1, 'Mindestens 1 Bild erforderlich'),
  features: z.array(z.string()).optional(),
});

export const propertyFilterSchema = z.object({
  location: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minSqm: z.number().optional(),
  maxSqm: z.number().optional(),
  rooms: z.number().optional(),
  minYield: z.number().optional(),
  energyClass: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']).optional(),
});

// Booking schema
export const bookingSchema = z.object({
  propertyId: z.string().uuid(),
  date: z.date().min(new Date(), 'Datum muss in der Zukunft liegen'),
  message: z.string().optional(),
});

// Agent schema
export const agentSchema = z.object({
  name: z.string().min(2, 'Name erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().optional(),
  company: z.string().optional(),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(2, 'Suchbegriff muss mindestens 2 Zeichen lang sein'),
  filters: propertyFilterSchema.optional(),
});

// Message schema
export const messageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1, 'Nachricht darf nicht leer sein'),
  propertyId: z.string().uuid().optional(),
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type Property = z.infer<typeof propertySchema>;
export type PropertyFilter = z.infer<typeof propertyFilterSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Search = z.infer<typeof searchSchema>;
export type Message = z.infer<typeof messageSchema>;

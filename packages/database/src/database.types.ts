/**
 * Database type definitions
 * Generated from Supabase schema
 *
 * To regenerate: pnpm run generate-types (after setting up Supabase project)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          phone: string | null
          company: string | null
          rating: number | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          phone?: string | null
          company?: string | null
          rating?: number | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          rating?: number | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          agent_id: string | null
          title: string
          description: string | null
          location: string
          address: string | null
          price: number
          monthly_rent: number | null
          sqm: number
          rooms: number
          features: string[]
          images: string[]
          highlights: string[]
          red_flags: string[]
          ai_score: number | null
          yield: number | null
          energy_class: string | null
          available_from: string | null
          status: string
          views: number
          favorites_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          title: string
          description?: string | null
          location: string
          address?: string | null
          price: number
          monthly_rent?: number | null
          sqm: number
          rooms: number
          features?: string[]
          images?: string[]
          highlights?: string[]
          red_flags?: string[]
          ai_score?: number | null
          yield?: number | null
          energy_class?: string | null
          available_from?: string | null
          status?: string
          views?: number
          favorites_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          title?: string
          description?: string | null
          location?: string
          address?: string | null
          price?: number
          monthly_rent?: number | null
          sqm?: number
          rooms?: number
          features?: string[]
          images?: string[]
          highlights?: string[]
          red_flags?: string[]
          ai_score?: number | null
          yield?: number | null
          energy_class?: string | null
          available_from?: string | null
          status?: string
          views?: number
          favorites_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          property_id: string
          user_id: string
          date: string
          status: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          user_id: string
          date: string
          status?: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          user_id?: string
          date?: string
          status?: string
          message?: string | null
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          property_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

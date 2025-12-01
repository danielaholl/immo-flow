export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string | null
          date: string
          id: string
          message: string | null
          owner_id: string | null
          property_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          message?: string | null
          owner_id?: string | null
          property_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          message?: string | null
          owner_id?: string | null
          property_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_consents: {
        Row: {
          commission_accepted: boolean | null
          consent_given_at: string | null
          created_at: string | null
          data_sharing_accepted: boolean | null
          id: string
          property_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_accepted?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          data_sharing_accepted?: boolean | null
          id?: string
          property_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_accepted?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          data_sharing_accepted?: boolean | null
          id?: string
          property_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_consents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string | null
          ai_investment_score: number | null
          ai_score: number | null
          available_from: string | null
          commission_rate: number | null
          created_at: string | null
          description: string | null
          energy_class: string | null
          favorites_count: number | null
          features: string[] | null
          highlights: string[] | null
          id: string
          images: string[] | null
          location: string
          monthly_rent: number | null
          price: number
          red_flags: string[] | null
          require_address_consent: boolean | null
          rooms: number
          score_breakdown: Json | null
          score_calculated_at: string | null
          score_color: string | null
          seller_id: string | null
          sqm: number
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          views: number | null
          yield: number | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          ai_investment_score?: number | null
          ai_score?: number | null
          available_from?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          energy_class?: string | null
          favorites_count?: number | null
          features?: string[] | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          location: string
          monthly_rent?: number | null
          price: number
          red_flags?: string[] | null
          require_address_consent?: boolean | null
          rooms: number
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          score_color?: string | null
          seller_id?: string | null
          sqm: number
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
          yield?: number | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          ai_investment_score?: number | null
          ai_score?: number | null
          available_from?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          energy_class?: string | null
          favorites_count?: number | null
          features?: string[] | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          location?: string
          monthly_rent?: number | null
          price?: number
          red_flags?: string[] | null
          require_address_consent?: boolean | null
          rooms?: number
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          score_color?: string | null
          seller_id?: string | null
          sqm?: number
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
          yield?: number | null
        }
        Relationships: []
      }
      property_ai_evaluations: {
        Row: {
          ai_model: string | null
          ai_reasoning: string | null
          appreciation_score: number
          color_rating: string
          created_at: string | null
          estimated_monthly_rent: number | null
          estimated_yearly_rent: number | null
          evaluation_version: string | null
          features_score: number
          gross_yield_percentage: number | null
          id: string
          location_analysis: string | null
          location_score: number
          market_analysis: string | null
          overall_score: number
          price_per_sqm: number | null
          price_score: number
          property_id: string
          yield_score: number
        }
        Insert: {
          ai_model?: string | null
          ai_reasoning?: string | null
          appreciation_score: number
          color_rating: string
          created_at?: string | null
          estimated_monthly_rent?: number | null
          estimated_yearly_rent?: number | null
          evaluation_version?: string | null
          features_score: number
          gross_yield_percentage?: number | null
          id?: string
          location_analysis?: string | null
          location_score: number
          market_analysis?: string | null
          overall_score: number
          price_per_sqm?: number | null
          price_score: number
          property_id: string
          yield_score: number
        }
        Update: {
          ai_model?: string | null
          ai_reasoning?: string | null
          appreciation_score?: number
          color_rating?: string
          created_at?: string | null
          estimated_monthly_rent?: number | null
          estimated_yearly_rent?: number | null
          evaluation_version?: string | null
          features_score?: number
          gross_yield_percentage?: number | null
          id?: string
          location_analysis?: string | null
          location_score?: number
          market_analysis?: string | null
          overall_score?: number
          price_per_sqm?: number | null
          price_score?: number
          property_id?: string
          yield_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_ai_evaluations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_consents: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_consents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_interactions: {
        Row: {
          created_at: string | null
          dwell_time_seconds: number | null
          id: string
          interaction_type: string
          metadata: Json | null
          property_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dwell_time_seconds?: number | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          property_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dwell_time_seconds?: number | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          property_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_interactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string | null
          criteria: Json | null
          id: string
          last_searched_at: string | null
          query: string
          results_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          criteria?: Json | null
          id?: string
          last_searched_at?: string | null
          query: string
          results_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json | null
          id?: string
          last_searched_at?: string | null
          query?: string
          results_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          interaction_count: number | null
          last_updated: string | null
          preferred_features: Json | null
          preferred_locations: Json | null
          preferred_rooms: Json | null
          price_range: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_updated?: string | null
          preferred_features?: Json | null
          preferred_locations?: Json | null
          preferred_rooms?: Json | null
          price_range?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_updated?: string | null
          preferred_features?: Json | null
          preferred_locations?: Json | null
          preferred_rooms?: Json | null
          price_range?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          consent_given_at: string | null
          created_at: string
          first_name: string | null
          global_address_consent: boolean | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          consent_given_at?: string | null
          created_at?: string
          first_name?: string | null
          global_address_consent?: boolean | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          consent_given_at?: string | null
          created_at?: string
          first_name?: string | null
          global_address_consent?: boolean | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_preferences: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_latest_evaluation: {
        Args: { target_property_id: string }
        Returns: {
          ai_model: string | null
          ai_reasoning: string | null
          appreciation_score: number
          color_rating: string
          created_at: string | null
          estimated_monthly_rent: number | null
          estimated_yearly_rent: number | null
          evaluation_version: string | null
          features_score: number
          gross_yield_percentage: number | null
          id: string
          location_analysis: string | null
          location_score: number
          market_analysis: string | null
          overall_score: number
          price_per_sqm: number | null
          price_score: number
          property_id: string
          yield_score: number
        }
        SetofOptions: {
          from: "*"
          to: "property_ai_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      increment_property_views: {
        Args: { property_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

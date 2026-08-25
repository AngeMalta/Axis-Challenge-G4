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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      charger_queue: {
        Row: {
          charger_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          charger_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          charger_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charger_queue_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "chargers"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_reviews: {
        Row: {
          charger_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          charger_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          user_id: string
        }
        Update: {
          charger_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charger_reviews_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "chargers"
            referencedColumns: ["id"]
          },
        ]
      }
      chargers: {
        Row: {
          address: string | null
          amenities: string[]
          connector_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          model: string
          name: string
          opening_hours: string | null
          owner_id: string | null
          photos: string[]
          power_kw: number
          price_per_kwh: number
          price_per_minute: number
          status: Database["public"]["Enums"]["charger_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          connector_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          model?: string
          name: string
          opening_hours?: string | null
          owner_id?: string | null
          photos?: string[]
          power_kw?: number
          price_per_kwh?: number
          price_per_minute?: number
          status?: Database["public"]["Enums"]["charger_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          connector_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          model?: string
          name?: string
          opening_hours?: string | null
          owner_id?: string | null
          photos?: string[]
          power_kw?: number
          price_per_kwh?: number
          price_per_minute?: number
          status?: Database["public"]["Enums"]["charger_status"]
          updated_at?: string
        }
        Relationships: []
      }
      charging_sessions: {
        Row: {
          battery_percent: number
          charger_id: string
          cost: number
          created_at: string
          current_power_kw: number
          ended_at: string | null
          energy_kwh: number
          id: string
          minutes: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          target_kwh: number
          user_id: string
        }
        Insert: {
          battery_percent?: number
          charger_id: string
          cost?: number
          created_at?: string
          current_power_kw?: number
          ended_at?: string | null
          energy_kwh?: number
          id?: string
          minutes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          target_kwh?: number
          user_id: string
        }
        Update: {
          battery_percent?: number
          charger_id?: string
          cost?: number
          created_at?: string
          current_power_kw?: number
          ended_at?: string | null
          energy_kwh?: number
          id?: string
          minutes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          target_kwh?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charging_sessions_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "chargers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string
          id: string
          phone: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string
          id: string
          phone?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "merchant" | "driver" | "admin"
      charger_status: "available" | "occupied" | "offline" | "maintenance"
      session_status: "active" | "completed" | "cancelled"
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
    Enums: {
      app_role: ["merchant", "driver", "admin"],
      charger_status: ["available", "occupied", "offline", "maintenance"],
      session_status: ["active", "completed", "cancelled"],
    },
  },
} as const

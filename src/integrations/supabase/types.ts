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
      batch_uploads: {
        Row: {
          completed_images: number | null
          created_at: string | null
          id: string
          status: string | null
          total_images: number
          user_id: string
        }
        Insert: {
          completed_images?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          total_images: number
          user_id: string
        }
        Update: {
          completed_images?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          total_images?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          created_at: string | null
          default_style: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          restaurant_name: string | null
          secondary_color: string | null
          user_id: string
          watermark_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_style?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          restaurant_name?: string | null
          secondary_color?: string | null
          user_id: string
          watermark_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_style?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          restaurant_name?: string | null
          secondary_color?: string | null
          user_id?: string
          watermark_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_photos: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          photo_library_id: string
          style_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          photo_library_id: string
          style_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          photo_library_id?: string
          style_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_photos_photo_library_id_fkey"
            columns: ["photo_library_id"]
            isOneToOne: false
            referencedRelation: "photo_library"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_views: {
        Row: {
          id: string
          menu_id: string
          viewed_at: string | null
          source: string | null
          user_agent: string | null
          referrer: string | null
          country: string | null
          city: string | null
        }
        Insert: {
          id?: string
          menu_id: string
          viewed_at?: string | null
          source?: string | null
          user_agent?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
        }
        Update: {
          id?: string
          menu_id?: string
          viewed_at?: string | null
          source?: string | null
          user_agent?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_views_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string | null
          description: string | null
          dish_name: string
          enhanced_photo_id: string | null
          id: string
          menu_id: string
          position: number | null
          price: number | null
          section: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dish_name: string
          enhanced_photo_id?: string | null
          id?: string
          menu_id: string
          position?: number | null
          price?: number | null
          section?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dish_name?: string
          enhanced_photo_id?: string | null
          id?: string
          menu_id?: string
          position?: number | null
          price?: number | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_enhanced_photo_id_fkey"
            columns: ["enhanced_photo_id"]
            isOneToOne: false
            referencedRelation: "enhanced_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string | null
          id: string
          is_published: boolean | null
          name: string
          public_url: string | null
          template: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          public_url?: string | null
          template?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          public_url?: string | null
          template?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_library: {
        Row: {
          batch_id: string | null
          created_at: string | null
          dish_name: string | null
          id: string
          original_image_url: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          dish_name?: string | null
          id?: string
          original_image_url: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          dish_name?: string | null
          id?: string
          original_image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_library_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          restaurant_name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          restaurant_name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          restaurant_name?: string | null
        }
        Relationships: []
      }
      social_exports: {
        Row: {
          created_at: string | null
          dimensions: string
          enhanced_photo_id: string
          id: string
          image_url: string
          platform: string
        }
        Insert: {
          created_at?: string | null
          dimensions: string
          enhanced_photo_id: string
          id?: string
          image_url: string
          platform: string
        }
        Update: {
          created_at?: string | null
          dimensions?: string
          enhanced_photo_id?: string
          id?: string
          image_url?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_exports_enhanced_photo_id_fkey"
            columns: ["enhanced_photo_id"]
            isOneToOne: false
            referencedRelation: "enhanced_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          amount_paid: number
          created_at: string | null
          currency: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
          tokens_purchased: number
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          currency?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
          tokens_purchased: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          currency?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
          tokens_purchased?: number
          user_id?: string
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          photo_library_id: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          photo_library_id?: string | null
          tokens_used: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          photo_library_id?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_photo_library_id_fkey"
            columns: ["photo_library_id"]
            isOneToOne: false
            referencedRelation: "photo_library"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          created_at: string | null
          id: string
          tokens: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tokens?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tokens?: number
          updated_at?: string | null
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

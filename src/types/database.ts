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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anatomy_slots: {
        Row: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Insert: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Update: {
          anatomy?: Database["public"]["Enums"]["anatomy"]
          slot?: Database["public"]["Enums"]["part_slot"]
        }
        Relationships: []
      }
      beyblade_parts: {
        Row: {
          beyblade_id: string
          part_id: string
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Insert: {
          beyblade_id: string
          part_id: string
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Update: {
          beyblade_id?: string
          part_id?: string
          slot?: Database["public"]["Enums"]["part_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "beyblade_parts_beyblade_id_fkey"
            columns: ["beyblade_id"]
            isOneToOne: false
            referencedRelation: "beyblades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beyblade_parts_part_id_slot_fkey"
            columns: ["part_id", "slot"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id", "slot"]
          },
        ]
      }
      beyblades: {
        Row: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          bey_type: Database["public"]["Enums"]["bey_type"] | null
          brand: Database["public"]["Enums"]["brand"]
          created_at: string
          equivalent_id: string | null
          id: string
          image_path: string | null
          line: Database["public"]["Enums"]["product_line"]
          name: string
          notes: string | null
          rarity: Database["public"]["Enums"]["rarity"]
          release_code: string
          release_date: string | null
          release_type: Database["public"]["Enums"]["release_type"]
          source_url: string
          updated_at: string
        }
        Insert: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          bey_type?: Database["public"]["Enums"]["bey_type"] | null
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          equivalent_id?: string | null
          id?: string
          image_path?: string | null
          line: Database["public"]["Enums"]["product_line"]
          name: string
          notes?: string | null
          rarity?: Database["public"]["Enums"]["rarity"]
          release_code: string
          release_date?: string | null
          release_type: Database["public"]["Enums"]["release_type"]
          source_url: string
          updated_at?: string
        }
        Update: {
          anatomy?: Database["public"]["Enums"]["anatomy"]
          bey_type?: Database["public"]["Enums"]["bey_type"] | null
          brand?: Database["public"]["Enums"]["brand"]
          created_at?: string
          equivalent_id?: string | null
          id?: string
          image_path?: string | null
          line?: Database["public"]["Enums"]["product_line"]
          name?: string
          notes?: string | null
          rarity?: Database["public"]["Enums"]["rarity"]
          release_code?: string
          release_date?: string | null
          release_type?: Database["public"]["Enums"]["release_type"]
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beyblades_equivalent_id_fkey"
            columns: ["equivalent_id"]
            isOneToOne: false
            referencedRelation: "beyblades"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_parts: {
        Row: {
          combo_id: string
          part_id: string
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Insert: {
          combo_id: string
          part_id: string
          slot: Database["public"]["Enums"]["part_slot"]
        }
        Update: {
          combo_id?: string
          part_id?: string
          slot?: Database["public"]["Enums"]["part_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "combo_parts_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_parts_part_id_slot_fkey"
            columns: ["part_id", "slot"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id", "slot"]
          },
        ]
      }
      combo_shares: {
        Row: {
          combo_id: string
          created_at: string
          is_active: boolean
          slug: string
        }
        Insert: {
          combo_id: string
          created_at?: string
          is_active?: boolean
          slug?: string
        }
        Update: {
          combo_id?: string
          created_at?: string
          is_active?: boolean
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_shares_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: true
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          created_at: string
          id: string
          name: string
          notes: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          anatomy: Database["public"]["Enums"]["anatomy"]
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          anatomy?: Database["public"]["Enums"]["anatomy"]
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          beyblade_id: string
          created_at: string
          id: string
          profile_id: string
          quantity: number
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
        }
        Insert: {
          beyblade_id: string
          created_at?: string
          id?: string
          profile_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Update: {
          beyblade_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_beyblade_id_fkey"
            columns: ["beyblade_id"]
            isOneToOne: false
            referencedRelation: "beyblades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          attack: number
          brand: Database["public"]["Enums"]["brand"]
          burst_resistance: Database["public"]["Enums"]["resistance"] | null
          code: string | null
          contact_points: number | null
          created_at: string
          dash_performance: Database["public"]["Enums"]["resistance"] | null
          defense: number
          equivalent_id: string | null
          height_mm: number | null
          id: string
          image_path: string | null
          line: Database["public"]["Enums"]["product_line"]
          name: string
          notes: string | null
          part_type: Database["public"]["Enums"]["bey_type"] | null
          slot: Database["public"]["Enums"]["part_slot"]
          source_url: string
          spin_direction: Database["public"]["Enums"]["spin_direction"] | null
          stamina: number
          updated_at: string
          weight_g: number | null
        }
        Insert: {
          attack?: number
          brand?: Database["public"]["Enums"]["brand"]
          burst_resistance?: Database["public"]["Enums"]["resistance"] | null
          code?: string | null
          contact_points?: number | null
          created_at?: string
          dash_performance?: Database["public"]["Enums"]["resistance"] | null
          defense?: number
          equivalent_id?: string | null
          height_mm?: number | null
          id?: string
          image_path?: string | null
          line: Database["public"]["Enums"]["product_line"]
          name: string
          notes?: string | null
          part_type?: Database["public"]["Enums"]["bey_type"] | null
          slot: Database["public"]["Enums"]["part_slot"]
          source_url: string
          spin_direction?: Database["public"]["Enums"]["spin_direction"] | null
          stamina?: number
          updated_at?: string
          weight_g?: number | null
        }
        Update: {
          attack?: number
          brand?: Database["public"]["Enums"]["brand"]
          burst_resistance?: Database["public"]["Enums"]["resistance"] | null
          code?: string | null
          contact_points?: number | null
          created_at?: string
          dash_performance?: Database["public"]["Enums"]["resistance"] | null
          defense?: number
          equivalent_id?: string | null
          height_mm?: number | null
          id?: string
          image_path?: string | null
          line?: Database["public"]["Enums"]["product_line"]
          name?: string
          notes?: string | null
          part_type?: Database["public"]["Enums"]["bey_type"] | null
          slot?: Database["public"]["Enums"]["part_slot"]
          source_url?: string
          spin_direction?: Database["public"]["Enums"]["spin_direction"] | null
          stamina?: number
          updated_at?: string
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_equivalent_id_fkey"
            columns: ["equivalent_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_parts: {
        Row: {
          part_id: string | null
          profile_id: string | null
          quantity: number | null
          slot: Database["public"]["Enums"]["part_slot"] | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      gen_share_slug: { Args: never; Returns: string }
      get_shared_combo: {
        Args: { p_slug: string }
        Returns: {
          author_name: string
          combo_anatomy: Database["public"]["Enums"]["anatomy"]
          combo_name: string
          notes: string
          part_id: string
          slot: Database["public"]["Enums"]["part_slot"]
        }[]
      }
      revoke_combo_share: { Args: { p_combo_id: string }; Returns: undefined }
      save_combo: {
        Args: {
          p_anatomy: Database["public"]["Enums"]["anatomy"]
          p_name: string
          p_notes: string
          p_parts: Json
        }
        Returns: string
      }
      share_combo: { Args: { p_combo_id: string }; Returns: string }
      update_combo: {
        Args: {
          p_anatomy: Database["public"]["Enums"]["anatomy"]
          p_combo_id: string
          p_name: string
          p_notes: string
          p_parts: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      anatomy: "basic" | "unique" | "custom" | "custom_expand"
      bey_type: "attack" | "defense" | "stamina" | "balance"
      brand: "takara_tomy" | "hasbro"
      inventory_status: "owned" | "wishlist"
      part_slot:
        | "lock_chip"
        | "main_blade"
        | "metal_blade"
        | "over_blade"
        | "assist_blade"
        | "blade"
        | "ratchet"
        | "bit"
      product_line: "BX" | "UX" | "CX"
      rarity: "common" | "uncommon" | "rare" | "very_rare" | "exclusive"
      release_type:
        | "starter"
        | "booster"
        | "random_booster"
        | "deck_set"
        | "custom_set"
        | "limited"
        | "event_exclusive"
        | "other"
      resistance: "very_low" | "low" | "medium" | "high" | "very_high"
      spin_direction: "right" | "left" | "dual"
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
      anatomy: ["basic", "unique", "custom", "custom_expand"],
      bey_type: ["attack", "defense", "stamina", "balance"],
      brand: ["takara_tomy", "hasbro"],
      inventory_status: ["owned", "wishlist"],
      part_slot: [
        "lock_chip",
        "main_blade",
        "metal_blade",
        "over_blade",
        "assist_blade",
        "blade",
        "ratchet",
        "bit",
      ],
      product_line: ["BX", "UX", "CX"],
      rarity: ["common", "uncommon", "rare", "very_rare", "exclusive"],
      release_type: [
        "starter",
        "booster",
        "random_booster",
        "deck_set",
        "custom_set",
        "limited",
        "event_exclusive",
        "other",
      ],
      resistance: ["very_low", "low", "medium", "high", "very_high"],
      spin_direction: ["right", "left", "dual"],
    },
  },
} as const

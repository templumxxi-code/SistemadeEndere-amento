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
      aisles: {
        Row: {
          code: string
          created_at: string
          geometry: Json | null
          id: string
          name: string
          updated_at: string
          warehouse_id: string
          width_m: number
        }
        Insert: {
          code: string
          created_at?: string
          geometry?: Json | null
          id?: string
          name: string
          updated_at?: string
          warehouse_id: string
          width_m: number
        }
        Update: {
          code?: string
          created_at?: string
          geometry?: Json | null
          id?: string
          name?: string
          updated_at?: string
          warehouse_id?: string
          width_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "aisles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          calibrated_at: string | null
          created_at: string
          file_path: string
          file_type: string
          id: string
          image_height_px: number | null
          image_width_px: number | null
          name: string
          pixels_per_meter: number | null
          point_a: Json | null
          point_b: Json | null
          real_distance_m: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          calibrated_at?: string | null
          created_at?: string
          file_path: string
          file_type: string
          id?: string
          image_height_px?: number | null
          image_width_px?: number | null
          name: string
          pixels_per_meter?: number | null
          point_a?: Json | null
          point_b?: Json | null
          real_distance_m?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          calibrated_at?: string | null
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          image_height_px?: number | null
          image_width_px?: number | null
          name?: string
          pixels_per_meter?: number | null
          point_a?: Json | null
          point_b?: Json | null
          real_distance_m?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      map_zones: {
        Row: {
          created_at: string
          floor_plan_id: string
          geometry: Json
          height_m: number | null
          id: string
          name: string
          updated_at: string
          width_m: number | null
          zone_type: string
        }
        Insert: {
          created_at?: string
          floor_plan_id: string
          geometry: Json
          height_m?: number | null
          id?: string
          name: string
          updated_at?: string
          width_m?: number | null
          zone_type: string
        }
        Update: {
          created_at?: string
          floor_plan_id?: string
          geometry?: Json
          height_m?: number | null
          id?: string
          name?: string
          updated_at?: string
          width_m?: number | null
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_zones_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      racks: {
        Row: {
          aisle_id: string
          code: string
          created_at: string
          depth_m: number
          height_m: number
          id: string
          levels: number
          max_capacity_kg: number | null
          positions_per_level: number
          rotation_deg: number
          updated_at: string
          warehouse_id: string
          width_m: number
          x_m: number | null
          y_m: number | null
        }
        Insert: {
          aisle_id: string
          code: string
          created_at?: string
          depth_m: number
          height_m: number
          id?: string
          levels: number
          max_capacity_kg?: number | null
          positions_per_level?: number
          rotation_deg?: number
          updated_at?: string
          warehouse_id: string
          width_m: number
          x_m?: number | null
          y_m?: number | null
        }
        Update: {
          aisle_id?: string
          code?: string
          created_at?: string
          depth_m?: number
          height_m?: number
          id?: string
          levels?: number
          max_capacity_kg?: number | null
          positions_per_level?: number
          rotation_deg?: number
          updated_at?: string
          warehouse_id?: string
          width_m?: number
          x_m?: number | null
          y_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "racks_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racks_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          position_id: string
          quantity: number
          sku_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          position_id: string
          quantity?: number
          sku_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          position_id?: string
          quantity?: number
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: true
            referencedRelation: "storage_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_assignments_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      skus: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          owner_user_id?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_positions: {
        Row: {
          address_code: string
          capacity_units: number | null
          created_at: string
          id: string
          level_no: number
          position_no: number
          rack_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address_code: string
          capacity_units?: number | null
          created_at?: string
          id?: string
          level_no: number
          position_no: number
          rack_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_code?: string
          capacity_units?: number | null
          created_at?: string
          id?: string
          level_no?: number
          position_no?: number
          rack_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_positions_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          aisle_width_m: number
          code: string
          created_at: string
          id: string
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          aisle_width_m?: number
          code: string
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          aisle_width_m?: number
          code?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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

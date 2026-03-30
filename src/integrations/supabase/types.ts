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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agreements: {
        Row: {
          agreement_number: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          incident_id: string | null
          incident_truck_id: string | null
          parsed_data: Json | null
        }
        Insert: {
          agreement_number?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          parsed_data?: Json | null
        }
        Update: {
          agreement_number?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          parsed_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          incident_id: string
          incident_truck_id: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          incident_id: string
          incident_truck_id?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          incident_id?: string
          incident_truck_id?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_truck_crew: {
        Row: {
          assigned_at: string
          crew_member_id: string
          id: string
          incident_truck_id: string
          is_active: boolean
          notes: string | null
          released_at: string | null
          role_on_assignment: string | null
        }
        Insert: {
          assigned_at?: string
          crew_member_id: string
          id?: string
          incident_truck_id: string
          is_active?: boolean
          notes?: string | null
          released_at?: string | null
          role_on_assignment?: string | null
        }
        Update: {
          assigned_at?: string
          crew_member_id?: string
          id?: string
          incident_truck_id?: string
          is_active?: boolean
          notes?: string | null
          released_at?: string | null
          role_on_assignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_truck_crew_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_truck_crew_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_trucks: {
        Row: {
          assigned_at: string
          id: string
          incident_id: string
          status: string
          truck_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          incident_id: string
          status?: string
          truck_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          incident_id?: string
          status?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_trucks_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_trucks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acres: number | null
          containment: number | null
          created_at: string
          id: string
          location: string
          name: string
          notes: string | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          acres?: number | null
          containment?: number | null
          created_at?: string
          id?: string
          location: string
          name: string
          notes?: string | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          acres?: number | null
          containment?: number | null
          created_at?: string
          id?: string
          location?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      resource_orders: {
        Row: {
          agreement_number: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          incident_truck_id: string
          parsed_at: string | null
          parsed_data: Json | null
          resource_order_number: string | null
        }
        Insert: {
          agreement_number?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          incident_truck_id: string
          parsed_at?: string | null
          parsed_data?: Json | null
          resource_order_number?: string | null
        }
        Update: {
          agreement_number?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          incident_truck_id?: string
          parsed_at?: string | null
          parsed_data?: Json | null
          resource_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_orders_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_crew: {
        Row: {
          crew_member_id: string
          hours: number
          id: string
          notes: string | null
          role_on_shift: string | null
          shift_id: string
        }
        Insert: {
          crew_member_id: string
          hours: number
          id?: string
          notes?: string | null
          role_on_shift?: string | null
          shift_id: string
        }
        Update: {
          crew_member_id?: string
          hours?: number
          id?: string
          notes?: string | null
          role_on_shift?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_crew_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_crew_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          incident_truck_id: string
          notes: string | null
          start_time: string | null
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          incident_truck_id: string
          notes?: string | null
          start_time?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          incident_truck_id?: string
          notes?: string | null
          start_time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
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

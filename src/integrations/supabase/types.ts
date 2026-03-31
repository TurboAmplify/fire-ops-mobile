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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
          phone: string | null
          profile_photo_url: string | null
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          expense_type: string
          fuel_type: string | null
          id: string
          incident_id: string | null
          incident_truck_id: string | null
          meal_attendees: string | null
          meal_purpose: string | null
          organization_id: string | null
          receipt_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description?: string | null
          expense_type?: string
          fuel_type?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          meal_attendees?: string | null
          meal_purpose?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          expense_type?: string
          fuel_type?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          meal_attendees?: string | null
          meal_purpose?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          vendor?: string | null
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
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      needs_list_items: {
        Row: {
          category: string
          created_at: string
          created_by_user_id: string | null
          crew_member_id: string | null
          id: string
          is_purchased: boolean
          notes: string | null
          organization_id: string
          purchased_at: string | null
          title: string
          truck_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          crew_member_id?: string | null
          id?: string
          is_purchased?: boolean
          notes?: string | null
          organization_id: string
          purchased_at?: string | null
          title: string
          truck_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          crew_member_id?: string | null
          id?: string
          is_purchased?: boolean
          notes?: string | null
          organization_id?: string
          purchased_at?: string | null
          title?: string
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "needs_list_items_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_list_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_list_items_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          crew_member_id: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          crew_member_id?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          crew_member_id?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_orders: {
        Row: {
          agreement_number: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          incident_truck_id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "resource_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      truck_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_complete: boolean
          label: string
          notes: string | null
          organization_id: string | null
          sort_order: number
          truck_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_complete?: boolean
          label: string
          notes?: string | null
          organization_id?: string | null
          sort_order?: number
          truck_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_complete?: boolean
          label?: string
          notes?: string | null
          organization_id?: string | null
          sort_order?: number
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_checklist_items_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_documents: {
        Row: {
          created_at: string
          doc_type: string
          expires_at: string | null
          file_name: string
          file_url: string
          id: string
          notes: string | null
          organization_id: string | null
          title: string | null
          truck_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          expires_at?: string | null
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          title?: string | null
          truck_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expires_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          title?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          organization_id: string | null
          photo_label: string | null
          truck_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          organization_id?: string | null
          photo_label?: string | null
          truck_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string | null
          photo_label?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_photos_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_service_logs: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          mileage: number | null
          next_due_at: string | null
          next_due_mileage: number | null
          notes: string | null
          organization_id: string | null
          performed_at: string
          performed_by: string | null
          service_type: string
          truck_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mileage?: number | null
          next_due_at?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          service_type?: string
          truck_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mileage?: number | null
          next_due_at?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          service_type?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_service_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_service_logs_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          created_at: string
          current_mileage: number | null
          dot_number: string | null
          id: string
          make: string | null
          model: string | null
          name: string
          notes: string | null
          organization_id: string | null
          photo_url: string | null
          plate: string | null
          pump_type: string | null
          status: string
          unit_type: string | null
          vin: string | null
          water_capacity: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          current_mileage?: number | null
          dot_number?: string | null
          id?: string
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          plate?: string | null
          pump_type?: string | null
          status?: string
          unit_type?: string | null
          vin?: string | null
          water_capacity?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          current_mileage?: number | null
          dot_number?: string | null
          id?: string
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          plate?: string | null
          pump_type?: string | null
          status?: string
          unit_type?: string | null
          vin?: string | null
          water_capacity?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: { _name: string }
        Returns: string
      }
      get_auth_email: { Args: never; Returns: string }
      get_org_from_incident_truck: { Args: { _it_id: string }; Returns: string }
      get_org_from_shift: { Args: { _shift_id: string }; Returns: string }
      get_user_crew_member_id: { Args: { _user_id: string }; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      user_has_org_role: {
        Args: { _org_id: string; _role: string; _user_id: string }
        Returns: boolean
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

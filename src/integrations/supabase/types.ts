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
      call_responses: {
        Row: {
          cleared_at: string | null
          created_at: string
          crew_member_id: string
          dispatched_at: string | null
          id: string
          incident_id: string
          notes: string | null
          on_scene_at: string | null
          organization_id: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          crew_member_id: string
          dispatched_at?: string | null
          id?: string
          incident_id: string
          notes?: string | null
          on_scene_at?: string | null
          organization_id: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          crew_member_id?: string
          dispatched_at?: string | null
          id?: string
          incident_id?: string
          notes?: string | null
          on_scene_at?: string | null
          organization_id?: string
        }
        Relationships: []
      }
      crew_compensation: {
        Row: {
          crew_member_id: string
          hourly_rate: number | null
          hw_rate: number | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          crew_member_id: string
          hourly_rate?: number | null
          hw_rate?: number | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          crew_member_id?: string
          hourly_rate?: number | null
          hw_rate?: number | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_compensation_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: true
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_compensation_organization_id_fkey"
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
          qualifications: Json
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
          qualifications?: Json
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
          qualifications?: Json
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
      crew_truck_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          organization_id: string
          truck_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id: string
          truck_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string
          truck_id?: string
          user_id?: string
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
      inspection_template_items: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          template_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          template_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          template_type?: string
        }
        Relationships: []
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
          invite_code: string
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
          invite_code: string
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
          invite_code?: string
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
          accepts_assignments: boolean
          created_at: string
          default_hw_rate: number | null
          id: string
          inspection_alert_enabled: boolean
          modules_enabled: Json
          name: string
          org_type: string
          seat_limit: number
          tier: string
          walkaround_enabled: boolean
        }
        Insert: {
          accepts_assignments?: boolean
          created_at?: string
          default_hw_rate?: number | null
          id?: string
          inspection_alert_enabled?: boolean
          modules_enabled?: Json
          name: string
          org_type?: string
          seat_limit?: number
          tier?: string
          walkaround_enabled?: boolean
        }
        Update: {
          accepts_assignments?: boolean
          created_at?: string
          default_hw_rate?: number | null
          id?: string
          inspection_alert_enabled?: boolean
          modules_enabled?: Json
          name?: string
          org_type?: string
          seat_limit?: number
          tier?: string
          walkaround_enabled?: boolean
        }
        Relationships: []
      }
      platform_admin_audit: {
        Row: {
          action: string
          actor_user_id: string
          id: string
          occurred_at: string
          payload: Json
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          id?: string
          occurred_at?: string
          payload?: Json
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          id?: string
          occurred_at?: string
          payload?: Json
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          notes?: string | null
          user_id?: string
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
          operating_start: string | null
          operating_stop: string | null
          role_on_shift: string | null
          shift_id: string
          standby_start: string | null
          standby_stop: string | null
        }
        Insert: {
          crew_member_id: string
          hours: number
          id?: string
          notes?: string | null
          operating_start?: string | null
          operating_stop?: string | null
          role_on_shift?: string | null
          shift_id: string
          standby_start?: string | null
          standby_stop?: string | null
        }
        Update: {
          crew_member_id?: string
          hours?: number
          id?: string
          notes?: string | null
          operating_start?: string | null
          operating_stop?: string | null
          role_on_shift?: string | null
          shift_id?: string
          standby_start?: string | null
          standby_stop?: string | null
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
      shift_ticket_audit: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          event_type: string
          field_name: string | null
          id: string
          new_value: string | null
          occurred_at: string
          old_value: string | null
          organization_id: string
          reason: string | null
          shift_ticket_id: string
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          event_type: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
          organization_id: string
          reason?: string | null
          shift_ticket_id: string
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          event_type?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
          organization_id?: string
          reason?: string | null
          shift_ticket_id?: string
        }
        Relationships: []
      }
      shift_tickets: {
        Row: {
          agreement_number: string | null
          contractor_name: string | null
          contractor_rep_name: string | null
          contractor_rep_signature_url: string | null
          contractor_rep_signed_at: string | null
          created_at: string
          equipment_entries: Json
          equipment_make_model: string | null
          equipment_type: string | null
          financial_code: string | null
          first_last_type: string | null
          id: string
          incident_name: string | null
          incident_number: string | null
          incident_truck_id: string
          is_first_last: boolean | null
          license_id_number: string | null
          miles: number | null
          organization_id: string | null
          personnel_entries: Json
          remarks: string | null
          resource_order_id: string | null
          resource_order_number: string | null
          serial_vin_number: string | null
          status: string
          supervisor_name: string | null
          supervisor_resource_order: string | null
          supervisor_signature_url: string | null
          supervisor_signed_at: string | null
          transport_retained: boolean | null
          updated_at: string
        }
        Insert: {
          agreement_number?: string | null
          contractor_name?: string | null
          contractor_rep_name?: string | null
          contractor_rep_signature_url?: string | null
          contractor_rep_signed_at?: string | null
          created_at?: string
          equipment_entries?: Json
          equipment_make_model?: string | null
          equipment_type?: string | null
          financial_code?: string | null
          first_last_type?: string | null
          id?: string
          incident_name?: string | null
          incident_number?: string | null
          incident_truck_id: string
          is_first_last?: boolean | null
          license_id_number?: string | null
          miles?: number | null
          organization_id?: string | null
          personnel_entries?: Json
          remarks?: string | null
          resource_order_id?: string | null
          resource_order_number?: string | null
          serial_vin_number?: string | null
          status?: string
          supervisor_name?: string | null
          supervisor_resource_order?: string | null
          supervisor_signature_url?: string | null
          supervisor_signed_at?: string | null
          transport_retained?: boolean | null
          updated_at?: string
        }
        Update: {
          agreement_number?: string | null
          contractor_name?: string | null
          contractor_rep_name?: string | null
          contractor_rep_signature_url?: string | null
          contractor_rep_signed_at?: string | null
          created_at?: string
          equipment_entries?: Json
          equipment_make_model?: string | null
          equipment_type?: string | null
          financial_code?: string | null
          first_last_type?: string | null
          id?: string
          incident_name?: string | null
          incident_number?: string | null
          incident_truck_id?: string
          is_first_last?: boolean | null
          license_id_number?: string | null
          miles?: number | null
          organization_id?: string | null
          personnel_entries?: Json
          remarks?: string | null
          resource_order_id?: string | null
          resource_order_number?: string | null
          serial_vin_number?: string | null
          status?: string
          supervisor_name?: string | null
          supervisor_resource_order?: string | null
          supervisor_signature_url?: string | null
          supervisor_signed_at?: string | null
          transport_retained?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_tickets_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tickets_resource_order_id_fkey"
            columns: ["resource_order_id"]
            isOneToOne: false
            referencedRelation: "resource_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          financial_code: string | null
          id: string
          incident_number: string | null
          incident_truck_id: string
          is_first_last: boolean | null
          miles: number | null
          notes: string | null
          start_time: string | null
          transport_retained: boolean | null
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          financial_code?: string | null
          id?: string
          incident_number?: string | null
          incident_truck_id: string
          is_first_last?: boolean | null
          miles?: number | null
          notes?: string | null
          start_time?: string | null
          transport_retained?: boolean | null
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          financial_code?: string | null
          id?: string
          incident_number?: string | null
          incident_truck_id?: string
          is_first_last?: boolean | null
          miles?: number | null
          notes?: string | null
          start_time?: string | null
          transport_retained?: boolean | null
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
      signature_audit_log: {
        Row: {
          font_used: string | null
          id: string
          method: string
          organization_id: string | null
          shift_ticket_id: string
          signature_url: string
          signed_at: string
          signer_name: string | null
          signer_type: string
          user_id: string | null
        }
        Insert: {
          font_used?: string | null
          id?: string
          method: string
          organization_id?: string | null
          shift_ticket_id: string
          signature_url: string
          signed_at?: string
          signer_name?: string | null
          signer_type: string
          user_id?: string | null
        }
        Update: {
          font_used?: string | null
          id?: string
          method?: string
          organization_id?: string | null
          shift_ticket_id?: string
          signature_url?: string
          signed_at?: string
          signer_name?: string | null
          signer_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_name: string
          created_at: string
          crew_member_id: string
          expires_at: string | null
          hours: number | null
          id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_name: string
          created_at?: string
          crew_member_id: string
          expires_at?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_name?: string
          created_at?: string
          crew_member_id?: string
          expires_at?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: []
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
      truck_inspection_results: {
        Row: {
          id: string
          inspection_id: string
          item_label: string
          notes: string | null
          photo_url: string | null
          status: string
        }
        Insert: {
          id?: string
          inspection_id: string
          item_label: string
          notes?: string | null
          photo_url?: string | null
          status?: string
        }
        Update: {
          id?: string
          inspection_id?: string
          item_label?: string
          notes?: string | null
          photo_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_inspection_results_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "truck_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_inspections: {
        Row: {
          id: string
          incident_id: string | null
          notes: string | null
          organization_id: string
          performed_at: string
          performed_by_name: string | null
          performed_by_user_id: string | null
          shift_id: string | null
          status: string
          template_id: string | null
          truck_id: string
        }
        Insert: {
          id?: string
          incident_id?: string | null
          notes?: string | null
          organization_id: string
          performed_at?: string
          performed_by_name?: string | null
          performed_by_user_id?: string | null
          shift_id?: string | null
          status?: string
          template_id?: string | null
          truck_id: string
        }
        Update: {
          id?: string
          incident_id?: string | null
          notes?: string | null
          organization_id?: string
          performed_at?: string
          performed_by_name?: string | null
          performed_by_user_id?: string | null
          shift_id?: string | null
          status?: string
          template_id?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_inspections_truck_id_fkey"
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
          bed_length: string | null
          created_at: string
          current_mileage: number | null
          dot_number: string | null
          engine_type: string | null
          fuel_capacity: number | null
          fuel_type: string | null
          gvwr: number | null
          id: string
          inspection_template_id: string | null
          insurance_expiry: string | null
          last_oil_change_date: string | null
          last_oil_change_mileage: number | null
          make: string | null
          model: string | null
          name: string
          next_oil_change_mileage: number | null
          notes: string | null
          organization_id: string | null
          photo_url: string | null
          plate: string | null
          pump_type: string | null
          registration_expiry: string | null
          status: string
          unit_type: string | null
          vin: string | null
          water_capacity: string | null
          weight_empty: number | null
          weight_full: number | null
          year: number | null
        }
        Insert: {
          bed_length?: string | null
          created_at?: string
          current_mileage?: number | null
          dot_number?: string | null
          engine_type?: string | null
          fuel_capacity?: number | null
          fuel_type?: string | null
          gvwr?: number | null
          id?: string
          inspection_template_id?: string | null
          insurance_expiry?: string | null
          last_oil_change_date?: string | null
          last_oil_change_mileage?: number | null
          make?: string | null
          model?: string | null
          name: string
          next_oil_change_mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          plate?: string | null
          pump_type?: string | null
          registration_expiry?: string | null
          status?: string
          unit_type?: string | null
          vin?: string | null
          water_capacity?: string | null
          weight_empty?: number | null
          weight_full?: number | null
          year?: number | null
        }
        Update: {
          bed_length?: string | null
          created_at?: string
          current_mileage?: number | null
          dot_number?: string | null
          engine_type?: string | null
          fuel_capacity?: number | null
          fuel_type?: string | null
          gvwr?: number | null
          id?: string
          inspection_template_id?: string | null
          insurance_expiry?: string | null
          last_oil_change_date?: string | null
          last_oil_change_mileage?: number | null
          make?: string | null
          model?: string | null
          name?: string
          next_oil_change_mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          plate?: string | null
          pump_type?: string | null
          registration_expiry?: string | null
          status?: string
          unit_type?: string | null
          vin?: string | null
          water_capacity?: string | null
          weight_empty?: number | null
          weight_full?: number | null
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
      accept_invite_by_code: { Args: { _code: string }; Returns: string }
      admin_get_organization: { Args: { _org_id: string }; Returns: Json }
      admin_list_audit: {
        Args: { _limit?: number }
        Returns: {
          action: string
          actor_email: string
          actor_user_id: string
          id: string
          occurred_at: string
          payload: Json
          reason: string
          target_id: string
          target_type: string
        }[]
      }
      admin_list_organizations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          incident_count: number
          last_activity_at: string
          member_count: number
          name: string
          org_type: string
          pending_invite_count: number
          seat_limit: number
          tier: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          org_count: number
          organizations: Json
          user_id: string
        }[]
      }
      admin_log_action: {
        Args: {
          _action: string
          _payload?: Json
          _reason?: string
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
      admin_recent_activity: {
        Args: { _days?: number }
        Returns: {
          actor_email: string
          event_type: string
          occurred_at: string
          organization_id: string
          organization_name: string
          subtitle: string
          title: string
        }[]
      }
      create_organization_with_owner:
        | { Args: { _name: string }; Returns: string }
        | {
            Args: {
              _accepts_assignments?: boolean
              _name: string
              _org_type?: string
            }
            Returns: string
          }
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      get_auth_email: { Args: never; Returns: string }
      get_org_from_incident: { Args: { _incident_id: string }; Returns: string }
      get_org_from_incident_truck: { Args: { _it_id: string }; Returns: string }
      get_org_from_inspection_template: {
        Args: { _template_id: string }
        Returns: string
      }
      get_org_from_shift: { Args: { _shift_id: string }; Returns: string }
      get_org_from_signature_path: { Args: { _path: string }; Returns: string }
      get_org_from_truck_inspection: {
        Args: { _inspection_id: string }
        Returns: string
      }
      get_truck_from_inspection_photo_path: {
        Args: { _path: string }
        Returns: string
      }
      get_user_crew_member_id: { Args: { _user_id: string }; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_truck: {
        Args: { _truck_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_org_role: {
        Args: { _org_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      validate_inspection_photo_path: {
        Args: { _path: string; _user_id: string }
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

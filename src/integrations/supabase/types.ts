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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          incident_document_id: string | null
          incident_id: string | null
          incident_truck_id: string | null
          link_path: string | null
          organization_id: string
          read_at: string | null
          thread_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          incident_document_id?: string | null
          incident_id?: string | null
          incident_truck_id?: string | null
          link_path?: string | null
          organization_id: string
          read_at?: string | null
          thread_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          incident_document_id?: string | null
          incident_id?: string | null
          incident_truck_id?: string | null
          link_path?: string | null
          organization_id?: string
          read_at?: string | null
          thread_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_incident_document_id_fkey"
            columns: ["incident_document_id"]
            isOneToOne: false
            referencedRelation: "incident_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "app_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
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
      communication_threads: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by_user_id: string | null
          finance_officer_id: string | null
          id: string
          incident_id: string | null
          incident_truck_id: string | null
          last_message_at: string | null
          last_message_direction: string | null
          organization_id: string
          purpose: string
          status: string
          subject: string
          thread_token: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          finance_officer_id?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          organization_id: string
          purpose: string
          status?: string
          subject: string
          thread_token: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          finance_officer_id?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          organization_id?: string
          purpose?: string
          status?: string
          subject?: string
          thread_token?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "incident_truck_finance_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_finance_officer_id_fkey"
            columns: ["finance_officer_id"]
            isOneToOne: false
            referencedRelation: "finance_officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "communication_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_compensation: {
        Row: {
          crew_member_id: string
          daily_rate: number | null
          dependents_count: number
          extra_withholding: number
          federal_pct_override: number | null
          filing_status: string
          hourly_rate: number | null
          hw_rate: number | null
          medicare_exempt: boolean
          notes: string | null
          organization_id: string
          other_deductions: number
          pay_method: string
          social_security_exempt: boolean
          state_pct_override: number | null
          updated_at: string
          use_default_withholding: boolean
          use_org_default_rate: boolean
        }
        Insert: {
          crew_member_id: string
          daily_rate?: number | null
          dependents_count?: number
          extra_withholding?: number
          federal_pct_override?: number | null
          filing_status?: string
          hourly_rate?: number | null
          hw_rate?: number | null
          medicare_exempt?: boolean
          notes?: string | null
          organization_id: string
          other_deductions?: number
          pay_method?: string
          social_security_exempt?: boolean
          state_pct_override?: number | null
          updated_at?: string
          use_default_withholding?: boolean
          use_org_default_rate?: boolean
        }
        Update: {
          crew_member_id?: string
          daily_rate?: number | null
          dependents_count?: number
          extra_withholding?: number
          federal_pct_override?: number | null
          filing_status?: string
          hourly_rate?: number | null
          hw_rate?: number | null
          medicare_exempt?: boolean
          notes?: string | null
          organization_id?: string
          other_deductions?: number
          pay_method?: string
          social_security_exempt?: boolean
          state_pct_override?: number | null
          updated_at?: string
          use_default_withholding?: boolean
          use_org_default_rate?: boolean
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
          crew_id: string | null
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
          crew_id?: string | null
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
          crew_id?: string | null
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
      crews: {
        Row: {
          created_at: string
          crew_type: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          crew_type?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          crew_type?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: []
      }
      demob_packet_pages: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          organization_id: string
          packet_id: string
          page_number: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          organization_id: string
          packet_id: string
          page_number: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          packet_id?: string
          page_number?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "demob_packet_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "demob_packet_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demob_packet_pages_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "demob_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      demob_packets: {
        Row: {
          acknowledged_at: string | null
          combined_pdf_path: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          incident_id: string
          incident_truck_id: string
          method: string
          notes: string | null
          organization_id: string
          status: string
          submitted_at: string | null
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          combined_pdf_path?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          incident_id: string
          incident_truck_id: string
          method?: string
          notes?: string | null
          organization_id: string
          status?: string
          submitted_at?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          combined_pdf_path?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          incident_id?: string
          incident_truck_id?: string
          method?: string
          notes?: string | null
          organization_id?: string
          status?: string
          submitted_at?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demob_packets_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demob_packets_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demob_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "demob_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demob_packets_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          app_version: string | null
          id: string
          message: string
          occurred_at: string
          online: boolean | null
          organization_id: string | null
          route: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          id?: string
          message: string
          occurred_at?: string
          online?: boolean | null
          organization_id?: string | null
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          id?: string
          message?: string
          occurred_at?: string
          online?: boolean | null
          organization_id?: string | null
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          paid_via_payroll_period: string | null
          receipt_url: string | null
          reimbursed_at: string | null
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
          paid_via_payroll_period?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
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
          paid_via_payroll_period?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
      factoring_submissions: {
        Row: {
          account_count: number
          document_ids: string[]
          email_message_id: string | null
          factor_company_name: string | null
          id: string
          incident_id: string
          line_items: Json
          notes: string | null
          organization_id: string
          pdf_url: string | null
          recipient_email: string
          recipient_name: string | null
          reserve_amount: number
          reserve_percent: number
          schedule_number: number
          seller: string | null
          submitted_at: string
          submitted_by_name: string | null
          submitted_by_user_id: string | null
          total_amount: number
        }
        Insert: {
          account_count?: number
          document_ids?: string[]
          email_message_id?: string | null
          factor_company_name?: string | null
          id?: string
          incident_id: string
          line_items?: Json
          notes?: string | null
          organization_id: string
          pdf_url?: string | null
          recipient_email: string
          recipient_name?: string | null
          reserve_amount?: number
          reserve_percent?: number
          schedule_number: number
          seller?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          submitted_by_user_id?: string | null
          total_amount?: number
        }
        Update: {
          account_count?: number
          document_ids?: string[]
          email_message_id?: string | null
          factor_company_name?: string | null
          id?: string
          incident_id?: string
          line_items?: Json
          notes?: string | null
          organization_id?: string
          pdf_url?: string | null
          recipient_email?: string
          recipient_name?: string | null
          reserve_amount?: number
          reserve_percent?: number
          schedule_number?: number
          seller?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          submitted_by_user_id?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      finance_officer_audit: {
        Row: {
          actor_org_id: string | null
          actor_user_id: string | null
          event_type: string
          finance_officer_id: string
          id: string
          occurred_at: string
          payload: Json
        }
        Insert: {
          actor_org_id?: string | null
          actor_user_id?: string | null
          event_type: string
          finance_officer_id: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Update: {
          actor_org_id?: string | null
          actor_user_id?: string | null
          event_type?: string
          finance_officer_id?: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "finance_officer_audit_finance_officer_id_fkey"
            columns: ["finance_officer_id"]
            isOneToOne: false
            referencedRelation: "finance_officers"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_officers: {
        Row: {
          agency: string | null
          cell_phone: string | null
          created_at: string
          created_by_org_id: string | null
          created_by_user_id: string | null
          dispatch_office: string | null
          email: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          notes: string | null
          phone: string | null
          region_id: string | null
          updated_at: string
          use_count: number
          verified_at: string | null
          work_phone: string | null
        }
        Insert: {
          agency?: string | null
          cell_phone?: string | null
          created_at?: string
          created_by_org_id?: string | null
          created_by_user_id?: string | null
          dispatch_office?: string | null
          email: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          region_id?: string | null
          updated_at?: string
          use_count?: number
          verified_at?: string | null
          work_phone?: string | null
        }
        Update: {
          agency?: string | null
          cell_phone?: string | null
          created_at?: string
          created_by_org_id?: string | null
          created_by_user_id?: string | null
          dispatch_office?: string | null
          email?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          region_id?: string | null
          updated_at?: string
          use_count?: number
          verified_at?: string | null
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_officers_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "finance_officers_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_officers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "gacc_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      gacc_regions: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          states: string[]
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          sort_order?: number
          states?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          states?: string[]
        }
        Relationships: []
      }
      incident_crews: {
        Row: {
          assigned_at: string
          crew_id: string
          id: string
          incident_id: string
          notes: string | null
          released_at: string | null
          status: string
        }
        Insert: {
          assigned_at?: string
          crew_id: string
          id?: string
          incident_id: string
          notes?: string | null
          released_at?: string | null
          status?: string
        }
        Update: {
          assigned_at?: string
          crew_id?: string
          id?: string
          incident_id?: string
          notes?: string | null
          released_at?: string | null
          status?: string
        }
        Relationships: []
      }
      incident_document_audit: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          document_id: string | null
          document_type: string
          event_type: string
          file_name: string | null
          id: string
          incident_id: string
          notes: string | null
          occurred_at: string
          organization_id: string
          stage: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          document_id?: string | null
          document_type?: string
          event_type: string
          file_name?: string | null
          id?: string
          incident_id: string
          notes?: string | null
          occurred_at?: string
          organization_id: string
          stage?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          document_id?: string | null
          document_type?: string
          event_type?: string
          file_name?: string | null
          id?: string
          incident_id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          stage?: string | null
        }
        Relationships: []
      }
      incident_documents: {
        Row: {
          ai_classification: Json | null
          awaiting_action_by_user_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          incident_id: string
          incident_truck_id: string | null
          of286_entered_at: string | null
          of286_invoice_total: number | null
          of286_parsed: Json | null
          organization_id: string
          parent_document_id: string | null
          signature_url: string | null
          signed_at: string | null
          signed_by_name: string | null
          signed_by_user_id: string | null
          source_message_id: string | null
          stage: string
          thread_id: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          ai_classification?: Json | null
          awaiting_action_by_user_id?: string | null
          created_at?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          incident_id: string
          incident_truck_id?: string | null
          of286_entered_at?: string | null
          of286_invoice_total?: number | null
          of286_parsed?: Json | null
          organization_id: string
          parent_document_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          signed_by_user_id?: string | null
          source_message_id?: string | null
          stage?: string
          thread_id?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          ai_classification?: Json | null
          awaiting_action_by_user_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          incident_id?: string
          incident_truck_id?: string | null
          of286_entered_at?: string | null
          of286_invoice_total?: number | null
          of286_parsed?: Json | null
          organization_id?: string
          parent_document_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          signed_by_user_id?: string | null
          source_message_id?: string | null
          stage?: string
          thread_id?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_documents_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "incident_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_documents_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_documents_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
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
      incident_truck_finance_contacts: {
        Row: {
          cell_phone_override: string | null
          created_at: string
          email_override: string | null
          finance_officer_id: string | null
          id: string
          incident_id: string | null
          incident_truck_id: string | null
          is_active: boolean
          name_override: string | null
          notes: string | null
          organization_id: string
          phone_override: string | null
          receives_demob: boolean
          receives_of286: boolean
          receives_red_cards: boolean
          receives_shift_tickets: boolean
          role: string
          selected_at: string
          selected_by_user_id: string | null
          updated_at: string
          work_phone_override: string | null
        }
        Insert: {
          cell_phone_override?: string | null
          created_at?: string
          email_override?: string | null
          finance_officer_id?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          is_active?: boolean
          name_override?: string | null
          notes?: string | null
          organization_id: string
          phone_override?: string | null
          receives_demob?: boolean
          receives_of286?: boolean
          receives_red_cards?: boolean
          receives_shift_tickets?: boolean
          role?: string
          selected_at?: string
          selected_by_user_id?: string | null
          updated_at?: string
          work_phone_override?: string | null
        }
        Update: {
          cell_phone_override?: string | null
          created_at?: string
          email_override?: string | null
          finance_officer_id?: string | null
          id?: string
          incident_id?: string | null
          incident_truck_id?: string | null
          is_active?: boolean
          name_override?: string | null
          notes?: string | null
          organization_id?: string
          phone_override?: string | null
          receives_demob?: boolean
          receives_of286?: boolean
          receives_red_cards?: boolean
          receives_shift_tickets?: boolean
          role?: string
          selected_at?: string
          selected_by_user_id?: string | null
          updated_at?: string
          work_phone_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_truck_finance_contacts_finance_officer_id_fkey"
            columns: ["finance_officer_id"]
            isOneToOne: false
            referencedRelation: "finance_officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_truck_finance_contacts_incident_truck_id_fkey"
            columns: ["incident_truck_id"]
            isOneToOne: false
            referencedRelation: "incident_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_truck_finance_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "incident_truck_finance_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_trucks: {
        Row: {
          assigned_at: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          deleted_reason: string | null
          id: string
          incident_id: string
          status: string
          truck_id: string
        }
        Insert: {
          assigned_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
          id?: string
          incident_id: string
          status?: string
          truck_id: string
        }
        Update: {
          assigned_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
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
          deleted_at: string | null
          deleted_by_user_id: string | null
          deleted_reason: string | null
          id: string
          location: string
          name: string
          notes: string | null
          organization_id: string | null
          region_id: string | null
          region_other: string | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          acres?: number | null
          containment?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
          id?: string
          location: string
          name: string
          notes?: string | null
          organization_id?: string | null
          region_id?: string | null
          region_other?: string | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          acres?: number | null
          containment?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
          id?: string
          location?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          region_id?: string | null
          region_other?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "gacc_regions"
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
      message_attachments: {
        Row: {
          auto_classified_as: string | null
          auto_classified_stage: string | null
          classification_confidence: number | null
          classification_model: string | null
          created_at: string
          file_name: string
          id: string
          linked_incident_document_id: string | null
          message_id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          auto_classified_as?: string | null
          auto_classified_stage?: string | null
          classification_confidence?: number | null
          classification_model?: string | null
          created_at?: string
          file_name: string
          id?: string
          linked_incident_document_id?: string | null
          message_id: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          auto_classified_as?: string | null
          auto_classified_stage?: string | null
          classification_confidence?: number | null
          classification_model?: string | null
          created_at?: string
          file_name?: string
          id?: string
          linked_incident_document_id?: string | null
          message_id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_linked_incident_document_id_fkey"
            columns: ["linked_incident_document_id"]
            isOneToOne: false
            referencedRelation: "incident_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "message_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_drafts: {
        Row: {
          body_text: string
          id: string
          organization_id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_text?: string
          id?: string
          organization_id: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_text?: string
          id?: string
          organization_id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "message_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_html_sanitized: string | null
          body_text: string | null
          cc_emails: string[]
          created_at: string
          direction: string
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_system: boolean
          message_references: string[]
          organization_id: string
          read_at: string | null
          read_by_user_id: string | null
          received_at: string | null
          resend_message_id: string | null
          send_error: string | null
          send_status: string
          sent_at: string | null
          sent_by_user_id: string | null
          subject: string
          system_event: string | null
          thread_id: string
          to_emails: string[]
        }
        Insert: {
          body_html_sanitized?: string | null
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          direction: string
          from_email: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_system?: boolean
          message_references?: string[]
          organization_id: string
          read_at?: string | null
          read_by_user_id?: string | null
          received_at?: string | null
          resend_message_id?: string | null
          send_error?: string | null
          send_status?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          subject: string
          system_event?: string | null
          thread_id: string
          to_emails?: string[]
        }
        Update: {
          body_html_sanitized?: string | null
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          direction?: string
          from_email?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_system?: boolean
          message_references?: string[]
          organization_id?: string
          read_at?: string | null
          read_by_user_id?: string | null
          received_at?: string | null
          resend_message_id?: string | null
          send_error?: string | null
          send_status?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          subject?: string
          system_event?: string | null
          thread_id?: string
          to_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
      org_factoring_settings: {
        Row: {
          agreement_date: string | null
          created_at: string
          factor_company_name: string
          factor_contact_email: string | null
          factor_contact_name: string | null
          factor_contact_phone: string | null
          id: string
          next_schedule_number: number
          organization_id: string
          reserve_percent: number
          signature_url: string | null
          signer_name: string | null
          signer_phone: string | null
          signer_title: string
          updated_at: string
        }
        Insert: {
          agreement_date?: string | null
          created_at?: string
          factor_company_name?: string
          factor_contact_email?: string | null
          factor_contact_name?: string | null
          factor_contact_phone?: string | null
          id?: string
          next_schedule_number?: number
          organization_id: string
          reserve_percent?: number
          signature_url?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_title?: string
          updated_at?: string
        }
        Update: {
          agreement_date?: string | null
          created_at?: string
          factor_company_name?: string
          factor_contact_email?: string | null
          factor_contact_name?: string | null
          factor_contact_phone?: string | null
          id?: string
          next_schedule_number?: number
          organization_id?: string
          reserve_percent?: number
          signature_url?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_payroll_settings: {
        Row: {
          extra_withholding_default: number
          factoring_enabled: boolean
          factoring_pct: number
          federal_pct: number
          medicare_pct: number
          organization_id: string
          social_security_pct: number
          state_enabled: boolean
          state_pct: number
          updated_at: string
          updated_by: string | null
          workers_comp_pct: number
        }
        Insert: {
          extra_withholding_default?: number
          factoring_enabled?: boolean
          factoring_pct?: number
          federal_pct?: number
          medicare_pct?: number
          organization_id: string
          social_security_pct?: number
          state_enabled?: boolean
          state_pct?: number
          updated_at?: string
          updated_by?: string | null
          workers_comp_pct?: number
        }
        Update: {
          extra_withholding_default?: number
          factoring_enabled?: boolean
          factoring_pct?: number
          federal_pct?: number
          medicare_pct?: number
          organization_id?: string
          social_security_pct?: number
          state_enabled?: boolean
          state_pct?: number
          updated_at?: string
          updated_by?: string | null
          workers_comp_pct?: number
        }
        Relationships: []
      }
      org_reply_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          purpose: string
          subject_template: string | null
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          purpose: string
          subject_template?: string | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          purpose?: string
          subject_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_reply_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_reply_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_role_default_rates: {
        Row: {
          created_at: string
          daily_rate: number | null
          hourly_rate: number | null
          hw_rate: number | null
          id: string
          organization_id: string
          pay_method: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          hw_rate?: number | null
          id?: string
          organization_id: string
          pay_method?: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          hw_rate?: number | null
          id?: string
          organization_id?: string
          pay_method?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string
          invitee_name: string | null
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
          invitee_name?: string | null
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
          invitee_name?: string | null
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
          billing_status: string
          created_at: string
          default_hw_rate: number | null
          email_handle: string | null
          email_handle_changed_at: string | null
          id: string
          inspection_alert_enabled: boolean
          legacy_grandfathered: boolean
          modules_enabled: Json
          name: string
          operation_type: string
          org_type: string
          plan_code: string
          provisioned_via: string
          seat_limit: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          trial_ends_at: string | null
          walkaround_enabled: boolean
        }
        Insert: {
          accepts_assignments?: boolean
          billing_status?: string
          created_at?: string
          default_hw_rate?: number | null
          email_handle?: string | null
          email_handle_changed_at?: string | null
          id?: string
          inspection_alert_enabled?: boolean
          legacy_grandfathered?: boolean
          modules_enabled?: Json
          name: string
          operation_type?: string
          org_type?: string
          plan_code?: string
          provisioned_via?: string
          seat_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
          walkaround_enabled?: boolean
        }
        Update: {
          accepts_assignments?: boolean
          billing_status?: string
          created_at?: string
          default_hw_rate?: number | null
          email_handle?: string | null
          email_handle_changed_at?: string | null
          id?: string
          inspection_alert_enabled?: boolean
          legacy_grandfathered?: boolean
          modules_enabled?: Json
          name?: string
          operation_type?: string
          org_type?: string
          plan_code?: string
          provisioned_via?: string
          seat_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
          walkaround_enabled?: boolean
        }
        Relationships: []
      }
      payroll_adjustment_audit: {
        Row: {
          actor_user_id: string | null
          adjustment_id: string | null
          crew_member_id: string | null
          event_type: string
          id: string
          incident_id: string | null
          occurred_at: string
          organization_id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          adjustment_id?: string | null
          crew_member_id?: string | null
          event_type: string
          id?: string
          incident_id?: string | null
          occurred_at?: string
          organization_id: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          adjustment_id?: string | null
          crew_member_id?: string | null
          event_type?: string
          id?: string
          incident_id?: string | null
          occurred_at?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_type: string
          amount: number | null
          created_at: string
          created_by_user_id: string | null
          crew_member_id: string
          hours: number | null
          id: string
          incident_id: string | null
          organization_id: string
          reason: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_type: string
          amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          crew_member_id: string
          hours?: number | null
          id?: string
          incident_id?: string | null
          organization_id: string
          reason: string
        }
        Update: {
          adjustment_date?: string
          adjustment_type?: string
          amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          crew_member_id?: string
          hours?: number | null
          id?: string
          incident_id?: string | null
          organization_id?: string
          reason?: string
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
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          crew_member_id: string | null
          full_name: string | null
          id: string
          tutorial_completed_at: string | null
        }
        Insert: {
          created_at?: string
          crew_member_id?: string | null
          full_name?: string | null
          id: string
          tutorial_completed_at?: string | null
        }
        Update: {
          created_at?: string
          crew_member_id?: string | null
          full_name?: string | null
          id?: string
          tutorial_completed_at?: string | null
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
      provisioning_tokens: {
        Row: {
          consumed_at: string | null
          consumed_org_id: string | null
          consumed_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          org_name: string
          org_type: string
          plan_code: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          consumed_org_id?: string | null
          consumed_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          org_name: string
          org_type?: string
          plan_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          consumed_org_id?: string | null
          consumed_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          org_name?: string
          org_type?: string
          plan_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      red_cards: {
        Row: {
          agency: string | null
          card_id: string | null
          created_at: string
          crew_member_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          fitness_test_date: string | null
          fitness_test_expiration_date: string | null
          id: string
          issue_date: string | null
          organization_id: string
          photo_url: string | null
          primary_position: string | null
          qualifications: Json
          restrictions_notes: string | null
          return_address: string | null
          review_expiration_date: string | null
          rt130_date: string | null
          rt130_expiration_date: string | null
          rt130_includes_190: boolean
          rt130_refresher_status: string | null
          signer_name: string | null
          signer_title: string | null
          source_document_url: string | null
          updated_at: string
          work_capacity_test: string | null
        }
        Insert: {
          agency?: string | null
          card_id?: string | null
          created_at?: string
          crew_member_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          fitness_test_date?: string | null
          fitness_test_expiration_date?: string | null
          id?: string
          issue_date?: string | null
          organization_id: string
          photo_url?: string | null
          primary_position?: string | null
          qualifications?: Json
          restrictions_notes?: string | null
          return_address?: string | null
          review_expiration_date?: string | null
          rt130_date?: string | null
          rt130_expiration_date?: string | null
          rt130_includes_190?: boolean
          rt130_refresher_status?: string | null
          signer_name?: string | null
          signer_title?: string | null
          source_document_url?: string | null
          updated_at?: string
          work_capacity_test?: string | null
        }
        Update: {
          agency?: string | null
          card_id?: string | null
          created_at?: string
          crew_member_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          fitness_test_date?: string | null
          fitness_test_expiration_date?: string | null
          id?: string
          issue_date?: string | null
          organization_id?: string
          photo_url?: string | null
          primary_position?: string | null
          qualifications?: Json
          restrictions_notes?: string | null
          return_address?: string | null
          review_expiration_date?: string | null
          rt130_date?: string | null
          rt130_expiration_date?: string | null
          rt130_includes_190?: boolean
          rt130_refresher_status?: string | null
          signer_name?: string | null
          signer_title?: string | null
          source_document_url?: string | null
          updated_at?: string
          work_capacity_test?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "red_cards_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: true
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "red_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
          deleted_at: string | null
          deleted_by_user_id: string | null
          deleted_reason: string | null
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
          paper_ticket_photo_url: string | null
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
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
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
          paper_ticket_photo_url?: string | null
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
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_reason?: string | null
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
          paper_ticket_photo_url?: string | null
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
          day_rate: number
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
          day_rate?: number
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
          day_rate?: number
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
            referencedRelation: "app_review_protected"
            referencedColumns: ["organization_id"]
          },
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
      app_review_protected: {
        Row: {
          organization_id: string | null
          organization_name: string | null
          plan_code: string | null
          protected_user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite_by_code: { Args: { _code: string }; Returns: string }
      admin_delete_organization: {
        Args: { _org_id: string; _reason: string }
        Returns: undefined
      }
      admin_extend_org_trial: {
        Args: { _days: number; _org_id: string; _reason?: string }
        Returns: string
      }
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
      admin_self_add_to_org: {
        Args: { _org_id: string; _reason?: string }
        Returns: string
      }
      admin_self_remove_from_org: {
        Args: { _org_id: string; _reason?: string }
        Returns: undefined
      }
      admin_set_org_billing: {
        Args: {
          _billing_status: string
          _org_id: string
          _plan_code?: string
          _reason?: string
          _trial_ends_at?: string
        }
        Returns: undefined
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
        | {
            Args: {
              _accepts_assignments?: boolean
              _name: string
              _operation_type?: string
              _org_type?: string
            }
            Returns: string
          }
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      find_incident_truck_for_resource_order: {
        Args: { _org_id: string; _ro_number: string }
        Returns: {
          incident_id: string
          incident_name: string
          incident_truck_id: string
          resource_order_id: string
          resource_order_number: string
          truck_id: string
        }[]
      }
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
      get_user_role_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_engine_boss: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_real_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      link_profile_to_invited_crew_member: {
        Args: {
          _invitee_name: string
          _organization_id: string
          _user_id: string
        }
        Returns: undefined
      }
      list_org_members_with_identity: {
        Args: { _org_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          member_id: string
          role: string
          user_id: string
        }[]
      }
      normalize_org_member_role: { Args: { _role: string }; Returns: string }
      org_effective_status: { Args: { _org_id: string }; Returns: string }
      prepare_invite_signup:
        | { Args: { _code: string; _email: string }; Returns: string }
        | {
            Args: { _code: string; _email: string; _invitee_name: string }
            Returns: string
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      suggest_org_email_handle: { Args: { _name: string }; Returns: string }
      user_can_access_truck: {
        Args: { _truck_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_crew_member: {
        Args: { _crew_member_id: string; _user_id: string }
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

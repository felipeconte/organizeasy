export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
  | any

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_profiles: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_owner_profile: boolean
          is_system: boolean
          name: string
          organization_id: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_owner_profile?: boolean
          is_system?: boolean
          name: string
          organization_id: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_owner_profile?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_access_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          last_accessed_at: string | null
          project_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_accessed_at?: string | null
          project_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_accessed_at?: string | null
          project_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_accounts: {
        Row: {
          address: string | null
          city: string | null
          cpf: string
          created_at: string
          email: string | null
          id: string
          last_login_at: string | null
          name: string
          password_hash: string
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cpf: string
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          name: string
          password_hash: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          name?: string
          password_hash?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      client_update_requests: {
        Row: {
          client_id: string | null
          cpf: string
          created_at: string
          current_data: Json | null
          id: string
          organization_id: string
          portal_account_id: string | null
          rejection_reason: string | null
          requested_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          cpf: string
          created_at?: string
          current_data?: Json | null
          id?: string
          organization_id: string
          portal_account_id?: string | null
          rejection_reason?: string | null
          requested_data: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          cpf?: string
          created_at?: string
          current_data?: Json | null
          id?: string
          organization_id?: string
          portal_account_id?: string | null
          rejection_reason?: string | null
          requested_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_update_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_update_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_update_requests_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "client_portal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_code: string | null
          address: string | null
          city: string | null
          created_at: string
          document_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          person_type: string
          phone: string | null
          portal_token: string | null
          state: string | null
          status: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          access_code?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          person_type?: string
          phone?: string | null
          portal_token?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          access_code?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          person_type?: string
          phone?: string | null
          portal_token?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          categories: string[]
          city: string | null
          commission_payment_method: string | null
          commission_payment_terms: string | null
          commission_rate: number | null
          commission_type: string
          contact_name: string | null
          contacts: Json | null
          created_at: string
          document_number: string | null
          email: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          organization_id: string
          person_type: string
          phone: string | null
          rating: number | null
          state: string | null
          status: string
          trade_name: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[]
          city?: string | null
          commission_payment_method?: string | null
          commission_payment_terms?: string | null
          commission_rate?: number | null
          commission_type?: string
          contact_name?: string | null
          contacts?: Json | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          organization_id: string
          person_type?: string
          phone?: string | null
          rating?: number | null
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[]
          city?: string | null
          commission_payment_method?: string | null
          commission_payment_terms?: string | null
          commission_rate?: number | null
          commission_type?: string
          contact_name?: string | null
          contacts?: Json | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          person_type?: string
          phone?: string | null
          rating?: number | null
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          project_company_id: string | null
          project_id: string | null
          receipt_url: string | null
          recurring_expense_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          project_company_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          project_company_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_project_company_id_fkey"
            columns: ["project_company_id"]
            isOneToOne: false
            referencedRelation: "project_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invite_code: string
          invited_by: string | null
          organization_id: string
          profile_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invite_code: string
          invited_by?: string | null
          organization_id: string
          profile_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by?: string | null
          organization_id?: string
          profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          profile_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_task_counters: {
        Row: {
          created_at: string
          last_val: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          last_val?: number
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          last_val?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_task_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cau_caubr: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          slug: string
          updated_at: string
          workflow_stages: Json | null
        }
        Insert: {
          cau_caubr?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          updated_at?: string
          workflow_stages?: Json | null
        }
        Update: {
          cau_caubr?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
          workflow_stages?: Json | null
        }
        Relationships: []
      }
      project_briefings: {
        Row: {
          budget_notes: string | null
          created_at: string
          id: string
          needs_program: Json | null
          notes: string | null
          project_id: string
          site_conditions: string | null
          style_preferences: string | null
          updated_at: string
        }
        Insert: {
          budget_notes?: string | null
          created_at?: string
          id?: string
          needs_program?: Json | null
          notes?: string | null
          project_id: string
          site_conditions?: string | null
          style_preferences?: string | null
          updated_at?: string
        }
        Update: {
          budget_notes?: string | null
          created_at?: string
          id?: string
          needs_program?: Json | null
          notes?: string | null
          project_id?: string
          site_conditions?: string | null
          style_preferences?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_clients_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_companies: {
        Row: {
          category: string | null
          commission_due_date: string | null
          commission_paid_date: string | null
          commission_payment_method: string | null
          commission_payment_terms: string | null
          commission_rate: number | null
          commission_status: string
          commission_type: string
          company_id: string
          contract_value: number | null
          created_at: string
          expected_commission_amount: number | null
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          received_commission_amount: number | null
          service_description: string | null
          service_status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          commission_due_date?: string | null
          commission_paid_date?: string | null
          commission_payment_method?: string | null
          commission_payment_terms?: string | null
          commission_rate?: number | null
          commission_status?: string
          commission_type?: string
          company_id: string
          contract_value?: number | null
          created_at?: string
          expected_commission_amount?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          received_commission_amount?: number | null
          service_description?: string | null
          service_status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          commission_due_date?: string | null
          commission_paid_date?: string | null
          commission_payment_method?: string | null
          commission_payment_terms?: string | null
          commission_rate?: number | null
          commission_status?: string
          commission_type?: string
          company_id?: string
          contract_value?: number | null
          created_at?: string
          expected_commission_amount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          received_commission_amount?: number | null
          service_description?: string | null
          service_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          assigned_to: string | null
          attachments: Json
          checklist: Json
          code: string | null
          comments: Json
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_client_approval_required: boolean
          is_locked_for_client: boolean
          kanban_order: number
          name: string
          parent_stage_id: string | null
          progress_percent: number
          project_id: string
          stage_order: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json
          checklist?: Json
          code?: string | null
          comments?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_client_approval_required?: boolean
          is_locked_for_client?: boolean
          kanban_order?: number
          name: string
          parent_stage_id?: string | null
          progress_percent?: number
          project_id: string
          stage_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json
          checklist?: Json
          code?: string | null
          comments?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_client_approval_required?: boolean
          is_locked_for_client?: boolean
          kanban_order?: number
          name?: string
          parent_stage_id?: string | null
          progress_percent?: number
          project_id?: string
          stage_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_parent_stage_id_fkey"
            columns: ["parent_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_typologies: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_typologies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          area_sqm: number | null
          city: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          code: string
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          estimated_budget: number | null
          id: string
          organization_id: string
          skip_default_stages: boolean | null
          stage_template_id: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          typology: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          organization_id: string
          skip_default_stages?: boolean | null
          stage_template_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          typology?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          organization_id?: string
          skip_default_stages?: boolean | null
          stage_template_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          typology?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_stage_template_id_fkey"
            columns: ["stage_template_id"]
            isOneToOne: false
            referencedRelation: "stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          company_id: string | null
          created_at: string
          due_day: number
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          payment_method: string | null
          project_id: string | null
          start_date: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          due_day?: number
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          project_id?: string | null
          start_date?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          due_day?: number
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          project_id?: string | null
          start_date?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_approval_otps: {
        Row: {
          action_type: string
          client_id: string
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          project_id: string
          stage_id: string
          used_at: string | null
        }
        Insert: {
          action_type?: string
          client_id: string
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          project_id: string
          stage_id: string
          used_at?: string | null
        }
        Update: {
          action_type?: string
          client_id?: string
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          project_id?: string
          stage_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_approval_otps_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_approval_otps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_approval_otps_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_approvals: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_email: string | null
          approver_name: string
          audit_hash: string
          client_id: string | null
          created_at: string
          feedback_message: string | null
          id: string
          ip_address: string | null
          project_id: string
          stage_id: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_email?: string | null
          approver_name: string
          audit_hash?: string
          client_id?: string | null
          created_at?: string
          feedback_message?: string | null
          id?: string
          ip_address?: string | null
          project_id: string
          stage_id: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approver_email?: string | null
          approver_name?: string
          audit_hash?: string
          client_id?: string | null
          created_at?: string
          feedback_message?: string | null
          id?: string
          ip_address?: string | null
          project_id?: string
          stage_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_approvals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_template_items: {
        Row: {
          checklist: Json
          created_at: string
          default_duration_days: number | null
          description: string | null
          id: string
          is_client_approval_required: boolean
          name: string
          stage_order: number
          stage_template_id: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_client_approval_required?: boolean
          name: string
          stage_order?: number
          stage_template_id: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          default_duration_days?: number | null
          description?: string | null
          id?: string
          is_client_approval_required?: boolean
          name?: string
          stage_order?: number
          stage_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_template_items_stage_template_id_fkey"
            columns: ["stage_template_id"]
            isOneToOne: false
            referencedRelation: "stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          stage_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          stage_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          stage_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cau: string | null
          created_at: string | null
          display_name: string | null
          full_name: string | null
          job_role: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cau?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          job_role?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cau?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          job_role?: string | null
          phone?: string | null
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
      add_org_member_by_email: {
        Args: {
          member_email: string
          member_role?: Database["public"]["Enums"]["user_role"]
          target_org_id: string
        }
        Returns: Json
      }
      can_access_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      generate_portal_access_code: { Args: never; Returns: string }
      get_organization_members_with_email: {
        Args: { target_org_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_portal_project: { Args: { client_token: string }; Returns: Json }
      get_user_id_by_email: { Args: { lookup_email: string }; Returns: string }
      initialize_default_organization_profiles: {
        Args: { target_org_id: string }
        Returns: string
      }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      submit_portal_approval: {
        Args: {
          action_type: Database["public"]["Enums"]["approval_action"]
          approver_email: string
          approver_name: string
          client_ip?: string
          client_token: string
          client_ua?: string
          feedback: string
          target_stage_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      approval_action: "approved" | "changes_requested"
      project_status: "ativo" | "pausado" | "concluido" | "cancelado"
      stage_status: "a_iniciar" | "em_producao" | "em_aprovacao" | "concluido"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done"
      user_role: "owner" | "admin" | "collaborator" | "intern"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      approval_action: ["approved", "changes_requested"],
      project_status: ["ativo", "pausado", "concluido", "cancelado"],
      stage_status: ["a_iniciar", "em_producao", "em_aprovacao", "concluido"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done"],
      user_role: ["owner", "admin", "collaborator", "intern"],
    },
  },
} as const

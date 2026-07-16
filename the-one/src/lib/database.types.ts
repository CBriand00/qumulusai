/**
 * Typed database models.
 *
 * This is a hand-authored subset that stays in sync with the SQL migrations in
 * `supabase/migrations`. After running the migrations you can regenerate the
 * full, exhaustive types with:
 *
 *   supabase gen types typescript --linked > src/lib/database.types.ts
 *
 * (or the Supabase MCP `generate_typescript_types` tool). Until then, this file
 * types the tables the application code references directly.
 */

export type Role = "public" | "applicant" | "admin";

export type ApplicantStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_info_requested"
  | "shortlisted"
  | "approved_to_connect"
  | "messaging_open"
  | "date_invited"
  | "dating"
  | "paused"
  | "not_selected"
  | "withdrawn"
  | "blocked"
  | "archived";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Role;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Role;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: Role;
          full_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          applicant_id: string;
          status: ApplicantStatus;
          current_step: number;
          submitted_at: string | null;
          application_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          applicant_id: string;
          status?: ApplicantStatus;
          current_step?: number;
          submitted_at?: string | null;
          application_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ApplicantStatus;
          current_step?: number;
          submitted_at?: string | null;
          application_code?: string | null;
          locked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      applicant_profiles: {
        Row: Record<string, unknown> & { applicant_id: string };
        Insert: { applicant_id: string } & Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      application_answers: {
        Row: {
          id: string;
          application_id: string;
          question_key: string;
          value_text: string | null;
          value_number: number | null;
          value_bool: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          question_key: string;
          value_text?: string | null;
          value_number?: number | null;
          value_bool?: boolean | null;
        };
        Update: {
          value_text?: string | null;
          value_number?: number | null;
          value_bool?: boolean | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      applicant_media: {
        Row: {
          id: string;
          applicant_id: string;
          kind: string;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          duration_seconds: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          applicant_id: string;
          kind: string;
          storage_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          duration_seconds?: number | null;
          sort_order?: number;
        };
        Update: {
          kind?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      status_history: {
        Row: {
          id: string;
          application_id: string;
          from_status: ApplicantStatus | null;
          to_status: ApplicantStatus;
          changed_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          application_id: string;
          from_status?: ApplicantStatus | null;
          to_status: ApplicantStatus;
          changed_by?: string | null;
          reason?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      consent_records: {
        Row: {
          id: string;
          user_id: string;
          consent_key: string;
          consented: boolean;
          typed_name: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          consent_key: string;
          consented: boolean;
          typed_name?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          kind: string;
          title: string;
          body?: string | null;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: Role;
      applicant_status: ApplicantStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

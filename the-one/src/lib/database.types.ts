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
          updated_at?: string;
        };
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

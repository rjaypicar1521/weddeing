export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  plan: "free" | "premium";
  storage_used_bytes: number;
  storage_limit_bytes: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

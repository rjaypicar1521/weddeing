import { apiClient } from "@/lib/api";
import type { AuthUser } from "@/types/user";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthUserResponse {
  message?: string;
  user: AuthUser;
}

export interface VerifyEmailPayload {
  id: string;
  hash: string;
  expires?: string;
  signature?: string;
}

export async function register(payload: RegisterPayload): Promise<AuthUserResponse> {
  return apiClient.post<AuthUserResponse, RegisterPayload>("/auth/register", payload, {
    requiresCsrf: true,
  });
}

export async function login(payload: LoginPayload): Promise<AuthUserResponse> {
  return apiClient.post<AuthUserResponse, LoginPayload>("/auth/login", payload, {
    requiresCsrf: true,
  });
}

export async function logout(): Promise<void> {
  await apiClient.post<void>("/auth/logout", undefined, {
    requiresCsrf: true,
  });
}

export async function getCurrentUser(): Promise<AuthUserResponse> {
  return apiClient.get<AuthUserResponse>("/auth/user", {
    requiresCsrf: false,
  });
}

export async function resendVerificationEmail(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>("/auth/email/resend", undefined, {
    requiresCsrf: true,
  });
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<{ message: string }> {
  const query = new URLSearchParams();

  if (payload.expires) {
    query.set("expires", payload.expires);
  }

  if (payload.signature) {
    query.set("signature", payload.signature);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiClient.post<{ message: string }>(`/auth/email/verify/${payload.id}/${payload.hash}${suffix}`, undefined, {
    requiresCsrf: true,
  });
}

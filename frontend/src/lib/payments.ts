import { apiClient } from '@/lib/api';

export interface BillingStatusResponse {
  plan: 'free' | 'premium';
  plan_label: 'Free' | 'Pro';
  is_pro: boolean;
  guest_usage: {
    used: number;
    limit: number;
    percent: number;
  };
  upgrade_needed: boolean;
  should_prompt_upgrade: boolean;
  current_plan?: {
    label: 'Free' | 'Pro';
    guest_limit: number;
    billed_at: string | null;
    next_bill_date: string | null;
  };
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface BillingPortalResponse {
  portal_url: string;
}

export interface InvoiceHistoryItem {
  invoice_id: string;
  date: string | null;
  amount: number;
  currency: string;
  status: string;
  invoice_pdf_url: string;
}

export interface InvoiceHistoryResponse {
  invoices: InvoiceHistoryItem[];
}

export interface GuestUsageResponse {
  guests_used: number;
  guest_limit: number;
  upgrade_needed: boolean;
}

export interface UsageAnalyticsResponse {
  current_month: {
    guests_used: number;
    guest_limit: number;
    usage_pct: number;
  };
  trend: Array<{
    month: string;
    guests: number;
  }>;
  projected: string;
  projected_total: number;
}

export interface VerifyDomainPayload {
  domain: string;
}

export interface VerifyDomainResponse {
  status: 'verified';
  message: string;
  custom_domain: string;
  expected_txt_value: string;
}

export interface DomainStatusResponse {
  status: 'pending' | 'verified' | 'failed';
  custom_domain: string | null;
  expected_txt_value: string;
  next_steps: string;
}

export async function getBillingStatus(): Promise<BillingStatusResponse> {
  return apiClient.get<BillingStatusResponse>('/payments/status', {
    requiresCsrf: false,
  });
}

export async function createProCheckout(): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>('/payments/create-checkout', undefined, {
    requiresCsrf: true,
  });
}

export async function createBillingPortal(): Promise<BillingPortalResponse> {
  return apiClient.post<BillingPortalResponse>('/payments/portal', undefined, {
    requiresCsrf: true,
  });
}

export async function createBillingPortalSession(): Promise<BillingPortalResponse> {
  return apiClient.post<BillingPortalResponse>('/payments/portal-session', undefined, {
    requiresCsrf: true,
  });
}

export async function getGuestUsage(): Promise<GuestUsageResponse> {
  return apiClient.get<GuestUsageResponse>('/payments/usage', {
    requiresCsrf: false,
  });
}

export async function getUsageAnalytics(): Promise<UsageAnalyticsResponse> {
  return apiClient.get<UsageAnalyticsResponse>('/payments/usage-analytics', {
    requiresCsrf: false,
  });
}

export async function verifyCustomDomain(payload: VerifyDomainPayload): Promise<VerifyDomainResponse> {
  return apiClient.post<VerifyDomainResponse, VerifyDomainPayload>('/payments/verify-domain', payload, {
    requiresCsrf: true,
  });
}

export async function getDomainStatus(): Promise<DomainStatusResponse> {
  return apiClient.get<DomainStatusResponse>('/admin/domain-status', {
    requiresCsrf: false,
  });
}

export async function getInvoiceHistory(): Promise<InvoiceHistoryResponse> {
  return apiClient.get<InvoiceHistoryResponse>('/payments/invoice-history', {
    requiresCsrf: false,
  });
}

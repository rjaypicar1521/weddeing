import { apiClient } from '@/lib/api';

export interface AdminOverview {
  guests_invited: number;
  rsvps_received: number;
  attending: number;
  declined: number;
  pending: number;
  invites_sent: number;
  invites_opened: number;
  avg_open_rate: string;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('/admin/overview', {
    requiresCsrf: false,
  });
}

export interface AdminReminderBulkResponse {
  queued: number;
  skipped: number;
  total_pending: number;
  message: string;
}

export interface AdminReminderSingleResponse {
  queued: boolean;
  skipped: boolean;
  guest_name: string;
  message: string;
}

export interface AdminReminderStats {
  last_24h: {
    total: number;
    queued: number;
    sent: number;
    failed: number;
    skipped: number;
    opened: number;
    clicked: number;
  };
  tracking: {
    open_click_tracking_supported: boolean;
  };
  recent: Array<{
    id: number;
    rsvp_id: number;
    recipient_email: string;
    status: 'queued' | 'sent' | 'failed' | 'skipped';
    sent_at: string | null;
    created_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
  }>;
}

export async function sendPendingReminders(): Promise<AdminReminderBulkResponse> {
  return apiClient.post<AdminReminderBulkResponse>('/admin/reminders/pending', undefined, {
    requiresCsrf: false,
  });
}

export async function sendSingleReminder(guestId: number): Promise<AdminReminderSingleResponse> {
  return apiClient.post<AdminReminderSingleResponse>(`/admin/reminders/${guestId}`, undefined, {
    requiresCsrf: false,
  });
}

export async function getAdminReminderStats(): Promise<AdminReminderStats> {
  return apiClient.get<AdminReminderStats>('/admin/reminders/stats', {
    requiresCsrf: false,
  });
}

export interface InviteAnalyticsTimelinePoint {
  date: string;
  opens: number;
  mobile: number;
  desktop: number;
}

export interface AdminInviteAnalytics {
  total_sent: number;
  total_opened: number;
  open_rate: number;
  avg_days_to_open: number;
  opened_today: number;
  by_device: {
    mobile: number;
    desktop: number;
  };
  timeline: InviteAnalyticsTimelinePoint[];
  range_days: 7 | 30;
}

export async function getAdminInviteAnalytics(range: 7 | 30 = 7): Promise<AdminInviteAnalytics> {
  return apiClient.get<AdminInviteAnalytics>(`/admin/analytics/invites?range=${range}`, {
    requiresCsrf: false,
  });
}

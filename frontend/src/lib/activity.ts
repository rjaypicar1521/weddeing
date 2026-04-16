import { apiClient } from '@/lib/api';

export type ActivityFilter = 'all' | 'rsvps' | 'invites' | 'reminders';

export interface ActivityItem {
  id: number;
  user_name: string;
  action: string;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export interface ActivityResponse {
  data: ActivityItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export async function getAdminActivity(params: {
  page?: number;
  type?: ActivityFilter;
  search?: string;
}): Promise<ActivityResponse> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('type', params.type ?? 'all');
  if ((params.search ?? '').trim() !== '') {
    query.set('search', (params.search ?? '').trim());
  }

  return apiClient.get<ActivityResponse>(`/admin/activity?${query.toString()}`, {
    requiresCsrf: false,
  });
}

import { apiClient, resolvePublicApiOrigin } from '@/lib/api';
import axios from 'axios';

export type RsvpStatusFilter = 'all' | 'attending' | 'declined' | 'pending';

export interface CoupleRsvpItem {
  id: number;
  guest_name: string;
  attending: boolean | null;
  plus_one_name: string | null;
  meal_preference: string | null;
  transport: string | null;
  favorite_memory: string | null;
  message_to_couple: string | null;
  submitted_at: string | null;
  manually_overridden_at: string | null;
  manually_overridden_by: number | null;
  notes?: RsvpPrivateNote[];
}

export interface RsvpPrivateNote {
  id: number;
  user_id: number;
  note: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface UpdateRsvpPayload {
  attending?: boolean;
  plus_one_name?: string | null;
  meal_preference?: 'Beef' | 'Fish' | 'Vegetarian' | 'Kids' | null;
  transport?: 'has_car' | 'needs_shuttle' | 'own_arrangement' | null;
  favorite_memory?: string | null;
  message_to_couple?: string | null;
}

export interface UpdateRsvpResponse {
  rsvp: CoupleRsvpItem;
  notification_sent: boolean;
}

export interface CoupleRsvpsResponse {
  rsvps: CoupleRsvpItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export interface CoupleRsvpStats {
  total: number;
  attending: number;
  declined: number;
  pending: number;
  total_with_plus_ones: number;
  meal_counts: Record<string, number>;
  transport_counts: Record<string, number>;
}

export async function getCoupleRsvps(params: {
  page?: number;
  status?: RsvpStatusFilter;
  search?: string;
}): Promise<CoupleRsvpsResponse> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('status', params.status ?? 'all');
  if ((params.search ?? '').trim() !== '') {
    query.set('search', (params.search ?? '').trim());
  }

  return apiClient.get<CoupleRsvpsResponse>(`/rsvps?${query.toString()}`, {
    requiresCsrf: false,
  });
}

export async function getCoupleRsvpStats(): Promise<CoupleRsvpStats> {
  return apiClient.get<CoupleRsvpStats>('/rsvps/stats', {
    requiresCsrf: false,
  });
}

export interface RsvpExportResult {
  blob: Blob;
  filename: string;
}

export async function exportCoupleRsvpsCsv(onlyAttending: boolean): Promise<RsvpExportResult> {
  const apiBaseUrl = resolvePublicApiOrigin();
  const resolvedBaseUrl = apiBaseUrl ? `${apiBaseUrl}/api/v1` : '/api/v1';
  const query = onlyAttending ? '?only_attending=true' : '';

  const response = await axios.get<Blob>(`${resolvedBaseUrl}/rsvps/export${query}`, {
    withCredentials: true,
    responseType: 'blob',
    headers: {
      Accept: 'text/csv',
    },
  });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `wedding-online-guestlist-${new Date().toISOString().slice(0, 10)}.csv`;

  return {
    blob: response.data,
    filename,
  };
}

export async function updateCoupleRsvp(id: number, payload: UpdateRsvpPayload): Promise<UpdateRsvpResponse> {
  return apiClient.patch<UpdateRsvpResponse, UpdateRsvpPayload>(`/rsvps/${id}`, payload, {
    requiresCsrf: false,
  });
}

export async function addCoupleRsvpNote(id: number, note: string): Promise<RsvpPrivateNote[]> {
  const response = await apiClient.post<{ notes: RsvpPrivateNote[] }, { note: string }>(`/rsvps/${id}/note`, { note }, {
    requiresCsrf: false,
  });

  return response.notes;
}

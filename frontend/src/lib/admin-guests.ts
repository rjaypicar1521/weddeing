import axios from 'axios';
import { apiClient, resolvePublicApiOrigin } from '@/lib/api';

export type AdminGuestFilter = 'invited' | 'rsvp-pending' | 'attending' | 'declined';
export type AdminGuestStatus = 'invited' | 'contacted' | 'no_reply' | 'rsvp-pending' | 'attending' | 'declined';

export interface AdminGuestItem {
  id: number;
  invitation_id: number;
  name: string;
  email: string | null;
  status: AdminGuestStatus;
  guest_status: AdminGuestStatus;
  invited_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
}

export interface AdminGuestsResponse {
  guests: AdminGuestItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export async function getAdminGuests(params: {
  page?: number;
  status?: AdminGuestFilter;
  search?: string;
}): Promise<AdminGuestsResponse> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  if (params.status) {
    query.set('status', params.status);
  }
  if ((params.search ?? '').trim() !== '') {
    query.set('search', (params.search ?? '').trim());
  }

  return apiClient.get<AdminGuestsResponse>(`/admin/guests?${query.toString()}`, {
    requiresCsrf: false,
  });
}

export async function deleteAdminGuest(id: number): Promise<void> {
  await apiClient.delete(`/admin/guests/${id}`, {
    requiresCsrf: false,
  });
}

export async function updateAdminGuestStatus(id: number, status: AdminGuestStatus): Promise<{
  guest: {
    id: number;
    guest_name: string;
    email: string | null;
    guest_status: AdminGuestStatus;
  };
  message: string;
}> {
  return apiClient.patch(`/admin/guests/${id}/status`, { status }, {
    requiresCsrf: false,
  });
}

export async function bulkInviteGuests(file: File): Promise<{
  added: number;
  queued: number;
  preview: Array<{ name: string; email: string }>;
  message: string;
}> {
  const apiBaseUrl = resolvePublicApiOrigin();
  const resolvedBaseUrl = apiBaseUrl ? `${apiBaseUrl}/api/v1` : '/api/v1';

  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${resolvedBaseUrl}/admin/guests/bulk-invite`, formData, {
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

import axios from 'axios';
import { apiClient, resolvePublicApiOrigin } from '@/lib/api';

export type CoupleGuestFilter = 'invited' | 'rsvp-pending' | 'attending' | 'declined';
export type CoupleGuestStatus = 'invited' | 'contacted' | 'no_reply' | 'rsvp-pending' | 'attending' | 'declined';

export interface CoupleGuestItem {
  id: number;
  invitation_id: number;
  guest_group_id?: number | null;
  name: string;
  email: string | null;
  status: CoupleGuestStatus;
  guest_status: CoupleGuestStatus;
  invited_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
  group_name?: string | null;
  group_code?: string | null;
}

export interface CoupleGuestGroupItem {
  id: number;
  name: string;
  access_code: string;
  status: string;
  is_default: boolean;
  guest_count: number;
  submitted_count: number;
  attending_count: number;
  pending_count: number;
}

export interface CoupleGuestsResponse {
  guests: CoupleGuestItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export async function getCoupleGuests(params: {
  page?: number;
  status?: CoupleGuestFilter;
  search?: string;
}): Promise<CoupleGuestsResponse> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  if (params.status) {
    query.set('status', params.status);
  }
  if ((params.search ?? '').trim() !== '') {
    query.set('search', (params.search ?? '').trim());
  }

  return apiClient.get<CoupleGuestsResponse>(`/guests?${query.toString()}`, {
    requiresCsrf: false,
  });
}

export async function deleteCoupleGuest(id: number): Promise<void> {
  await apiClient.delete(`/guests/${id}`, {
    requiresCsrf: false,
  });
}

export async function updateCoupleGuestStatus(id: number, status: CoupleGuestStatus): Promise<{
  guest: {
    id: number;
    guest_name: string;
    email: string | null;
    guest_status: CoupleGuestStatus;
  };
  message: string;
}> {
  return apiClient.patch(`/guests/${id}/status`, { status }, {
    requiresCsrf: false,
  });
}

export async function getCoupleGuestGroups(): Promise<{
  groups: CoupleGuestGroupItem[];
}> {
  return apiClient.get('/guest-groups', {
    requiresCsrf: false,
  });
}

export async function createCoupleGuestGroup(name: string): Promise<{
  group: CoupleGuestGroupItem;
  message: string;
}> {
  return apiClient.post('/guest-groups', { name }, {
    requiresCsrf: false,
  });
}

export async function renameCoupleGuestGroup(id: number, name: string): Promise<{
  group: CoupleGuestGroupItem;
  message: string;
}> {
  return apiClient.patch(`/guest-groups/${id}`, { name }, {
    requiresCsrf: false,
  });
}

export async function regenerateCoupleGuestGroupCode(id: number): Promise<{
  group: CoupleGuestGroupItem;
  message: string;
}> {
  return apiClient.post(`/guest-groups/${id}/regenerate-code`, {}, {
    requiresCsrf: false,
  });
}

export async function createTableGuestGroups(tableCount = 20): Promise<{
  created_count: number;
  existing_count: number;
  groups: CoupleGuestGroupItem[];
  message: string;
}> {
  return apiClient.post('/guest-groups/table-codes', { table_count: tableCount }, {
    requiresCsrf: false,
  });
}

export async function moveCoupleGuestToGroup(id: number, guestGroupId: number): Promise<{
  guest: {
    id: number;
    guest_name: string;
    guest_group_id: number | null;
    group_name?: string | null;
    group_code?: string | null;
  };
  message: string;
}> {
  return apiClient.patch(`/guests/${id}/group`, { guest_group_id: guestGroupId }, {
    requiresCsrf: false,
  });
}

export async function bulkInviteCoupleGuests(file: File): Promise<{
  added: number;
  queued: number;
  preview: Array<{ name: string; email: string; group_name?: string | null }>;
  message: string;
}> {
  const apiBaseUrl = resolvePublicApiOrigin();
  const resolvedBaseUrl = apiBaseUrl ? `${apiBaseUrl}/api/v1` : '/api/v1';

  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${resolvedBaseUrl}/guests/bulk-invite`, formData, {
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

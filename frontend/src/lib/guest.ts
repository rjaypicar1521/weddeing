import { apiClient } from '@/lib/api';

export interface ValidateGuestCodeResponse {
  guest_token: string;
  invitation_slug: string;
  group: {
    id: number;
    name: string;
  } | null;
}

export interface ValidateGuestCodePayload {
  code: string;
}

export async function validateGuestCode(
  payload: ValidateGuestCodePayload,
): Promise<ValidateGuestCodeResponse> {
  return apiClient.post<ValidateGuestCodeResponse, ValidateGuestCodePayload>(
    '/guest/validate-code',
    payload,
    {
      requiresCsrf: false,
    },
  );
}

export interface GuestInvitationPayload {
  invitation: {
    id?: number;
    slug?: string;
    partner1_name?: string;
    partner2_name?: string;
    wedding_date?: string;
    wedding_time?: string;
    venue_name?: string;
    venue_address?: string;
    dress_code?: string;
    schedule?: Array<{ time?: string; event?: string; description?: string }>;
    music_url?: string | null;
    prenup_video_url?: string | null;
    gift_methods?: Array<{
      label?: string;
      qr_path?: string;
      account_name?: string;
      account_number?: string;
    }>;
    dress_code_colors?: string[];
  } & Record<string, unknown>;
  template?: {
    name?: string;
    slug?: string;
    region?: string;
    preview_image_path?: string;
  } | null;
  media?: Partial<Record<'hero' | 'gallery' | 'chapter' | 'entourage' | 'qr_code', Array<{ url?: string; type?: string }>>>;
  love_story_chapters?: Array<{
    id?: number;
    title?: string;
    story_text?: string;
    photo_path?: string | null;
    chapter_date?: string | null;
    sort_order?: number;
  }>;
  entourage_members?: Array<{
    id?: number;
    name?: string;
    role?: string;
    photo_path?: string | null;
    sort_order?: number;
  }>;
  wishes?: Array<{
    id?: number;
    guest_name?: string;
    message?: string;
    created_at?: string;
  }>;
  group?: GuestInvitationGroup | null;
}

export interface GuestInvitationGroupGuest {
  id: number;
  guest_name: string;
  email: string | null;
  guest_status: string | null;
  submitted_at: string | null;
  attending: boolean | null;
  confirmation_code: string | null;
  meal_preference: string | null;
  transport: string | null;
  plus_one_name: string | null;
}

export interface GuestInvitationGroup {
  id: number;
  name: string;
  access_code: string;
  guests: GuestInvitationGroupGuest[];
}

export async function getGuestInvitation(): Promise<GuestInvitationPayload> {
  return apiClient.get<GuestInvitationPayload>('/guest/invitation', {
    requiresCsrf: false,
  });
}

export interface GuestRsvpPayload {
  guest_id?: number | null;
  guest_name?: string | null;
  attending: boolean;
  plus_one_name?: string | null;
  meal_preference?: 'Beef' | 'Fish' | 'Vegetarian' | 'Kids' | null;
  transport?: 'has_car' | 'needs_shuttle' | 'own_arrangement' | null;
  favorite_memory?: string | null;
  message_to_couple?: string | null;
}

export interface GuestRsvpResponse {
  id: number;
  guest_name: string;
  email?: string | null;
  guest_group_id?: number | null;
  attending: boolean;
  plus_one_name: string | null;
  meal_preference: string | null;
  transport: string | null;
  favorite_memory: string | null;
  message_to_couple: string | null;
  confirmation_code: string;
  submitted_at?: string | null;
}

export interface GuestRsvpLookupResponse {
  rsvp: GuestRsvpResponse | null;
  latest_rsvp: GuestRsvpResponse | null;
  rsvps: GuestRsvpResponse[];
}

export interface SubmitGuestRsvpResponse {
  rsvp: GuestRsvpResponse;
  confirmation_code: string;
}

export async function getGuestRsvp(): Promise<GuestRsvpLookupResponse> {
  return apiClient.get<GuestRsvpLookupResponse>('/guest/rsvp', {
    requiresCsrf: false,
  });
}

export async function submitGuestRsvp(payload: GuestRsvpPayload): Promise<SubmitGuestRsvpResponse> {
  return apiClient.post<SubmitGuestRsvpResponse, GuestRsvpPayload>('/guest/rsvp', payload, {
    requiresCsrf: false,
  });
}

export interface GuestWish {
  id: number;
  guest_name: string;
  message: string;
  is_flagged: boolean;
  created_at: string;
}

export interface GuestWishesResponse {
  wishes: GuestWish[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export interface GuestWishPayload {
  guest_name: string;
  message: string;
}

export interface GuestWishMutationResponse {
  wish: GuestWish;
  message?: string;
}

export async function getGuestWishes(page = 1, perPage = 10): Promise<GuestWishesResponse> {
  return apiClient.get<GuestWishesResponse>(`/guest/wishes?page=${page}&per_page=${perPage}`, {
    requiresCsrf: false,
  });
}

export async function createGuestWish(payload: GuestWishPayload): Promise<GuestWishMutationResponse> {
  return apiClient.post<GuestWishMutationResponse, GuestWishPayload>('/guest/wishes', payload, {
    requiresCsrf: false,
  });
}

export async function flagGuestWish(id: number): Promise<GuestWishMutationResponse> {
  return apiClient.post<GuestWishMutationResponse, Record<string, never>>(`/guest/wishes/${id}/flag`, {}, {
    requiresCsrf: false,
  });
}

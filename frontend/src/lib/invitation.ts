import { apiClient } from '@/lib/api';
import {
  InvitationTemplateSummary,
  EntourageMember,
  GiftMethod,
  LoveStoryChapter,
  MediaDraft,
  MediaItem,
  ThemeDesignDraft,
  WeddingDetailsDraft,
  WeddingProgramDraft,
} from '@/types/builder';

export type SaveInvitationDraftPayload = WeddingDetailsDraft & WeddingProgramDraft & ThemeDesignDraft & MediaDraft;

export interface SaveInvitationDraftResponse {
  message?: string;
  invitation?: {
    id?: number;
    slug?: string;
    guest_code?: string;
    status?: string;
    gift_methods?: GiftMethod[] | null;
  } & Record<string, unknown>;
}

export interface ListTemplatesResponse {
  templates: InvitationTemplateSummary[];
}

export interface MediaListResponse {
  media: Partial<Record<MediaItem['type'], MediaItem[]>>;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export interface MediaUploadResponse {
  id: number;
  url: string;
  type: MediaItem['type'];
  file_size_bytes: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export interface LoveStoryListResponse {
  chapters: LoveStoryChapter[];
}

export interface LoveStoryChapterResponse {
  chapter: LoveStoryChapter;
}

export interface EntourageListResponse {
  members: EntourageMember[];
}

export interface EntourageMemberResponse {
  member: EntourageMember;
}

export interface InvitationResponse {
  invitation: {
    id: number;
    slug: string;
    guest_code: string;
    status: string;
    partner1_name?: string | null;
    partner2_name?: string | null;
    wedding_date?: string | null;
    wedding_time?: string | null;
    venue_name?: string | null;
    venue_address?: string | null;
    dress_code?: string | null;
    dress_code_colors?: string[] | null;
    schedule?: WeddingProgramDraft['schedule'] | null;
    theme_key?: ThemeDesignDraft['theme_key'] | null;
    font_pairing?: string | null;
    template_id?: number | null;
    color_palette?: ThemeDesignDraft['color_palette'] | null;
    prenup_video_url?: string | null;
    music_url?: string | null;
    gift_methods?: GiftMethod[] | null;
  } & Record<string, unknown>;
}

export interface InvitationPreviewResponse {
  preview_mode: true;
  invitation: InvitationResponse['invitation'];
  template: InvitationTemplateSummary | null;
  love_story_chapters: LoveStoryChapter[];
  entourage_members: EntourageMember[];
  media: Partial<Record<MediaItem['type'], MediaItem[]>>;
}

export async function saveInvitationDraft(
  payload: SaveInvitationDraftPayload,
): Promise<SaveInvitationDraftResponse> {
  return apiClient.put<SaveInvitationDraftResponse, SaveInvitationDraftPayload>(
    '/invitation',
    payload,
    {
      requiresCsrf: true,
    },
  );
}

export async function listTemplates(): Promise<ListTemplatesResponse> {
  return apiClient.get<ListTemplatesResponse>('/templates', {
    requiresCsrf: false,
  });
}

export async function listMedia(): Promise<MediaListResponse> {
  return apiClient.get<MediaListResponse>('/media', {
    requiresCsrf: false,
  });
}

export async function uploadMedia(payload: {
  file: File;
  type: MediaItem['type'];
  invitation_id?: number;
  onUploadProgress?: (loaded: number, total: number) => void;
}): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('type', payload.type);
  if (payload.invitation_id) {
    formData.append('invitation_id', String(payload.invitation_id));
  }

  return apiClient.post<MediaUploadResponse, FormData>('/media/upload', formData, {
    requiresCsrf: true,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      payload.onUploadProgress?.(event.loaded, event.total ?? event.loaded);
    },
  });
}

export async function deleteMedia(id: number): Promise<void> {
  await apiClient.delete<void>(`/media/${id}`, {
    requiresCsrf: true,
  });
}

export async function listLoveStoryChapters(): Promise<LoveStoryListResponse> {
  return apiClient.get<LoveStoryListResponse>('/love-story', {
    requiresCsrf: false,
  });
}

export interface UpsertLoveStoryChapterPayload {
  title: string;
  story_text: string;
  photo_path?: string | null;
  chapter_date?: string | null;
  sort_order?: number;
}

export async function createLoveStoryChapter(payload: UpsertLoveStoryChapterPayload): Promise<LoveStoryChapterResponse> {
  return apiClient.post<LoveStoryChapterResponse, UpsertLoveStoryChapterPayload>('/love-story', payload, {
    requiresCsrf: true,
  });
}

export async function updateLoveStoryChapter(
  id: number,
  payload: Partial<UpsertLoveStoryChapterPayload>,
): Promise<LoveStoryChapterResponse> {
  return apiClient.put<LoveStoryChapterResponse, Partial<UpsertLoveStoryChapterPayload>>(`/love-story/${id}`, payload, {
    requiresCsrf: true,
  });
}

export async function deleteLoveStoryChapter(id: number): Promise<void> {
  await apiClient.delete<void>(`/love-story/${id}`, {
    requiresCsrf: true,
  });
}

export async function reorderLoveStoryChapters(ids: number[]): Promise<{ message: string }> {
  return apiClient.post<{ message: string }, { ids: number[] }>(
    '/love-story/reorder',
    { ids },
    {
      requiresCsrf: true,
    },
  );
}

export interface UpsertEntourageMemberPayload {
  name: string;
  role: EntourageMember['role'];
  photo_path?: string | null;
  sort_order?: number;
}

export async function listEntourageMembers(): Promise<EntourageListResponse> {
  return apiClient.get<EntourageListResponse>('/entourage', {
    requiresCsrf: false,
  });
}

export async function createEntourageMember(payload: UpsertEntourageMemberPayload): Promise<EntourageMemberResponse> {
  return apiClient.post<EntourageMemberResponse, UpsertEntourageMemberPayload>('/entourage', payload, {
    requiresCsrf: true,
  });
}

export async function updateEntourageMember(
  id: number,
  payload: Partial<UpsertEntourageMemberPayload>,
): Promise<EntourageMemberResponse> {
  return apiClient.put<EntourageMemberResponse, Partial<UpsertEntourageMemberPayload>>(`/entourage/${id}`, payload, {
    requiresCsrf: true,
  });
}

export async function deleteEntourageMember(id: number): Promise<void> {
  await apiClient.delete<void>(`/entourage/${id}`, {
    requiresCsrf: true,
  });
}

export async function reorderEntourageMembers(ids: number[]): Promise<{ message: string }> {
  return apiClient.post<{ message: string }, { ids: number[] }>(
    '/entourage/reorder',
    { ids },
    {
      requiresCsrf: true,
    },
  );
}

export async function saveGiftMethods(gift_methods: GiftMethod[]): Promise<SaveInvitationDraftResponse> {
  return apiClient.put<SaveInvitationDraftResponse, { gift_methods: GiftMethod[] }>(
    '/invitation',
    { gift_methods },
    {
      requiresCsrf: true,
    },
  );
}

export async function getInvitation(): Promise<InvitationResponse> {
  return apiClient.get<InvitationResponse>('/invitation', {
    requiresCsrf: false,
  });
}

export async function createInvitation(): Promise<InvitationResponse & { message?: string }> {
  return apiClient.post<InvitationResponse & { message?: string }, Record<string, never>>(
    '/invitation',
    {},
    {
      requiresCsrf: true,
    },
  );
}

export async function regenerateGuestCode(): Promise<{ guest_code: string; message: string }> {
  return apiClient.post<{ guest_code: string; message: string }, Record<string, never>>(
    '/invitation/regenerate-code',
    {},
    {
      requiresCsrf: true,
    },
  );
}

export async function publishInvitation(): Promise<SaveInvitationDraftResponse> {
  return apiClient.post<SaveInvitationDraftResponse, Record<string, never>>(
    '/invitation/publish',
    {},
    {
      requiresCsrf: true,
    },
  );
}

export async function unpublishInvitation(): Promise<SaveInvitationDraftResponse> {
  return apiClient.post<SaveInvitationDraftResponse, Record<string, never>>(
    '/invitation/unpublish',
    {},
    {
      requiresCsrf: true,
    },
  );
}

export async function previewInvitation(): Promise<InvitationPreviewResponse> {
  return apiClient.get<InvitationPreviewResponse>('/invitation/preview', {
    requiresCsrf: false,
  });
}

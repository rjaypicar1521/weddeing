/**
 * Canonical invitation-facing types used by guest pages and related UI modules.
 */

export interface ScheduleItem {
  time?: string;
  event?: string;
  description?: string;
}

export interface LoveStoryItem {
  id?: number;
  title?: string;
  story_text?: string;
  photo_path?: string | null;
  chapter_date?: string | null;
  sort_order?: number;
}

export interface EntourageItem {
  id?: number;
  name?: string;
  role?: string;
  photo_path?: string | null;
  sort_order?: number;
}

export interface GiftMethod {
  label?: string;
  qr_path?: string;
  account_name?: string;
  account_number?: string;
}

export interface GalleryMediaItem {
  id?: number;
  url?: string;
  file_path?: string;
  file_name?: string;
}

export interface SectionLink {
  id: string;
  label: string;
}

export interface GuestWish {
  id: number;
  guest_name: string;
  message: string;
  is_flagged: boolean;
  created_at: string;
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

export interface InvitationTemplate {
  name?: string;
  slug?: string;
  region?: string;
  preview_image_path?: string;
}

export interface InvitationMediaMap {
  hero?: Array<{ url?: string; type?: string }>;
  gallery?: Array<{ url?: string; file_path?: string; file_name?: string; id?: number }>;
  chapter?: Array<{ url?: string; type?: string }>;
  entourage?: Array<{ url?: string; type?: string }>;
  qr_code?: Array<{ url?: string; type?: string }>;
}

export interface InvitationData {
  id?: number;
  slug?: string;
  status?: string;
  plan?: string;
  user_plan?: string;
  partner1_name?: string;
  partner2_name?: string;
  wedding_date?: string;
  wedding_time?: string;
  venue_name?: string;
  venue_address?: string;
  dress_code?: string;
  dress_code_colors?: string[];
  schedule?: ScheduleItem[];
  music_url?: string | null;
  prenup_video_url?: string | null;
  gift_methods?: GiftMethod[];
  color_palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    surface?: string;
    ink?: string;
    text?: string;
  };
}

export interface GuestInvitationPayload {
  invitation: InvitationData;
  template?: InvitationTemplate | null;
  media?: InvitationMediaMap;
  love_story_chapters?: LoveStoryItem[];
  entourage_members?: EntourageItem[];
  wishes?: GuestWish[];
  group?: GuestInvitationGroup | null;
}

export interface InvitationViewModel {
  invitation: InvitationData;
  template: InvitationTemplate | null;
  media: InvitationMediaMap;
  loveStoryChapters: LoveStoryItem[];
  entourageMembers: EntourageItem[];
  wishes: GuestWish[];
  group: GuestInvitationGroup | null;
}


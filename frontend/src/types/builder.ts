export const BUILDER_SECTIONS = [
  { id: 'wedding-details', label: 'Wedding Details' },
  { id: 'theme-design', label: 'Theme & Design' },
  { id: 'media', label: 'Media' },
  { id: 'love-story', label: 'Love Story' },
  { id: 'entourage', label: 'Entourage' },
  { id: 'gift-qr', label: 'Gift & QR' },
  { id: 'guest-access', label: 'Guest Access' },
  { id: 'publish', label: 'Publish' },
  { id: 'wedding-program', label: 'Wedding Program' },
] as const;

export type BuilderSectionId = (typeof BUILDER_SECTIONS)[number]['id'];

export interface BuilderSectionDraft {
  complete: boolean;
}

export type BuilderSectionsDraft = Record<BuilderSectionId, BuilderSectionDraft>;

export interface WeddingScheduleItem {
  id: string;
  time: string;
  event: string;
  description: string;
}

export interface WeddingDetailsDraft {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  venue_address: string;
  dress_code: string;
  dress_code_colors: string[];
}

export interface WeddingProgramDraft {
  schedule: WeddingScheduleItem[];
}

export interface ThemeColorPalette {
  accent: string;
  secondary: string;
  surface: string;
  text: string;
}

export type WeddingThemeKey =
  | 'minimal-gold'
  | 'bohemian'
  | 'classic-navy'
  | 'tropical'
  | 'vintage-rose'
  | 'modern-black';

export interface WeddingThemeOption {
  key: WeddingThemeKey;
  name: string;
  description: string;
  font_label: string;
  palette: ThemeColorPalette;
}

export const WEDDING_THEMES: WeddingThemeOption[] = [
  {
    key: 'minimal-gold',
    name: 'Minimal Gold',
    description: 'Clean layout with warm gold accents.',
    font_label: 'Playfair + Inter',
    palette: {
      accent: '#C9A227',
      secondary: '#F4E8C1',
      surface: '#FFFDF7',
      text: '#2A2012',
    },
  },
  {
    key: 'bohemian',
    name: 'Bohemian',
    description: 'Earthy and artistic styling with soft contrast.',
    font_label: 'Cormorant + Lato',
    palette: {
      accent: '#B97850',
      secondary: '#E9D2BF',
      surface: '#FFF7F0',
      text: '#3B2A20',
    },
  },
  {
    key: 'classic-navy',
    name: 'Classic Navy',
    description: 'Elegant formal tone with navy highlights.',
    font_label: 'Merriweather + Source Sans',
    palette: {
      accent: '#1F3A5F',
      secondary: '#D7E1EE',
      surface: '#F7FAFF',
      text: '#122033',
    },
  },
  {
    key: 'tropical',
    name: 'Tropical',
    description: 'Vibrant celebration with island-inspired colors.',
    font_label: 'Poppins + Nunito',
    palette: {
      accent: '#0E9F6E',
      secondary: '#C8F2E3',
      surface: '#F3FFFA',
      text: '#0F3327',
    },
  },
  {
    key: 'vintage-rose',
    name: 'Vintage Rose',
    description: 'Romantic classic look with rose notes.',
    font_label: 'Libre Baskerville + Karla',
    palette: {
      accent: '#B96A7A',
      secondary: '#F0D7DE',
      surface: '#FFF7FA',
      text: '#3A232A',
    },
  },
  {
    key: 'modern-black',
    name: 'Modern Black',
    description: 'Bold and modern high-contrast presentation.',
    font_label: 'Manrope + Inter',
    palette: {
      accent: '#121212',
      secondary: '#3E3E3E',
      surface: '#F6F6F6',
      text: '#111111',
    },
  },
];

export interface ThemeDesignDraft {
  theme_key: WeddingThemeKey | null;
  font_pairing: string | null;
  template_id: number | null;
  color_palette: ThemeColorPalette | null;
}

export interface MediaDraft {
  prenup_video_url: string;
  music_url: string;
}

export interface LoveStoryChapter {
  id: number;
  invitation_id: number;
  title: string;
  story_text: string;
  photo_path: string | null;
  chapter_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type EntourageRole = 'ninong' | 'ninang' | 'bridesmaid' | 'groomsman' | 'flower_girl' | 'ring_bearer';

export interface EntourageMember {
  id: number;
  invitation_id: number;
  name: string;
  role: EntourageRole;
  photo_path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GiftMethod {
  label: string;
  qr_path: string;
  account_name: string;
  account_number: string;
}

export interface MediaItem {
  id: number;
  invitation_id: number;
  user_id: number;
  type: 'hero' | 'gallery' | 'entourage' | 'chapter' | 'qr_code';
  file_path: string;
  file_name: string | null;
  file_size_bytes: number;
  mime_type: string | null;
  url: string;
}

export interface InvitationTemplateSummary {
  id: number;
  name: string;
  slug: string;
  preview_image_path: string;
  plan_required: 'free' | 'premium';
  region: string;
  is_active: boolean;
}

export function createInitialWeddingDetails(): WeddingDetailsDraft {
  return {
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    wedding_time: '',
    venue_name: '',
    venue_address: '',
    dress_code: '',
    dress_code_colors: [],
  };
}

export function createInitialWeddingProgram(): WeddingProgramDraft {
  return {
    schedule: [],
  };
}

export function createInitialThemeDesign(): ThemeDesignDraft {
  return {
    theme_key: null,
    font_pairing: null,
    template_id: null,
    color_palette: null,
  };
}

export function createInitialMediaDraft(): MediaDraft {
  return {
    prenup_video_url: '',
    music_url: '',
  };
}

export function createInitialBuilderSections(): BuilderSectionsDraft {
  return BUILDER_SECTIONS.reduce((accumulator, section) => {
    accumulator[section.id] = {
      complete: false,
    };

    return accumulator;
  }, {} as BuilderSectionsDraft);
}

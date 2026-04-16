import { create } from 'zustand';
import {
  BUILDER_SECTIONS,
  BuilderSectionId,
  BuilderSectionsDraft,
  MediaDraft,
  ThemeDesignDraft,
  WeddingDetailsDraft,
  WeddingProgramDraft,
  createInitialBuilderSections,
  createInitialMediaDraft,
  createInitialThemeDesign,
  createInitialWeddingDetails,
  createInitialWeddingProgram,
} from '@/types/builder';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface BuilderStoreState {
  activeSectionId: BuilderSectionId;
  sections: BuilderSectionsDraft;
  weddingDetails: WeddingDetailsDraft;
  weddingProgram: WeddingProgramDraft;
  themeDesign: ThemeDesignDraft;
  mediaDraft: MediaDraft;
  hasUnsavedChanges: boolean;
  saveState: SaveState;
  lastSavedAt: string | null;
  setActiveSection: (sectionId: BuilderSectionId) => void;
  updateWeddingDetails: (payload: WeddingDetailsDraft) => void;
  updateWeddingProgram: (payload: WeddingProgramDraft) => void;
  updateThemeDesign: (payload: ThemeDesignDraft) => void;
  updateMediaDraft: (payload: MediaDraft) => void;
  updateSectionCompletion: (sectionId: BuilderSectionId, complete: boolean) => void;
  hydrateBuilder: (payload: {
    weddingDetails: WeddingDetailsDraft;
    weddingProgram: WeddingProgramDraft;
    themeDesign: ThemeDesignDraft;
    mediaDraft: MediaDraft;
  }) => void;
  markSaving: () => void;
  markSaved: (savedAt: string) => void;
  markSaveError: () => void;
}

const defaultSectionId = BUILDER_SECTIONS[0].id;

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function areWeddingDetailsEqual(left: WeddingDetailsDraft, right: WeddingDetailsDraft): boolean {
  return (
    left.partner1_name === right.partner1_name &&
    left.partner2_name === right.partner2_name &&
    left.wedding_date === right.wedding_date &&
    left.wedding_time === right.wedding_time &&
    left.venue_name === right.venue_name &&
    left.venue_address === right.venue_address &&
    left.dress_code === right.dress_code &&
    areStringArraysEqual(left.dress_code_colors, right.dress_code_colors)
  );
}

function areWeddingProgramsEqual(left: WeddingProgramDraft, right: WeddingProgramDraft): boolean {
  if (left.schedule.length !== right.schedule.length) {
    return false;
  }

  return left.schedule.every((item, index) => {
    const other = right.schedule[index];

    return (
      item.id === other.id &&
      item.time === other.time &&
      item.event === other.event &&
      item.description === other.description
    );
  });
}

function areThemeDesignEqual(left: ThemeDesignDraft, right: ThemeDesignDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areMediaDraftEqual(left: MediaDraft, right: MediaDraft): boolean {
  return left.prenup_video_url === right.prenup_video_url && left.music_url === right.music_url;
}

function isWeddingProgramItemComplete(item: WeddingProgramDraft["schedule"][number]): boolean {
  return item.time.trim().length > 0 && item.event.trim().length > 0;
}

function hasCompleteWeddingProgramItem(payload: WeddingProgramDraft): boolean {
  return payload.schedule.some(isWeddingProgramItemComplete);
}

function isWeddingDetailsComplete(payload: WeddingDetailsDraft): boolean {
  return (
    payload.partner1_name.trim().length > 0 &&
    payload.partner2_name.trim().length > 0 &&
    payload.wedding_date.trim().length > 0 &&
    payload.venue_name.trim().length > 0
  );
}

export const useBuilderStore = create<BuilderStoreState>((set) => ({
  activeSectionId: defaultSectionId,
  sections: createInitialBuilderSections(),
  weddingDetails: createInitialWeddingDetails(),
  weddingProgram: createInitialWeddingProgram(),
  themeDesign: createInitialThemeDesign(),
  mediaDraft: createInitialMediaDraft(),
  hasUnsavedChanges: false,
  saveState: 'idle',
  lastSavedAt: null,
  setActiveSection: (sectionId) => {
    set({ activeSectionId: sectionId });
  },
  updateWeddingDetails: (payload) => {
    set((state) => ({
      ...(areWeddingDetailsEqual(state.weddingDetails, payload)
        ? {}
        : {
      weddingDetails: payload,
      sections: {
        ...state.sections,
        'wedding-details': {
          complete: isWeddingDetailsComplete(payload),
        },
      },
      hasUnsavedChanges: true,
      saveState: state.saveState === 'error' ? 'idle' : state.saveState,
        }),
    }));
  },
  updateWeddingProgram: (payload) => {
    set((state) => ({
      ...(areWeddingProgramsEqual(state.weddingProgram, payload)
        ? {}
        : {
      weddingProgram: payload,
      sections: {
        ...state.sections,
        'wedding-program': {
          complete: hasCompleteWeddingProgramItem(payload),
        },
      },
      hasUnsavedChanges: true,
      saveState: state.saveState === 'error' ? 'idle' : state.saveState,
        }),
    }));
  },
  updateThemeDesign: (payload) => {
    set((state) => ({
      ...(areThemeDesignEqual(state.themeDesign, payload)
        ? {}
        : {
      themeDesign: payload,
      sections: {
        ...state.sections,
        'theme-design': {
          complete: payload.template_id !== null || payload.theme_key !== null,
        },
      },
      hasUnsavedChanges: true,
      saveState: state.saveState === 'error' ? 'idle' : state.saveState,
        }),
    }));
  },
  updateMediaDraft: (payload) => {
    set((state) => ({
      ...(areMediaDraftEqual(state.mediaDraft, payload)
        ? {}
        : {
      mediaDraft: payload,
      hasUnsavedChanges: true,
      saveState: state.saveState === 'error' ? 'idle' : state.saveState,
        }),
    }));
  },
  updateSectionCompletion: (sectionId, complete) => {
    set((state) => {
      if (state.sections[sectionId].complete === complete) {
        return state;
      }

      return {
        sections: {
          ...state.sections,
          [sectionId]: {
            complete,
          },
        },
      };
    });
  },
  hydrateBuilder: (payload) => {
    set((state) => ({
      weddingDetails: payload.weddingDetails,
      weddingProgram: payload.weddingProgram,
      themeDesign: payload.themeDesign,
      mediaDraft: payload.mediaDraft,
      sections: {
        ...state.sections,
        'wedding-details': {
          complete: isWeddingDetailsComplete(payload.weddingDetails),
        },
        'wedding-program': {
          complete: hasCompleteWeddingProgramItem(payload.weddingProgram),
        },
        'theme-design': {
          complete: payload.themeDesign.template_id !== null || payload.themeDesign.theme_key !== null,
        },
      },
      hasUnsavedChanges: false,
      saveState: 'idle',
    }));
  },
  markSaving: () => {
    set({ saveState: 'saving' });
  },
  markSaved: (savedAt) => {
    set({
      hasUnsavedChanges: false,
      saveState: 'saved',
      lastSavedAt: savedAt,
    });
  },
  markSaveError: () => {
    set({ saveState: 'error' });
  },
}));


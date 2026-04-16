"use client";

import { EntourageSection } from '@/components/builder/sections/EntourageSection';
import { GiftQrSection } from '@/components/builder/sections/GiftQrSection';
import { GuestAccessSection } from '@/components/builder/sections/GuestAccessSection';
import { LoveStorySection } from '@/components/builder/sections/LoveStorySection';
import { MediaSection } from '@/components/builder/sections/MediaSection';
import { PublishSection } from '@/components/builder/sections/PublishSection';
import { ThemeDesignSection } from '@/components/builder/sections/ThemeDesignSection';
import { WeddingDetailsSection } from '@/components/builder/sections/WeddingDetailsSection';
import { WeddingProgramSection } from '@/components/builder/sections/WeddingProgramSection';
import { cn } from '@/lib/utils';
import {
  BUILDER_SECTIONS,
  BuilderSectionId,
  BuilderSectionsDraft,
  MediaDraft,
  ThemeDesignDraft,
  WeddingDetailsDraft,
  WeddingProgramDraft,
} from '@/types/builder';

interface BuilderCanvasProps {
  activeSectionId: BuilderSectionId;
  sections: BuilderSectionsDraft;
  weddingDetails: WeddingDetailsDraft;
  weddingProgram: WeddingProgramDraft;
  themeDesign: ThemeDesignDraft;
  mediaDraft: MediaDraft;
  onWeddingDetailsChange: (payload: WeddingDetailsDraft) => void;
  onWeddingProgramChange: (payload: WeddingProgramDraft) => void;
  onThemeDesignChange: (payload: ThemeDesignDraft) => void;
  onMediaDraftChange: (payload: MediaDraft) => void;
  onMediaCompletionChange: (complete: boolean) => void;
  onLoveStoryCompletionChange: (complete: boolean) => void;
  onEntourageCompletionChange: (complete: boolean) => void;
  onGiftQrCompletionChange: (complete: boolean) => void;
  onGuestAccessCompletionChange: (complete: boolean) => void;
  onPublishCompletionChange: (complete: boolean) => void;
  setSectionRef: (sectionId: BuilderSectionId, element: HTMLElement | null) => void;
}

export function BuilderCanvas({
  activeSectionId,
  sections,
  weddingDetails,
  weddingProgram,
  themeDesign,
  mediaDraft,
  onWeddingDetailsChange,
  onWeddingProgramChange,
  onThemeDesignChange,
  onMediaDraftChange,
  onMediaCompletionChange,
  onLoveStoryCompletionChange,
  onEntourageCompletionChange,
  onGiftQrCompletionChange,
  onGuestAccessCompletionChange,
  onPublishCompletionChange,
  setSectionRef,
}: BuilderCanvasProps) {
  const renderSection = (sectionId: BuilderSectionId) => {
    if (sectionId === 'wedding-details') {
      return <WeddingDetailsSection value={weddingDetails} onChange={onWeddingDetailsChange} />;
    }

    if (sectionId === 'wedding-program') {
      return <WeddingProgramSection value={weddingProgram} onChange={onWeddingProgramChange} />;
    }

    if (sectionId === 'theme-design') {
      return <ThemeDesignSection value={themeDesign} onChange={onThemeDesignChange} />;
    }

    if (sectionId === 'media') {
      return (
        <MediaSection
          value={mediaDraft}
          onChange={onMediaDraftChange}
          onHeroUploadedChange={onMediaCompletionChange}
        />
      );
    }

    if (sectionId === 'love-story') {
      return <LoveStorySection onCompletionChange={onLoveStoryCompletionChange} />;
    }

    if (sectionId === 'entourage') {
      return <EntourageSection onCompletionChange={onEntourageCompletionChange} />;
    }

    if (sectionId === 'gift-qr') {
      return <GiftQrSection onCompletionChange={onGiftQrCompletionChange} />;
    }

    if (sectionId === 'guest-access') {
      return <GuestAccessSection onCompletionChange={onGuestAccessCompletionChange} />;
    }

    return <PublishSection sections={sections} onCompletionChange={onPublishCompletionChange} />;
  };

  return (
    <div className='space-y-4'>
      {BUILDER_SECTIONS.map((section) => (
        <div key={section.id} id={section.id} ref={(element) => setSectionRef(section.id, element)}>
          <div className={cn('scroll-mt-28', activeSectionId === section.id ? 'ring-2 ring-neutral-900' : '')}>
            {renderSection(section.id)}
          </div>
        </div>
      ))}
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SectionLink } from '@/lib/types';

/**
 * Floating control cluster for map/RSVP/top shortcuts.
 */
export function StickyControls({
  showBackToTop,
  showStickyMapCta,
  showStickyRsvpCta,
  showSectionNav,
  sectionLinks,
  activeSection,
  onSectionChange,
}: {
  showBackToTop: boolean;
  showStickyMapCta: boolean;
  showStickyRsvpCta: boolean;
  showSectionNav: boolean;
  sectionLinks: SectionLink[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  const [isSectionRailOpen, setIsSectionRailOpen] = useState(false);

  useEffect(() => {
    if (!showSectionNav) {
      setIsSectionRailOpen(false);
    }
  }, [showSectionNav]);

  const currentSection = useMemo(
    () => sectionLinks.find((link) => link.id === activeSection) ?? sectionLinks[0] ?? null,
    [activeSection, sectionLinks],
  );

  if (!showBackToTop && !showStickyMapCta && !showStickyRsvpCta && !showSectionNav) return null;

  return (
    <div className='fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] sm:inset-x-6 sm:bottom-6 sm:items-end sm:pb-0 md:inset-x-8 lg:inset-x-auto lg:right-10'>
      {showSectionNav ? (
        <div
          className='w-full border bg-white p-2 shadow-none sm:w-auto'
          style={{ borderColor: 'var(--brand-border)' }}
        >
          <div className='flex items-center justify-between gap-2'>
            <Badge className='border-[color:var(--brand-border)] bg-white text-[color:var(--brand-ink)]'>
              Now: {currentSection?.label ?? 'Journey'}
            </Badge>
            <Button
              type='button'
              variant='outline'
              className='habibi-btn h-8 rounded-none px-3 text-[11px]'
              style={{ borderColor: 'var(--brand-border)' }}
              onClick={() => setIsSectionRailOpen((prev) => !prev)}
              aria-expanded={isSectionRailOpen}
              aria-label='Toggle quick section navigation'
            >
              {isSectionRailOpen ? 'Hide Sections' : 'Sections'}
            </Button>
          </div>
          {isSectionRailOpen ? (
            <div className='mt-2 flex max-w-[92vw] flex-wrap gap-2 sm:max-w-[540px]'>
              {sectionLinks.map((link) => {
                const isActive = link.id === activeSection;
                return (
                  <Button
                    key={link.id}
                    type='button'
                    variant='outline'
                    className='habibi-btn h-8 rounded-none px-3 text-[11px]'
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--brand-primary)',
                            color: 'var(--brand-on-primary)',
                            borderColor: 'var(--brand-primary)',
                          }
                        : { borderColor: 'var(--brand-border)' }
                    }
                    onClick={() => {
                      onSectionChange(link.id);
                      setIsSectionRailOpen(false);
                    }}
                    aria-current={isActive ? 'location' : undefined}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className='flex gap-2 sm:justify-end'>
        {showBackToTop ? (
          <Button
            type='button'
            variant='outline'
            className='habibi-btn rounded-none bg-white text-[11px] text-neutral-800 shadow-none'
            style={{ borderColor: 'var(--brand-border)' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label='Scroll to top'
          >
            Back to Top
          </Button>
        ) : null}
        {showStickyMapCta ? (
          <Button
            type='button'
            variant='outline'
            className='habibi-btn rounded-none bg-white text-[11px] text-[color:var(--brand-ink)] shadow-none'
            style={{ borderColor: 'var(--brand-border)' }}
            onClick={() => onSectionChange('venue-section')}
            aria-label='Jump to venue map section'
          >
            Map
          </Button>
        ) : null}
        {showStickyRsvpCta ? (
          <Button
            type='button'
            className='habibi-btn w-full rounded-none text-[11px] text-[color:var(--brand-on-primary)] shadow-none hover:opacity-95 sm:w-auto lg:px-6'
            style={{ backgroundColor: 'var(--brand-primary)' }}
            onClick={() => onSectionChange('rsvp-section')}
            aria-label='RSVP to this invitation'
          >
            RSVP Now
          </Button>
        ) : null}
      </div>
    </div>
  );
}

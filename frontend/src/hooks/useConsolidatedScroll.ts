'use client';

import { useEffect, useRef, useState } from 'react';

interface ConsolidatedScrollOptions {
  sectionIds: string[];
  rsvpSectionId: string;
}

interface ConsolidatedScrollState {
  activeSection: string;
  isRsvpInView: boolean;
  scrollY: number;
}

/**
 * Single RAF-throttled scroll observer for active section, RSVP visibility, and global Y position.
 */
export function useConsolidatedScroll(options: ConsolidatedScrollOptions): ConsolidatedScrollState {
  const [state, setState] = useState<ConsolidatedScrollState>({
    activeSection: options.sectionIds[0] ?? 'story-section',
    isRsvpInView: false,
    scrollY: 0,
  });

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const run = () => {
      const sections = options.sectionIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

      const offset = window.innerHeight * 0.22;
      const current =
        [...sections].reverse().find((section) => section.getBoundingClientRect().top <= offset) ??
        sections[0];

      const rsvpEl = document.getElementById(options.rsvpSectionId);
      let rsvpVisible = false;
      if (rsvpEl) {
        const rect = rsvpEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        rsvpVisible = rect.top <= viewportHeight * 0.78 && rect.bottom >= 140;
      }

      setState((prev) => ({
        activeSection: current?.id ?? prev.activeSection,
        isRsvpInView: rsvpVisible,
        scrollY: window.scrollY,
      }));
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        run();
      });
    };

    run();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [options.rsvpSectionId, options.sectionIds]);

  return state;
}


'use client';

import { useEffect, useRef } from 'react';

/**
 * Locks body scroll while active and safely restores prior overflow state on cleanup.
 */
export function useLockBodyScroll(active: boolean): void {
  const previousOverflowRef = useRef<string | null>(null);
  const previousHtmlOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;

    previousOverflowRef.current = document.body.style.overflow;
    previousHtmlOverflowRef.current = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
      }
      if (previousHtmlOverflowRef.current !== null) {
        document.documentElement.style.overflow = previousHtmlOverflowRef.current;
      }
      previousOverflowRef.current = null;
      previousHtmlOverflowRef.current = null;
    };
  }, [active]);
}


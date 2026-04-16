'use client';

import { useEffect } from 'react';

/**
 * Adds a beforeunload prompt when the view has unsaved user input.
 */
export function useUnsavedChangesGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);
}


"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUILDER_SECTIONS, BuilderSectionId, BuilderSectionsDraft } from '@/types/builder';

interface BuilderSidebarProps {
  activeSectionId: BuilderSectionId;
  sections: BuilderSectionsDraft;
  onSectionSelect: (sectionId: BuilderSectionId) => void;
  className?: string;
}

export function BuilderSidebar({ activeSectionId, sections, onSectionSelect, className }: BuilderSidebarProps) {
  return (
    <aside className={cn('space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm', className)}>
      <h2 className='text-lg font-semibold'>Invitation Builder</h2>
      <p className='text-sm text-neutral-600'>Build your invitation section by section.</p>

      <nav className='space-y-2' aria-label='Builder sections'>
        {BUILDER_SECTIONS.map((section, index) => {
          const isActive = section.id === activeSectionId;
          const isComplete = sections[section.id]?.complete;

          return (
            <Button
              key={section.id}
              type='button'
              variant='outline'
              className={cn(
                'h-auto w-full justify-between gap-3 px-3 py-2 text-left',
                isActive && 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800',
              )}
              onClick={() => onSectionSelect(section.id)}
            >
              <span className='flex items-center gap-2 text-sm font-medium'>
                <span>{index + 1}.</span>
                <span>{section.label}</span>
              </span>
              <Badge className={cn(isActive ? 'border-white/40 bg-white/20 text-white' : '')}>
                {isComplete ? 'complete' : 'incomplete'}
              </Badge>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}

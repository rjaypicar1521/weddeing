'use client';

import { Card, CardContent } from '@/components/ui/card';
import { SectionHeading } from '@/components/invitation/SectionHeading';

/**
 * Dress code and suggested palette section.
 */
export function DressCodeSection({
  dressCode,
  dressColors,
}: {
  dressCode: string;
  dressColors: string[];
}) {
  return (
    <Card className='habibi-panel'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Style Notes'
          title='Dress Code'
          description="Come dressed for the mood of the celebration, with a palette that complements the couple's chosen aesthetic."
        />
        <p className='max-w-3xl text-sm leading-7 text-[color:var(--brand-ink)]'>{dressCode}</p>
        <div className='flex flex-wrap gap-4'>
          {dressColors.length === 0 ? (
            <p className='text-sm text-[color:var(--brand-muted-text)]'>Color palette to be announced.</p>
          ) : (
            dressColors.map((color) => (
              <div
                key={color}
                className='min-w-[96px] border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] p-3 text-center shadow-none'
              >
                <span
                  className='mx-auto block h-12 w-12 rounded-full border border-[color:var(--brand-border)] grayscale'
                  style={{ backgroundColor: color }}
                  aria-label={`Dress color ${color}`}
                  title={color}
                />
                <p className='mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--brand-muted-text)]'>
                  {color}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

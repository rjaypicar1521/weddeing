'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineLine, TimelinePoint } from '@/components/ui/timeline';
import { resolveAssetUrl } from '@/lib/asset-utils';
import { formatWeddingDate } from '@/lib/date-utils';
import type { LoveStoryItem } from '@/lib/types';
import { SectionHeading } from '@/components/invitation/SectionHeading';

/**
 * Story timeline section for relationship chapters.
 */
export function LoveStoryTimeline({ chapters }: { chapters: LoveStoryItem[] }) {
  return (
    <Card className='habibi-panel'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Our Story'
          title='Love Story Timeline'
          description='A quiet look back at the moments that brought this celebration to life.'
        />
        {chapters.length === 0 ? (
          <p className='border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>
            Love story details are not available yet. Please check back later.
          </p>
        ) : (
          <Timeline>
            {chapters.map((chapter, index) => {
              const chapterImage = resolveAssetUrl(chapter.photo_path);
              return (
                <TimelineItem key={chapter.id ?? `${chapter.title}-${index}`}>
                  <TimelinePoint className='border-[color:var(--brand-border)] bg-[color:var(--brand-accent-soft)]' />
                  {index < chapters.length - 1 ? <TimelineLine className='bg-[color:var(--brand-accent-soft)]' /> : null}
                  <Card className='overflow-hidden border-[color:var(--brand-border)] bg-white'>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      {chapterImage ? (
                        <div className='overflow-hidden border border-[color:var(--brand-border)]'>
                          <Image
                            src={chapterImage}
                            alt={chapter.title ? `Photo from ${chapter.title}` : 'Love story chapter photo'}
                            width={860}
                            height={420}
                            className='h-48 w-full object-cover grayscale sm:h-56'
                          />
                        </div>
                      ) : null}
                      <div className='space-y-2'>
                        <h3 className='habibi-script text-[2rem] leading-none text-[color:var(--brand-ink)]'>
                          {chapter.title ?? 'Untitled chapter'}
                        </h3>
                        {chapter.chapter_date ? (
                          <p className='text-xs uppercase tracking-[0.18em] text-[color:var(--brand-muted-text)]'>
                            {formatWeddingDate(chapter.chapter_date)}
                          </p>
                        ) : null}
                        <p className='text-sm leading-7 text-[color:var(--brand-ink)]'>{chapter.story_text ?? ''}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}

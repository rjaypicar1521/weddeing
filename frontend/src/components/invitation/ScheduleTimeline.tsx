'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineLine, TimelinePoint } from '@/components/ui/timeline';
import { formatScheduleTime } from '@/lib/date-utils';
import type { ScheduleItem } from '@/lib/types';
import { SectionHeading } from '@/components/invitation/SectionHeading';

/**
 * Event sequence section for the wedding day schedule.
 */
export function ScheduleTimeline({ schedule }: { schedule: ScheduleItem[] }) {
  return (
    <Card className='habibi-panel'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Flow Of The Day'
          title='Wedding Day Schedule'
          description='A simple guide to the celebration so you know where to be and when to arrive.'
        />
        {schedule.length === 0 ? (
          <p className='border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>
            Schedule details are not available yet. Please check back later.
          </p>
        ) : (
          <Timeline>
            {schedule.map((item, index) => (
              <TimelineItem key={`${item.time}-${item.event}-${index}`}>
                <TimelinePoint className='border-[color:var(--brand-border)] bg-[color:var(--brand-accent-soft)]' />
                {index < schedule.length - 1 ? <TimelineLine className='bg-[color:var(--brand-accent-soft)]' /> : null}
                <Card className='border-[color:var(--brand-border)] bg-[color:var(--brand-surface)]'>
                  <CardContent className='space-y-3 p-4 lg:p-5'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge className='border-[color:var(--brand-border)] bg-white text-[color:var(--brand-ink)]'>
                        {formatScheduleTime(item.time)}
                      </Badge>
                      <p className='habibi-script text-[1.9rem] leading-none text-[color:var(--brand-ink)]'>
                        {item.event ?? 'Event'}
                      </p>
                    </div>
                    {item.description ? (
                      <p className='text-sm leading-7 text-[color:var(--brand-muted-text)]'>{item.description}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Timeline({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative space-y-4', className)} {...props} />;
}

export function TimelineItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative pl-8', className)} {...props} />;
}

export function TimelinePoint({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('absolute left-0 top-1.5 h-3 w-3 rounded-full border border-neutral-300 bg-white', className)}
      {...props}
    />
  );
}

export function TimelineLine({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('absolute left-[5px] top-5 h-[calc(100%-10px)] w-px bg-neutral-200', className)} {...props} />;
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page-level loading skeleton for guest invitation view.
 */
export function InvitationSkeleton() {
  return (
    <main className='min-h-screen px-4 py-8 sm:px-6 lg:px-10'>
      <div className='mx-auto max-w-6xl space-y-6'>
        <Card>
          <CardContent className='space-y-4 p-6'>
            <Skeleton className='h-5 w-28' />
            <Skeleton className='h-12 w-96 max-w-full' />
            <Skeleton className='h-4 w-72 max-w-full' />
            <div className='grid gap-4 sm:grid-cols-2'>
              <Skeleton className='h-56 w-full rounded-2xl' />
              <Skeleton className='h-56 w-full rounded-2xl' />
            </div>
          </CardContent>
        </Card>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`invitation-skeleton-${index}`}>
            <CardContent className='space-y-3 p-6'>
              <Skeleton className='h-5 w-44' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-[92%]' />
              <Skeleton className='h-40 w-full rounded-xl' />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}


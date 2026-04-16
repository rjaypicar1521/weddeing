'use client';

import { useInView } from 'react-intersection-observer';

/**
 * Defers map iframe loading until the map section is near viewport.
 */
export function LazyMapEmbed({
  title,
  src,
  className,
}: {
  title: string;
  src: string;
  className?: string;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '300px 0px' });

  return (
    <div ref={ref} className={className}>
      {inView ? (
        <iframe title={title} className='h-64 w-full sm:h-80 lg:h-full' src={src} loading='lazy' />
      ) : (
        <div className='flex h-64 w-full items-center justify-center bg-[color:var(--brand-surface)] text-sm text-[color:var(--brand-muted-text)] sm:h-80 lg:h-full'>
          Loading map...
        </div>
      )}
    </div>
  );
}


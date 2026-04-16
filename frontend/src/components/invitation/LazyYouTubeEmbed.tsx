'use client';

import Image from 'next/image';
import { useInView } from 'react-intersection-observer';

/**
 * Defers YouTube iframe load until section is near viewport.
 */
export function LazyYouTubeEmbed({
  videoId,
  title,
  autoplay = false,
  muted = false,
  className,
}: {
  videoId: string;
  title: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '250px 0px' });

  const query = [
    'rel=0',
    'playsinline=1',
    autoplay ? 'autoplay=1' : '',
    muted ? 'mute=1' : '',
    autoplay ? 'loop=1' : '',
    autoplay ? `playlist=${videoId}` : '',
  ]
    .filter(Boolean)
    .join('&');

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-xl bg-neutral-900 ${className ?? ''}`}>
      {!inView ? (
        <div className='relative h-full min-h-[220px] w-full sm:min-h-[420px]'>
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt={`${title} thumbnail`}
            fill
            sizes='(max-width: 640px) 100vw, 1024px'
            className='object-cover opacity-75'
          />
          <div className='absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-white'>
            Loading video...
          </div>
        </div>
      ) : (
        <iframe
          title={title}
          className='h-[220px] w-full sm:h-[420px]'
          src={`https://www.youtube.com/embed/${videoId}?${query}`}
          loading='lazy'
          allow='autoplay; encrypted-media; picture-in-picture'
        />
      )}
    </div>
  );
}


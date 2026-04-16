'use client';

import Image from 'next/image';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { useEffect, useRef, useState } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

/**
 * Mobile-first gallery lightbox with focus trap, swipe support, and keyboard controls.
 */
export function MobileLightbox({
  isOpen,
  imageUrl,
  title,
  onClose,
  onNext,
  onPrev,
}: {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [startX, setStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  useEffect(() => {
    if (!isOpen) return;
    containerRef.current?.focus();
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className='fixed inset-0 z-[70] bg-black/90 p-3 sm:p-6' onClick={onClose}>
      <FocusScope loop trapped>
        <div
          ref={containerRef}
          role='dialog'
          aria-modal='true'
          aria-label='Gallery image preview'
          tabIndex={-1}
          className='relative mx-auto flex h-full w-full max-w-4xl items-center justify-center'
          onClick={(event) => event.stopPropagation()}
          onTouchStart={(event) => setStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (startX === null) return;
            const endX = event.changedTouches[0]?.clientX ?? startX;
            const delta = endX - startX;
            if (delta > 45) onPrev();
            if (delta < -45) onNext();
            setStartX(null);
          }}
        >
          <button
            type='button'
            className='absolute right-2 top-2 rounded bg-black/50 px-3 py-1 text-xs text-white focus-visible:ring-2 focus-visible:ring-white/80'
            onClick={onClose}
            aria-label='Close lightbox'
          >
            Close
          </button>
          <button
            type='button'
            className='absolute left-0 top-1/2 -translate-y-1/2 rounded bg-black/50 px-3 py-2 text-white focus-visible:ring-2 focus-visible:ring-white/80'
            onClick={onPrev}
            aria-label='Previous image'
          >
            {'<'}
          </button>
          <div className='relative h-[78vh] w-full max-w-3xl overflow-hidden rounded-lg'>
            <Image src={imageUrl} alt={title} fill sizes='100vw' className='object-contain' />
          </div>
          <button
            type='button'
            className='absolute right-0 top-1/2 -translate-y-1/2 rounded bg-black/50 px-3 py-2 text-white focus-visible:ring-2 focus-visible:ring-white/80'
            onClick={onNext}
            aria-label='Next image'
          >
            {'>'}
          </button>
        </div>
      </FocusScope>
    </div>
  );
}

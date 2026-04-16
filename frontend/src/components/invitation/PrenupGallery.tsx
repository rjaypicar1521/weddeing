'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LazyYouTubeEmbed } from '@/components/invitation/LazyYouTubeEmbed';
import { MobileLightbox } from '@/components/invitation/MobileLightbox';
import { SectionHeading } from '@/components/invitation/SectionHeading';

interface GalleryImage {
  id: number;
  title: string;
  url: string;
}

/**
 * Prenup video and gallery showcase with built-in lightbox.
 */
export function PrenupGallery({
  prenupVideoId,
  galleryImages,
}: {
  prenupVideoId: string | null;
  galleryImages: GalleryImage[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeLightbox = lightboxIndex !== null ? galleryImages[lightboxIndex] ?? null : null;

  return (
    <Card className='habibi-panel overflow-hidden'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 sm:py-10 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Cinematic Moments'
          title='Prenup Film & Gallery'
          description="Set the mood before the big day with the couple's highlights, moving portraits, and favorite stills."
        />

        {prenupVideoId ? (
          <LazyYouTubeEmbed videoId={prenupVideoId} title='Prenup video' autoplay muted />
        ) : (
          <div className='border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-5 py-8 text-sm leading-6 text-[color:var(--brand-muted-text)]'>
            Video details are not available yet. Please check back later.
          </div>
        )}

        {galleryImages.length > 0 ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between gap-3 border-b border-[color:var(--brand-border)] pb-2'>
              <p className='text-sm font-medium text-neutral-900'>Photo Gallery</p>
              <p className='text-xs uppercase tracking-[0.18em] text-[color:var(--brand-muted-text)]'>{galleryImages.length} photos</p>
            </div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
              {galleryImages.map((item, index) => (
                <button
                  key={item.id}
                  type='button'
                  className='group relative h-32 overflow-hidden border border-[color:var(--brand-border)]'
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Open ${item.title}`}
                >
                  <Image
                    src={item.url}
                    alt={item.title}
                    fill
                    loading={index < 4 ? 'eager' : 'lazy'}
                    sizes='(max-width: 640px) 45vw, 260px'
                    className='object-cover grayscale transition duration-300 group-hover:scale-105'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80' />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>

      <MobileLightbox
        isOpen={lightboxIndex !== null}
        imageUrl={activeLightbox?.url ?? null}
        title={activeLightbox?.title ?? 'Gallery image'}
        onClose={() => setLightboxIndex(null)}
        onNext={() => {
          if (!galleryImages.length) return;
          setLightboxIndex((current) => {
            if (current === null) return 0;
            return (current + 1) % galleryImages.length;
          });
        }}
        onPrev={() => {
          if (!galleryImages.length) return;
          setLightboxIndex((current) => {
            if (current === null) return 0;
            return (current - 1 + galleryImages.length) % galleryImages.length;
          });
        }}
      />
    </Card>
  );
}

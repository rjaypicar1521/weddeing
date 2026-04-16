'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { safeExternalOpen } from '@/lib/security-utils';
import { LazyMapEmbed } from '@/components/invitation/LazyMapEmbed';
import { SectionHeading } from '@/components/invitation/SectionHeading';

/**
 * Venue map and route shortcuts section.
 */
export function VenueMap({
  hasVenueLocation,
  venueLocationLabel,
  venueDisplayText,
  mapsEmbedUrl,
  googleMapsUrl,
  wazeUrl,
}: {
  hasVenueLocation: boolean;
  venueLocationLabel: string;
  venueDisplayText: string;
  mapsEmbedUrl: string;
  googleMapsUrl: string;
  wazeUrl: string;
}) {
  return (
    <Card className='habibi-panel' style={{ borderColor: 'var(--brand-border)' }}>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Getting There'
          title='Venue & Directions'
          description='Find the ceremony location quickly, save it to your preferred map app, and plan your arrival with confidence.'
        />
        {hasVenueLocation ? (
          <div className='grid gap-6 md:grid-cols-[1.15fr_0.85fr] lg:grid-cols-[1.4fr_0.6fr]'>
            <LazyMapEmbed
              title='Venue map'
              src={mapsEmbedUrl}
              className='overflow-hidden border border-[color:var(--brand-border)] bg-white'
            />
            <div className='space-y-4 border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] p-5'>
              <div className='space-y-2'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-muted-text)]'>
                  {venueLocationLabel}
                </p>
                <p className='text-sm leading-6 text-[color:var(--brand-ink)]'>{venueDisplayText}</p>
              </div>
              <div className='grid gap-3'>
                <Button
                  type='button'
                  className='habibi-btn rounded-none text-[color:var(--brand-on-primary)] hover:opacity-95'
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  onClick={() => safeExternalOpen(googleMapsUrl)}
                >
                  Open in Google Maps
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='habibi-btn rounded-none bg-white text-[color:var(--brand-ink)]'
                  style={{ borderColor: 'var(--brand-border)' }}
                  onClick={() => safeExternalOpen(wazeUrl)}
                >
                  Open in Waze
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-dashed bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>
            Venue details are not available yet. Please check back later.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GuestInvitationGroup, SectionLink } from '@/lib/types';
import { hexToRgba } from '@/lib/color-utils';
import { safeExternalOpen } from '@/lib/security-utils';

function IntroWaveform({ active }: { active: boolean }) {
  return (
    <span className='inline-flex h-4 items-end gap-[2px]' aria-hidden='true'>
      {[0, 1, 2, 3].map((bar) => (
        <span key={bar} className={`w-[3px] rounded-sm bg-current ${active ? 'animate-pulse' : ''}`} style={{ height: `${6 + bar * 2}px`, animationDelay: `${bar * 120}ms` }} />
      ))}
    </span>
  );
}

/**
 * Hero and top navigation rail for the invitation view.
 */
export function InvitationHero({
  names,
  weddingDateText,
  weddingTimeText,
  venueText,
  guestGroup,
  heroBackdropUrl,
  heroMonogram,
  sectionLinks,
  activeSection,
  onSectionChange,
  hasVenueLocation,
  googleMapsUrl,
  isMuted,
  onToggleMusic,
  onExplore,
  onRsvp,
  brandPrimary,
  brandAccent,
}: {
  names: string;
  weddingDateText: string;
  weddingTimeText: string;
  venueText: string;
  guestGroup: GuestInvitationGroup | null;
  heroBackdropUrl: string | null;
  heroMonogram: string;
  sectionLinks: SectionLink[];
  activeSection: string;
  onSectionChange: (value: string) => void;
  hasVenueLocation: boolean;
  googleMapsUrl: string;
  isMuted: boolean;
  onToggleMusic: () => void;
  onExplore: () => void;
  onRsvp: () => void;
  brandPrimary: string;
  brandAccent: string;
}) {
  return (
    <div className='space-y-0'>
      <section className='relative isolate overflow-hidden border-y bg-[#f9fbf7]' style={{ borderColor: 'var(--brand-border)' }}>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `radial-gradient(circle_at_18%_18%, ${hexToRgba(brandAccent, 0.2)}, transparent 33%), radial-gradient(circle_at_84%_14%, ${hexToRgba(brandPrimary, 0.18)}, transparent 36%)`,
          }}
        />
        <div className='absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(16,16,16,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(16,16,16,0.07)_1px,transparent_1px)] [background-size:128px_128px]' />
        <motion.div
          aria-hidden='true'
          className='absolute -left-10 top-[55%] h-44 w-44 rounded-full border'
          style={{ borderColor: hexToRgba(brandAccent, 0.3) }}
          animate={{ x: [0, 8, -6, 0], y: [0, -10, 6, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden='true'
          className='absolute -right-14 top-[20%] h-56 w-56 rounded-full border'
          style={{ borderColor: hexToRgba(brandPrimary, 0.28) }}
          animate={{ x: [0, -10, 8, 0], y: [0, 9, -7, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className='relative mx-auto flex min-h-[calc(100svh-5.8rem)] w-full max-w-[1240px] flex-col px-4 pb-14 pt-7 sm:px-8 sm:pb-16 lg:px-10 lg:pt-8'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--brand-border)] pb-4'>
            <div className='space-y-0.5'>
              <p className='text-[10px] uppercase tracking-[0.24em] text-[color:var(--brand-muted-text)]'>Wedding Invitation</p>
              <p className='habibi-script text-[1.5rem] leading-none text-[color:var(--brand-ink)] sm:text-[1.8rem]'>Habibi</p>
            </div>
            <Tabs value={activeSection} onValueChange={onSectionChange} className='hidden lg:block'>
              <TabsList className='border bg-white p-1' style={{ borderColor: 'var(--brand-border)' }}>
                {sectionLinks.map((link) => (
                  <TabsTrigger
                    key={link.id}
                    value={link.id}
                    className='habibi-btn rounded-none border border-transparent px-3 py-1.5 text-[11px] text-[color:var(--brand-muted-text)] data-[active=true]:border-[color:var(--brand-primary)] data-[active=true]:bg-[color:var(--brand-primary)] data-[active=true]:text-white'
                  >
                    {link.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button type='button' variant='outline' className='h-10 w-10 rounded-none border bg-white text-[color:var(--brand-ink)] hover:bg-white' style={{ borderColor: 'var(--brand-border)' }} onClick={onToggleMusic} aria-label={isMuted ? 'Unmute ambient music' : 'Mute ambient music'}><IntroWaveform active={!isMuted} /></Button>
          </div>

          <div className='grid flex-1 items-center gap-10 py-9 lg:grid-cols-[0.9fr_1.1fr]'>
            <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.72, ease: 'easeOut' }} className='relative mx-auto w-full max-w-[460px]'>
              <div className='absolute -left-6 top-10 h-36 w-20 border border-[color:var(--brand-border)] bg-white/70 sm:h-40 sm:w-24' />
              <div className='absolute -right-5 bottom-12 h-36 w-20 border border-[color:var(--brand-border)] bg-white/70 sm:h-40 sm:w-24' />
              <div className='relative overflow-hidden border border-[color:var(--brand-border)] bg-white'>
                {heroBackdropUrl ? (
                  <Image src={heroBackdropUrl} alt={`${names} hero`} width={720} height={900} priority sizes='(max-width: 1024px) 100vw, 40vw' className='h-[420px] w-full object-cover object-center grayscale-[10%] sm:h-[500px]' />
                ) : (
                  <div className='flex h-[420px] w-full items-center justify-center bg-[color:var(--brand-surface)] text-sm text-[color:var(--brand-muted-text)] sm:h-[500px]'>
                    Couple photo will appear here
                  </div>
                )}
                <div className='absolute inset-x-0 bottom-0 border-t border-white/30 bg-gradient-to-t from-black/45 via-black/10 to-transparent px-4 pb-6 pt-8 text-center text-white'>
                  <p className='text-[10px] uppercase tracking-[0.24em] text-white/85'>Save the Date</p>
                  <p className='habibi-script mt-2 text-4xl leading-none'>{heroMonogram}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className='space-y-6 text-center lg:text-left'>
              <p className='habibi-script text-[2rem] leading-none text-[color:var(--brand-accent)] sm:text-[2.4rem]'>Save the Date</p>
              <h1 className='habibi-script mx-auto max-w-[12ch] text-balance text-[clamp(3rem,10vw,6.1rem)] leading-[0.9] text-[color:var(--brand-ink)] lg:mx-0'>
                {names}
              </h1>
              <p className='mx-auto max-w-xl text-sm leading-7 text-[color:var(--brand-body)] sm:text-[15px] lg:mx-0'>
                Join us for a day of vows, laughter, and heartfelt moments with everyone we love.
              </p>
              <div className='grid gap-2 border-y border-[color:var(--brand-border)] py-4 sm:grid-cols-3'>
                <div>
                  <p className='text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand-muted-text)]'>Date</p>
                  <p className='mt-1 text-[1.02rem] font-medium text-[color:var(--brand-ink)]'>{weddingDateText}</p>
                </div>
                <div>
                  <p className='text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand-muted-text)]'>Time</p>
                  <p className='mt-1 text-[1.02rem] font-medium text-[color:var(--brand-ink)]'>{weddingTimeText}</p>
                </div>
                <div>
                  <p className='text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand-muted-text)]'>Venue</p>
                  <p className='mt-1 text-[1.02rem] font-medium text-[color:var(--brand-ink)]'>{venueText}</p>
                </div>
              </div>
              <div className='flex flex-wrap justify-center gap-3 lg:justify-start'>
                <Button type='button' variant='outline' className='habibi-btn rounded-none border-2 bg-transparent px-8 py-5 text-[11px] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-primary-soft)]' style={{ borderColor: 'var(--brand-primary)' }} onClick={onExplore}>
                  Explore
                </Button>
                <Button type='button' className='habibi-btn rounded-none px-8 py-5 text-[11px] text-[color:var(--brand-on-primary)] hover:opacity-95' style={{ backgroundColor: 'var(--brand-primary)' }} onClick={onRsvp}>
                  RSVP
                </Button>
              </div>
              {guestGroup ? <p className='text-sm leading-6 text-[color:var(--brand-body)]'>Unlocked for <span className='font-semibold text-[color:var(--brand-ink)]'>{guestGroup.name}</span>. Choose each invited guest in your group when you&apos;re ready to RSVP.</p> : null}
            </motion.div>
          </div>
        </div>
      </section>

      <div className='border-b bg-white px-4 py-4 sm:px-6' style={{ borderColor: 'var(--brand-border)' }}>
        <div className='mx-auto flex w-full max-w-[1240px] flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='space-y-2'>
            <p className='text-[10px] uppercase tracking-[0.24em] text-[color:var(--brand-primary)]'>Explore the Invitation</p>
            <p className='max-w-2xl text-sm leading-6 text-[color:var(--brand-body)]'>Quick jumps for story, venue, RSVP, and wishes.</p>
          </div>
          <div className='flex flex-col gap-3 md:items-end'>
            <Tabs value={activeSection} onValueChange={onSectionChange}>
              <TabsList className='w-full max-w-full overflow-x-auto border bg-white p-1 whitespace-nowrap md:w-auto' style={{ borderColor: 'var(--brand-border)' }}>
                {sectionLinks.map((link) => (
                  <TabsTrigger
                    key={link.id}
                    value={link.id}
                    className='habibi-btn shrink-0 rounded-none border border-transparent px-3 py-2 text-[11px] text-[color:var(--brand-muted-text)] data-[active=true]:border-[color:var(--brand-primary)] data-[active=true]:bg-[color:var(--brand-primary)] data-[active=true]:text-white'
                  >
                    {link.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {hasVenueLocation ? <Button type='button' variant='outline' className='habibi-btn rounded-none bg-white text-[11px] text-[color:var(--brand-ink)]' style={{ borderColor: 'var(--brand-border)' }} onClick={() => safeExternalOpen(googleMapsUrl)}>View Venue Map</Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

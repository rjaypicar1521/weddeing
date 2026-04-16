'use client';

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RSVPForm } from '@/components/invitation/RSVPForm';
import { WishesWall } from '@/components/invitation/WishesWall';
import { CountdownTimer } from '@/components/invitation/CountdownTimer';
import { DressCodeSection } from '@/components/invitation/DressCodeSection';
import { EntourageGallery } from '@/components/invitation/EntourageGallery';
import { GiftGuideSection } from '@/components/invitation/GiftGuideSection';
import { IntroOverlay } from '@/components/invitation/IntroOverlay';
import { InvitationHero } from '@/components/invitation/InvitationHero';
import { InvitationSkeleton } from '@/components/invitation/InvitationSkeleton';
import { LoveStoryTimeline } from '@/components/invitation/LoveStoryTimeline';
import { PrenupGallery } from '@/components/invitation/PrenupGallery';
import { ScheduleTimeline } from '@/components/invitation/ScheduleTimeline';
import { SectionHeading } from '@/components/invitation/SectionHeading';
import { SectionMotion } from '@/components/invitation/SectionMotion';
import { StickyControls } from '@/components/invitation/StickyControls';
import { VenueMap } from '@/components/invitation/VenueMap';
import { useConsolidatedScroll } from '@/hooks/useConsolidatedScroll';
import { resolveAssetUrl } from '@/lib/asset-utils';
import { hexToRgba, normalizeHexColor, pickReadableTextColor } from '@/lib/color-utils';
import { formatWeddingDate, formatWeddingTime } from '@/lib/date-utils';
import { getGuestInvitation } from '@/lib/guest';
import { isPlausibleJwt } from '@/lib/security-utils';
import type {
  EntourageItem,
  GalleryMediaItem,
  GiftMethod,
  InvitationData,
  LoveStoryItem,
  ScheduleItem,
  SectionLink,
} from '@/lib/types';
import { parseYouTubeVideoId } from '@/lib/youtube-utils';

const INTRO_DURATION_MS = 2000;
type GuestViewAccessState = 'checking' | 'granted' | 'denied';

const guestTokenSchema = z
  .string()
  .trim()
  .refine((value) => isPlausibleJwt(value), {
    message: 'Invalid guest token format.',
  });

const FALLBACK_INVITATION: InvitationData = {
  partner1_name: 'Partner 1',
  partner2_name: 'Partner 2',
  wedding_date: '',
  wedding_time: '',
  venue_name: 'Venue to be announced',
  venue_address: '',
  dress_code: '',
  dress_code_colors: [],
  schedule: [],
  music_url: null,
  prenup_video_url: null,
  gift_methods: [],
};

const ENTOURAGE_GROUPS: Array<{ label: string; roles: string[] }> = [
  { label: 'Principal Sponsors', roles: ['ninong', 'ninang'] },
  { label: 'Bridal Party', roles: ['bridesmaid', 'groomsman'] },
  { label: 'Little Entourage', roles: ['flower_girl', 'ring_bearer'] },
];

/**
 * Guest invitation page orchestrator.
 */
export function InvitationView({ slug }: { slug: string }) {
  const router = useRouter();
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introSeenReady, setIntroSeenReady] = useState(false);
  const [accessState, setAccessState] = useState<GuestViewAccessState>('checking');
  const [isMuted, setIsMuted] = useState(true);
  const [hasRsvpSubmission, setHasRsvpSubmission] = useState(false);

  const invitationQuery = useQuery({
    queryKey: ['guest-invitation', slug],
    queryFn: getGuestInvitation,
    retry: false,
    enabled: accessState === 'granted',
  });

  const introSeenKey = `intro_seen_${slug}`;
  const musicPrefKey = `guest_music_muted_${slug}`;

  const sectionLinks = useMemo<SectionLink[]>(
    () => [
      { id: 'countdown-section', label: 'Day' },
      { id: 'story-section', label: 'Story' },
      { id: 'schedule-section', label: 'Schedule' },
      { id: 'venue-section', label: 'Venue' },
      { id: 'entourage-section', label: 'Party' },
      { id: 'dress-section', label: 'Attire' },
      { id: 'gifts-section', label: 'Gifts' },
      { id: 'rsvp-section', label: 'RSVP' },
      { id: 'wishes-section', label: 'Wishes' },
    ],
    [],
  );
  const sectionIds = useMemo(() => sectionLinks.map((section) => section.id), [sectionLinks]);

  const { activeSection, isRsvpInView, scrollY } = useConsolidatedScroll({
    sectionIds,
    rsvpSectionId: 'rsvp-section',
  });

  useEffect(() => {
    const guestToken = sessionStorage.getItem('guest_token');
    const guestTokenResult = guestTokenSchema.safeParse(guestToken);

    if (!guestTokenResult.success) {
      sessionStorage.removeItem('guest_token');
      setAccessState('denied');
      router.replace(`/i/${slug}`);
      return;
    }

    setAccessState('granted');
    setShowIntro(sessionStorage.getItem(introSeenKey) !== '1');
    setIntroSeenReady(true);
    if (localStorage.getItem(musicPrefKey) === '0') {
      setIsMuted(false);
    }
  }, [introSeenKey, musicPrefKey, router, slug]);

  useEffect(() => {
    if (!introSeenReady || !showIntro) return;
    const timer = window.setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem(introSeenKey, '1');
    }, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [introSeenKey, introSeenReady, showIntro]);

  const invitation = invitationQuery.data?.invitation ?? FALLBACK_INVITATION;
  const template = invitationQuery.data?.template ?? null;
  const media = invitationQuery.data?.media ?? {};

  const loveStoryChapters = useMemo(() => {
    const chapters = invitationQuery.data?.love_story_chapters ?? [];
    return [...chapters].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [invitationQuery.data?.love_story_chapters]);

  const entourageMembers = useMemo(() => {
    const members = invitationQuery.data?.entourage_members ?? [];
    return [...members].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [invitationQuery.data?.entourage_members]);

  const heroUrl = resolveAssetUrl(media.hero?.[0]?.url);

  const galleryMedia = (Array.isArray(media.gallery) ? media.gallery : []) as GalleryMediaItem[];
  const galleryImages = galleryMedia
    .map((item, index) => ({
      id: item.id ?? index,
      title: item.file_name ?? `Gallery image ${index + 1}`,
      url: resolveAssetUrl(item.url ?? item.file_path),
    }))
    .filter((item): item is { id: number; title: string; url: string } => Boolean(item.url));

  const schedule = (Array.isArray(invitation.schedule) ? invitation.schedule : []) as ScheduleItem[];
  const dressColors = Array.isArray(invitation.dress_code_colors) ? invitation.dress_code_colors : [];

  const invitationPalette: {
    primary?: string;
    secondary?: string;
    accent?: string;
    surface?: string;
    ink?: string;
    text?: string;
  } = invitation.color_palette ?? {};

  const palettePrimarySource = invitationPalette.primary ?? invitationPalette.accent;
  const brandPrimary = normalizeHexColor(palettePrimarySource, normalizeHexColor(dressColors[0], '#657150'));

  const paletteAccentSource = invitationPalette.secondary ?? invitationPalette.accent;
  const brandAccent = normalizeHexColor(
    paletteAccentSource,
    normalizeHexColor(dressColors[1], '#C8A898'),
  );

  const brandSurface = normalizeHexColor(invitationPalette.surface, '#F1F3EE');
  const paletteInkSource = invitationPalette.ink ?? invitationPalette.text;
  const brandInk = normalizeHexColor(paletteInkSource, '#101010');
  const brandBody = normalizeHexColor(invitationPalette.text, '#5C5C5C');
  const brandOnPrimary = pickReadableTextColor(brandPrimary);

  const pageThemeStyles = useMemo(
    () =>
      ({
        '--brand-primary': brandPrimary,
        '--brand-accent': brandAccent,
        '--brand-ink': brandInk,
        '--brand-body': brandBody,
        '--brand-surface': brandSurface,
        '--brand-surface-soft': hexToRgba(brandSurface, 0.96),
        '--brand-muted-text': hexToRgba(brandBody, 0.88),
        '--brand-on-primary': brandOnPrimary,
        '--brand-primary-soft': hexToRgba(brandPrimary, 0.12),
        '--brand-accent-soft': hexToRgba(brandAccent, 0.24),
        '--brand-border': hexToRgba(brandInk, 0.14),
      }) as CSSProperties,
    [brandAccent, brandBody, brandInk, brandOnPrimary, brandPrimary, brandSurface],
  );

  const giftMethods = (Array.isArray(invitation.gift_methods) ? invitation.gift_methods : []) as GiftMethod[];

  const invitationPlan =
    typeof invitation.plan === 'string'
      ? invitation.plan
      : typeof invitation.user_plan === 'string'
        ? invitation.user_plan
        : 'free';

  const guestGroup = invitationQuery.data?.group ?? null;

  const weddingDate = typeof invitation.wedding_date === 'string' ? invitation.wedding_date : '';
  const weddingTime = typeof invitation.wedding_time === 'string' ? invitation.wedding_time : '';
  const venueAddress = typeof invitation.venue_address === 'string' ? invitation.venue_address : '';
  const venueName = typeof invitation.venue_name === 'string' ? invitation.venue_name : '';

  const venueQuery = venueAddress.trim() || venueName.trim();
  const hasVenueLocation = venueQuery.length > 0;
  const venueLocationLabel = venueAddress.trim().length > 0 ? 'Venue Address' : 'Venue';

  const names = `${String(invitation.partner1_name ?? 'Partner 1')} & ${String(invitation.partner2_name ?? 'Partner 2')}`;
  const heroMonogram = `${String(invitation.partner1_name ?? 'P').trim().charAt(0) || 'P'}${String(invitation.partner2_name ?? 'P').trim().charAt(0) || 'P'}`.toUpperCase();
  const weddingDateText = formatWeddingDate(weddingDate);
  const weddingTimeText = formatWeddingTime(weddingTime);
  const venueText = venueName.trim() || 'Venue to be announced';

  const musicUrl = typeof invitation.music_url === 'string' ? invitation.music_url : null;
  const musicVideoId = musicUrl ? parseYouTubeVideoId(musicUrl) : null;
  const prenupVideoUrl = typeof invitation.prenup_video_url === 'string' ? invitation.prenup_video_url : null;
  const prenupVideoId = prenupVideoUrl ? parseYouTubeVideoId(prenupVideoUrl) : null;

  useEffect(() => {
    if (!playerRef.current || !musicVideoId) return;
    const message = JSON.stringify({ event: 'command', func: isMuted ? 'mute' : 'unMute', args: [] });
    playerRef.current.contentWindow?.postMessage(message, 'https://www.youtube.com');
  }, [isMuted, musicVideoId]);

  const groupedEntourage = ENTOURAGE_GROUPS.map((group) => ({
    ...group,
    members: entourageMembers.filter((member) => group.roles.includes(String(member.role ?? ''))),
  })).filter((group) => group.members.length > 0) as Array<{ label: string; members: EntourageItem[] }>;

  const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(venueQuery)}&output=embed`;
  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(venueQuery)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(venueQuery)}`;

  const introStyleClass = String(template?.region ?? '').toLowerCase() === 'boho'
    ? 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_10%_20%,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_90%_30%,rgba(234,88,12,0.12),transparent_35%)]'
    : '';

  const heroBackdropUrl = heroUrl ?? galleryImages[0]?.url ?? null;

  const showStickyRsvpCta = !showIntro && !hasRsvpSubmission && !isRsvpInView;
  const showStickyMapCta = !showIntro && hasVenueLocation && activeSection !== 'venue-section';
  const showBackToTop = !showIntro && scrollY > 1200;
  const showSectionNav = !showIntro && scrollY > 240;

  const toggleMusic = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem(musicPrefKey, nextMuted ? '1' : '0');
  };

  const onSectionChange = useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const nextUrl = `${window.location.pathname}#${id}`;
      window.history.replaceState(null, '', nextUrl);
    },
    [],
  );

  useEffect(() => {
    if (accessState !== 'granted' || !introSeenReady || showIntro) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash || !sectionIds.includes(hash)) return;

    window.setTimeout(() => onSectionChange(hash), 80);
  }, [accessState, introSeenReady, onSectionChange, sectionIds, showIntro]);

  if (accessState === 'checking' || (accessState === 'granted' && (invitationQuery.isPending || !introSeenReady))) {
    return <InvitationSkeleton />;
  }

  if (accessState === 'denied') {
    return (
      <main className='min-h-screen px-4 py-8 sm:px-6 lg:px-10'>
        <div className='mx-auto max-w-3xl'>
          <Card className='border-amber-300/70 bg-amber-50/80'>
            <CardContent className='space-y-4 p-6'>
              <p className='text-base font-semibold text-amber-900'>Guest access required</p>
              <p className='text-sm text-amber-900/90'>
                Your guest access session is missing or expired. Enter your invitation code again to continue.
              </p>
              <Button
                type='button'
                variant='outline'
                className='border-amber-400 bg-white text-amber-900 hover:bg-amber-100'
                onClick={() => router.replace(`/i/${slug}`)}
              >
                Return to Code Entry
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className='habibi-theme relative min-h-screen scroll-smooth overflow-x-clip text-[color:var(--brand-ink)]' style={pageThemeStyles}>
      <a
        href='#rsvp-section'
        className='sr-only fixed left-4 top-4 z-[80] rounded-full border bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm focus:not-sr-only'
      >
        Skip to RSVP
      </a>

      {musicVideoId ? (
        <iframe
          ref={playerRef}
          title='Background music'
          className='pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 opacity-0'
          src={`https://www.youtube.com/embed/${musicVideoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&showinfo=0&loop=1&playlist=${musicVideoId}&playsinline=1&mute=1`}
          loading='lazy'
          allow='autoplay'
        />
      ) : null}

      <AnimatePresence mode='wait'>
        {showIntro ? (
          <IntroOverlay
            showIntro={showIntro}
            heroUrl={heroUrl}
            introStyleClass={introStyleClass}
            names={names}
            weddingDateText={weddingDateText}
            isMuted={isMuted}
            onSkip={() => {
              setShowIntro(false);
              sessionStorage.setItem(introSeenKey, '1');
            }}
            onToggleMusic={toggleMusic}
          />
        ) : null}
      </AnimatePresence>

      <section className='relative flex w-full flex-col pb-24'>
        {invitationQuery.isError ? (
          <div className='mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:max-w-none lg:px-10'>
            <div className='rounded-xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900'>
              <p>Invitation details are temporarily unavailable.</p>
              <Button
                type='button'
                variant='outline'
                className='mt-3 border-amber-300 bg-white text-amber-900 hover:bg-amber-100'
                onClick={() => invitationQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        <SectionMotion index={0} className='bg-transparent pt-2 sm:pt-3 lg:pt-4' railClassName='max-w-[1240px] lg:max-w-none'>
          <InvitationHero
            names={names}
            weddingDateText={weddingDateText}
            weddingTimeText={weddingTimeText}
            venueText={venueText}
            guestGroup={guestGroup}
            heroBackdropUrl={heroBackdropUrl}
            heroMonogram={heroMonogram}
            sectionLinks={sectionLinks}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            hasVenueLocation={hasVenueLocation}
            googleMapsUrl={googleMapsUrl}
            isMuted={isMuted}
            onToggleMusic={toggleMusic}
            onExplore={() => onSectionChange('story-section')}
            onRsvp={() => onSectionChange('rsvp-section')}
            brandPrimary={brandPrimary}
            brandAccent={brandAccent}
          />
        </SectionMotion>

        <SectionMotion index={1}>
          <PrenupGallery prenupVideoId={prenupVideoId} galleryImages={galleryImages} />
        </SectionMotion>

        <SectionMotion index={2} id='countdown-section'>
          <Card className='habibi-panel overflow-hidden'>
            <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
              <SectionHeading
                eyebrow='Day Of'
                title='Countdown to Wedding Day'
                description="Every second brings us closer to the celebration. Save the date and follow the story below for everything you'll need."
              />
              <CountdownTimer weddingDate={weddingDate} />
            </CardContent>
          </Card>
        </SectionMotion>

        <SectionMotion index={3} id='story-section'>
          <LoveStoryTimeline chapters={loveStoryChapters as LoveStoryItem[]} />
        </SectionMotion>

        <SectionMotion index={4} id='schedule-section'>
          <ScheduleTimeline schedule={schedule as ScheduleItem[]} />
        </SectionMotion>

        <SectionMotion index={5} id='venue-section'>
          <VenueMap
            hasVenueLocation={hasVenueLocation}
            venueLocationLabel={venueLocationLabel}
            venueDisplayText={venueAddress.trim() || venueText}
            mapsEmbedUrl={mapsEmbedUrl}
            googleMapsUrl={googleMapsUrl}
            wazeUrl={wazeUrl}
          />
        </SectionMotion>

        <SectionMotion index={6} id='entourage-section'>
          <EntourageGallery groups={groupedEntourage} />
        </SectionMotion>

        <SectionMotion index={7} id='dress-section'>
          <DressCodeSection
            dressCode={String(invitation.dress_code ?? 'Formal attire preferred.')}
            dressColors={dressColors}
          />
        </SectionMotion>

        <SectionMotion index={8} id='gifts-section'>
          <GiftGuideSection giftMethods={giftMethods as GiftMethod[]} />
        </SectionMotion>

        <SectionMotion index={9} id='rsvp-section'>
          <section
            className='habibi-panel p-1 sm:p-2'
          >
            <RSVPForm
              partnerNames={names}
              weddingDate={weddingDate}
              weddingTime={weddingTime}
              venueName={venueText}
              heroImageUrl={heroUrl}
              isPremium={String(invitationPlan).toLowerCase() === 'premium'}
              groupName={guestGroup?.name ?? null}
              groupGuests={guestGroup?.guests ?? []}
              onViewInvitationAgain={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onSubmissionStateChange={setHasRsvpSubmission}
            />
          </section>
        </SectionMotion>

        <SectionMotion index={10} id='wishes-section'>
          <div className='habibi-panel p-1 sm:p-2'>
            <WishesWall canSubmitWish={hasRsvpSubmission} slug={slug} />
          </div>
        </SectionMotion>
      </section>

      <StickyControls
        showBackToTop={showBackToTop}
        showStickyMapCta={showStickyMapCta}
        showStickyRsvpCta={showStickyRsvpCta}
        showSectionNav={showSectionNav}
        sectionLinks={sectionLinks}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    </main>
  );
}

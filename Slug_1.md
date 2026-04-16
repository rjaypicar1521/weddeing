# Slug 1

## Project Structure
```text
WEDDING/
├── AGENTS.md
├── PROJECT-CONTEXT.md
├── backend/
└── frontend/
    └── src/
        ├── app/
        │   └── i/
        │       └── [slug]/
        │           ├── page.tsx
        │           ├── intro/
        │           │   └── page.tsx
        │           └── view/
        │               └── page.tsx
        ├── components/
        │   ├── invitation/
        │   │   ├── RSVPForm.tsx
        │   │   └── WishesWall.tsx
        │   └── ui/
        │       └── timeline.tsx
        └── lib/
            ├── api.ts
            └── guest.ts
```

## Guest Webpage Source Files
## File: frontend/src/app/i/[slug]/page.tsx
```tsx
"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { validateGuestCode } from '@/lib/guest';

const validateCodeSchema = z.object({
  code: z
    .string()
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .refine((value) => value.length === 6, {
      message: 'Enter your 6-character invitation code.',
    }),
});

type ValidateCodeFormValues = z.infer<typeof validateCodeSchema>;

interface GuestCodeEntryProps {
  slug: string;
}

const guestAccessHighlights = [
  'Private invitation access',
  'One-tap RSVP journey',
  'Wishes wall and live details',
];

const guestAccessSteps = [
  'Enter your 6-character invitation code.',
  'Confirm your guest group access.',
  'Continue to full invitation and RSVP.',
];

function GuestCodeEntry({ slug }: GuestCodeEntryProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedGroupName, setResolvedGroupName] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const lastAutoSubmittedCodeRef = useRef<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ValidateCodeFormValues>({
    resolver: zodResolver(validateCodeSchema),
    defaultValues: {
      code: '',
    },
    mode: 'onChange',
  });

  const codeMutation = useMutation({
    mutationFn: validateGuestCode,
    onSuccess: (data) => {
      sessionStorage.setItem('guest_token', data.guest_token);
      if (data.group?.name) {
        sessionStorage.setItem(`guest_group_name_${data.invitation_slug}`, data.group.name);
      }
      setErrorMessage(null);
      setRetryAfterSeconds(0);
      setResolvedGroupName(data.group?.name ?? null);
      window.setTimeout(() => {
        router.replace(`/i/${data.invitation_slug}/view`);
      }, 650);
    },
    onError: (error: unknown) => {
      const fallbackMessage = "Code doesn't match. Check your invitation.";
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setErrorMessage('Too many attempts. Please wait a moment and try again.');
          setRetryAfterSeconds(30);
          return;
        }
        setErrorMessage(fallbackMessage);
        return;
      }

      setErrorMessage(fallbackMessage);
    },
  });

  const onSubmit = useCallback((values: ValidateCodeFormValues) => {
    if (retryAfterSeconds > 0) return;

    codeMutation.mutate({
      code: values.code,
    });
  }, [codeMutation, retryAfterSeconds]);

  useEffect(() => {
    const existingToken = sessionStorage.getItem('guest_token');
    if (existingToken) {
      router.replace(`/i/${slug}/view`);
    }
  }, [router, slug]);

  const rawCode = form.watch('code');
  const codeSlots = useMemo(
    () => Array.from({ length: 6 }, (_, index) => rawCode[index] ?? ''),
    [rawCode],
  );
  const remainingCharacters = Math.max(0, 6 - rawCode.length);

  useEffect(() => {
    const normalizedCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

    if (normalizedCode.length < 6) {
      lastAutoSubmittedCodeRef.current = null;
      return;
    }

    if (codeMutation.isPending || retryAfterSeconds > 0) {
      return;
    }

    if (lastAutoSubmittedCodeRef.current === normalizedCode) {
      return;
    }

    lastAutoSubmittedCodeRef.current = normalizedCode;
    void form.handleSubmit(onSubmit)();
  }, [codeMutation.isPending, form, onSubmit, rawCode, retryAfterSeconds]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setRetryAfterSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [retryAfterSeconds]);

  return (
    <main className='relative min-h-screen overflow-hidden bg-[#fcf9f4] text-[#1c1c19]'>
      <header className='fixed inset-x-0 top-0 z-30 border-b border-[#d5c2c2]/45 bg-[#fcf9f4]/85 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-10'>
          <p className='font-serif text-xl italic tracking-[-0.02em] text-[#7b5455] sm:text-2xl'>The Heirloom</p>
          <Button
            type='button'
            disabled
            className='h-9 rounded-full bg-gradient-to-br from-[#7b5455] to-[#bd9090] px-5 text-[10px] uppercase tracking-[0.16em] text-white opacity-85 sm:h-10'
          >
            Guest Access
          </Button>
        </div>
      </header>

      <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
        <motion.div
          className='absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#ffdad9]/50 blur-3xl'
          animate={{ x: [0, 12, -8, 0], y: [0, 12, -4, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className='absolute -right-28 bottom-12 h-72 w-72 rounded-full bg-[#ffdcbd]/45 blur-3xl'
          animate={{ x: [0, -12, 6, 0], y: [0, -10, 4, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className='relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-28 lg:px-10'>
        <div className='grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch'>
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className='relative min-h-[24rem] overflow-hidden rounded-3xl border border-[#d5c2c2]/70 bg-[#f0ede9] shadow-[0_22px_56px_rgba(123,84,85,0.14)] sm:min-h-[28rem] lg:min-h-[36rem]'
          >
            <div
              className='absolute inset-0 bg-cover bg-center'
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCitsiyIzOZ4dDGU2N-Vb9ozG8tmexuC6R9L_4UosYrk34i7-a1CqJ7V1dtS7RsAkOpFe3ujlAX2t8MmElq3uyETmYptRljPhcFAPai0npnkHCOKa90_64-uLoM5iU0A8aNnOJOSFIrw4gHrqnW0ZxPcX8ybwg7ZOnTsqNetQblHyIDUJlDE5OVmxHUiTx_kvBrxS_Eb9oD6pifqU_dzMJAWqJ7gbwQOxQ-5OjbwrAyFKmmZKsky-uEl9Jq40Ir6sctBFy6iv6pUxQ')",
              }}
            />
            <div className='absolute inset-0 bg-gradient-to-tr from-[#4a2a2b]/65 via-[#7b5455]/35 to-[#fcf9f4]/20' />
            <div className='relative z-10 flex h-full flex-col justify-between p-5 text-white sm:p-7 lg:p-9'>
              <div className='space-y-4'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90 sm:text-xs'>Exclusive Guest Portal</p>
                <div className='space-y-3'>
                  <h1 className='font-serif text-[2rem] leading-[0.95] tracking-[-0.03em] sm:text-[2.35rem] lg:text-[2.75rem]'>
                    A Beautiful Day
                    <span className='block'>Begins Here</span>
                  </h1>
                  <p className='max-w-lg text-sm leading-7 text-white/90 sm:text-[15px]'>
                    Enter your private invitation code to unlock the full wedding details, RSVP flow, venue map, and wishes wall.
                  </p>
                </div>
              </div>
              <div className='flex flex-wrap gap-2.5'>
                {guestAccessHighlights.map((item) => (
                  <span
                    key={item}
                    className='rounded-full border border-white/45 bg-white/20 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white sm:text-xs'
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className='mt-6 space-y-2.5'>
                {guestAccessSteps.map((item, index) => (
                  <div key={item} className='flex items-start gap-3 rounded-xl border border-white/35 bg-black/20 px-4 py-3'>
                    <span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/90 text-[11px] font-semibold text-[#4a2a2b]'>
                      {index + 1}
                    </span>
                    <p className='text-sm leading-6 text-white/95'>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, ease: 'easeOut', delay: 0.08 }}
          >
            <Card className='w-full border-[#d5c2c2]/75 bg-white/96 shadow-[0_26px_70px_rgba(123,84,85,0.14)] backdrop-blur-sm'>
              <CardHeader className='space-y-2 text-center sm:space-y-3'>
                <CardTitle className='font-serif text-[2rem] leading-tight tracking-[-0.03em] text-[#1c1c19]'>Enter Your Access Code</CardTitle>
                <CardDescription className='mx-auto max-w-sm text-sm leading-6 text-[#514443]'>
                  Enter your invitation code to continue.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-5 px-5 pb-6 sm:px-6 sm:pb-7'>
                <form className='space-y-5' onSubmit={form.handleSubmit(onSubmit)} noValidate>
                  <label className='sr-only' htmlFor='guest-code'>Enter your invitation code</label>
                  <div
                    role='button'
                    tabIndex={0}
                    aria-label='Invitation code input'
                    className='space-y-3 rounded-2xl border border-[#d5c2c2] bg-[#f6f3ee] p-4'
                    onClick={() => codeInputRef.current?.focus()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        codeInputRef.current?.focus();
                      }
                    }}
                  >
                    <div className='flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-[#514443]'>
                      <span>Invitation Code</span>
                      <span>{remainingCharacters === 0 ? 'Ready' : `${remainingCharacters} left`}</span>
                    </div>
                    <div className='grid grid-cols-6 gap-2 sm:gap-2.5'>
                      {codeSlots.map((char, index) => (
                        <div
                          key={`slot-${index}`}
                          className={`flex h-12 items-center justify-center rounded-xl border text-lg font-semibold uppercase transition ${char ? 'border-[#837373] bg-white text-[#1c1c19]' : 'border-[#d5c2c2] bg-white/80 text-[#837373]'}`}
                        >
                          {char || '*'}
                        </div>
                      ))}
                    </div>
                    <Input
                      ref={codeInputRef}
                      id='guest-code'
                      value={rawCode}
                      placeholder='X7K2P9'
                      inputMode='text'
                      autoCapitalize='characters'
                      autoComplete='one-time-code'
                      autoFocus
                      spellCheck={false}
                      className='sr-only'
                      onChange={(event) => {
                        const normalized = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        form.setValue('code', normalized, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void form.handleSubmit(onSubmit)();
                        }
                      }}
                    />
                  </div>

                  {form.formState.errors.code ? (
                    <p className='text-xs text-red-700' role='alert'>{form.formState.errors.code.message}</p>
                  ) : (
                    <p className='text-xs text-[#514443]'>Tip: you can paste the full code directly.</p>
                  )}

                  {errorMessage ? (
                    <Alert variant='destructive'>
                      <AlertTitle>Access error</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  {retryAfterSeconds > 0 ? (
                    <p className='text-xs text-amber-800' role='status' aria-live='polite'>
                      Access is temporarily locked to protect this invitation. You can try again in {retryAfterSeconds} second{retryAfterSeconds === 1 ? '' : 's'}.
                    </p>
                  ) : null}

                  {resolvedGroupName ? (
                    <Alert variant='success'>
                      <AlertTitle>Code confirmed</AlertTitle>
                      <AlertDescription>Opening invitation for {resolvedGroupName}...</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type='submit'
                    className='h-11 w-full bg-gradient-to-br from-[#7b5455] to-[#bd9090] text-white hover:opacity-95'
                    disabled={codeMutation.isPending || retryAfterSeconds > 0}
                  >
                    {retryAfterSeconds > 0 ? (
                      `Try again in ${retryAfterSeconds}s`
                    ) : codeMutation.isPending ? (
                      <span className='inline-flex items-center gap-2'>
                        <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white' />
                        Validating...
                      </span>
                    ) : (
                      'Open Invitation'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

export default function GuestCodeEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [queryClient] = useState(() => new QueryClient());
  const { slug } = use(params);

  return (
    <QueryClientProvider client={queryClient}>
      <GuestCodeEntry slug={slug} />
    </QueryClientProvider>
  );
}
```

## File: frontend/src/app/i/[slug]/intro/page.tsx
```tsx
interface IntroPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function IntroPage({ params }: IntroPageProps) {
  const { slug } = await params;

  return (
    <main className='flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-center text-white'>
      <div className='space-y-3'>
        <p className='text-xs uppercase tracking-[0.24em] text-neutral-400'>Invitation</p>
        <h1 className='text-2xl font-semibold'>Cinematic Intro</h1>
        <p className='text-sm text-neutral-300'>
          Guest access confirmed for <span className='font-medium text-white'>{slug}</span>.
          Intro sequence will be expanded in the next story.
        </p>
      </div>
    </main>
  );
}
```

## File: frontend/src/app/i/[slug]/view/page.tsx
```tsx
"use client";

import Image from 'next/image';
import { use, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RSVPForm } from '@/components/invitation/RSVPForm';
import { WishesWall } from '@/components/invitation/WishesWall';
import { Timeline, TimelineItem, TimelineLine, TimelinePoint } from '@/components/ui/timeline';
import { getGuestInvitation } from '@/lib/guest';

interface InvitationViewProps {
  slug: string;
}

interface ScheduleItem { time?: string; event?: string; description?: string }
interface LoveStoryItem { id?: number; title?: string; story_text?: string; photo_path?: string | null; chapter_date?: string | null; sort_order?: number }
interface EntourageItem { id?: number; name?: string; role?: string; photo_path?: string | null; sort_order?: number }
interface GiftMethod { label?: string; qr_path?: string; account_name?: string; account_number?: string }
interface GalleryMediaItem { id?: number; url?: string; file_path?: string; file_name?: string }
interface SectionLink { id: string; label: string }

const INTRO_DURATION_MS = 2000;
const FALLBACK_INVITATION = {
  partner1_name: 'Partner 1',
  partner2_name: 'Partner 2',
  wedding_date: '',
  wedding_time: '',
  venue_name: 'Venue to be announced',
  venue_address: '',
  dress_code: '',
  dress_code_colors: [] as string[],
  schedule: [] as ScheduleItem[],
  music_url: null as string | null,
  prenup_video_url: null as string | null,
  gift_methods: [] as GiftMethod[],
};

const ENTOURAGE_GROUPS: Array<{ label: string; roles: string[] }> = [
  { label: 'Principal Sponsors', roles: ['ninong', 'ninang'] },
  { label: 'Bridal Party', roles: ['bridesmaid', 'groomsman'] },
  { label: 'Little Entourage', roles: ['flower_girl', 'ring_bearer'] },
];

function parseYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsedUrl.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsedUrl.pathname.replace('/', '') || null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') return parsedUrl.searchParams.get('v');
      if (parsedUrl.pathname.startsWith('/embed/')) return parsedUrl.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdn) return path;
  return `${cdn.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function formatWeddingDate(value: string | undefined): string {
  if (!value) return 'Wedding Date';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(parsedDate);
}

function formatWeddingTime(value: string | undefined): string {
  if (!value) return 'Time TBA';
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const base = new Date();
  base.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(base);
}

function formatScheduleTime(value: string | undefined): string {
  if (!value) return '--:--';

  const normalized = value.trim();
  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    const [, hours, minutes, meridiem] = meridiemMatch;
    const base = new Date();
    let hour = Number(hours);
    if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
    base.setHours(hour, Number(minutes), 0, 0);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(base);
  }

  return formatWeddingTime(normalized);
}

function roleToLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;

  const candidate = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const expanded = candidate
      .slice(1)
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return `#${expanded}`.toUpperCase();
  }

  return fallback;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex, '#000000');
  const parsed = normalized.slice(1);
  const r = Number.parseInt(parsed.slice(0, 2), 16);
  const g = Number.parseInt(parsed.slice(2, 4), 16);
  const b = Number.parseInt(parsed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHexColors(base: string, target: string, ratio: number): string {
  const normalizedBase = normalizeHexColor(base, '#000000').slice(1);
  const normalizedTarget = normalizeHexColor(target, '#FFFFFF').slice(1);
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  const baseRgb = [
    Number.parseInt(normalizedBase.slice(0, 2), 16),
    Number.parseInt(normalizedBase.slice(2, 4), 16),
    Number.parseInt(normalizedBase.slice(4, 6), 16),
  ];
  const targetRgb = [
    Number.parseInt(normalizedTarget.slice(0, 2), 16),
    Number.parseInt(normalizedTarget.slice(2, 4), 16),
    Number.parseInt(normalizedTarget.slice(4, 6), 16),
  ];

  const mixed = baseRgb.map((channel, index) =>
    Math.round(channel + (targetRgb[index] - channel) * clampedRatio),
  );

  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(mixed[0])}${toHex(mixed[1])}${toHex(mixed[2])}`;
}

function pickReadableTextColor(backgroundHex: string): string {
  const normalized = normalizeHexColor(backgroundHex, '#000000').slice(1);
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.58 ? '#111111' : '#FFFFFF';
}

function IntroWaveform({ active }: { active: boolean }) {
  return (
    <span className='inline-flex h-4 items-end gap-[2px]' aria-hidden='true'>
      {[0, 1, 2, 3].map((bar) => (
        <span key={bar} className={`w-[3px] rounded-sm bg-current ${active ? 'animate-pulse' : ''}`} style={{ height: `${6 + bar * 2}px`, animationDelay: `${bar * 120}ms` }} />
      ))}
    </span>
  );
}

function FlipDigit({ value }: { value: string }) {
  return (
    <div className='relative h-12 w-8 overflow-hidden rounded-md bg-neutral-900 text-center text-2xl font-semibold text-white sm:h-14 sm:w-10 sm:text-3xl'>
      <AnimatePresence mode='wait'>
        <motion.span key={value} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.28 }} className='absolute inset-0 flex items-center justify-center'>
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function CountdownTimer({ weddingDate }: { weddingDate: string | undefined }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = useMemo(() => {
    if (!weddingDate) return null;
    const parsed = new Date(weddingDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime();
  }, [weddingDate]);

  if (!target) return <p className='text-sm text-[color:var(--brand-muted-text)]'>Countdown starts once wedding date is set.</p>;
  const diff = Math.max(0, target - now);
  if (diff <= 0) return <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-2xl font-semibold text-emerald-800'>Wedding Day!</div>;

  const totalSeconds = Math.floor(diff / 1000);
  const units = [
    { label: 'Days', value: String(Math.floor(totalSeconds / 86400)).padStart(2, '0') },
    { label: 'Hours', value: String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0') },
    { label: 'Mins', value: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0') },
    { label: 'Secs', value: String(totalSeconds % 60).padStart(2, '0') },
  ];

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
      {units.map((unit) => (
        <Card key={unit.label} className='border-neutral-200'>
          <CardContent className='space-y-2 px-3 py-4 text-center'>
            <div className='flex justify-center gap-1'>{unit.value.split('').map((digit, i) => <FlipDigit key={`${unit.label}-${i}-${digit}`} value={digit} />)}</div>
            <p className='text-xs uppercase tracking-[0.2em] text-[color:var(--brand-muted-text)]'>{unit.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionMotion({
  index,
  id,
  className,
  railClassName,
  children,
}: {
  index: number;
  id?: string;
  className?: string;
  railClassName?: string;
  children: React.ReactNode;
}) {
  const variants = [
    { initial: { opacity: 0, y: 36 }, animate: { opacity: 1, y: 0 } },
    { initial: { opacity: 0, x: -42 }, animate: { opacity: 1, x: 0 } },
    { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } },
  ];
  const variant = variants[index % variants.length];
  const backdropPattern = [
    'bg-transparent',
    'bg-[color:var(--brand-surface-soft)]/45',
    'bg-[color:var(--brand-accent-soft)]/28',
  ][index % 3];

  return (
    <motion.section
      id={id}
      initial={variant.initial}
      whileInView={variant.animate}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: Math.min(index * 0.04, 0.2) }}
      className={`gpu-transform w-full scroll-mt-24 py-4 sm:scroll-mt-28 sm:py-6 lg:py-7 ${backdropPattern} ${className ?? ''}`}
    >
      <div className={`mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:max-w-none lg:px-10 ${railClassName ?? ''}`}>
        {children}
      </div>
    </motion.section>
  );
}

function LazyYouTubeEmbed({
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
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '250px 0px',
  });

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

function MobileLightbox({
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

  if (!isOpen || !imageUrl) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-[70] bg-black/90 p-3 sm:p-6' onClick={onClose}>
      <div
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
          className='absolute right-2 top-2 rounded bg-black/50 px-3 py-1 text-xs text-white'
          onClick={onClose}
        >
          Close
        </button>
        <button type='button' className='absolute left-0 top-1/2 -translate-y-1/2 rounded bg-black/50 px-3 py-2 text-white' onClick={onPrev} aria-label='Previous image'>‹</button>
        <div className='relative h-[78vh] w-full max-w-3xl overflow-hidden rounded-lg'>
          <Image src={imageUrl} alt={title} fill sizes='100vw' className='object-contain' />
        </div>
        <button type='button' className='absolute right-0 top-1/2 -translate-y-1/2 rounded bg-black/50 px-3 py-2 text-white' onClick={onNext} aria-label='Next image'>›</button>
      </div>
    </div>
  );
}

export default function InvitationViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const [queryClient] = useState(() => new QueryClient());
  const { slug } = use(params);
  return (
    <QueryClientProvider client={queryClient}>
      <InvitationView slug={slug} />
    </QueryClientProvider>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={`space-y-4 ${align === 'center' ? 'text-center' : ''}`}>
      <p className='text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-primary)] sm:text-xs'>{eyebrow}</p>
      <div className='space-y-3'>
        <h2 className='text-pretty font-serif text-[2rem] leading-[1.04] tracking-[-0.02em] text-neutral-900 sm:text-[2.5rem] lg:text-[3rem]'>{title}</h2>
        <p className={`text-sm leading-7 text-[color:var(--brand-muted-text)] sm:text-[15px] lg:text-base ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{description}</p>
      </div>
    </div>
  );
}

function AmbientBackdrop({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
      <div
        className='absolute inset-0'
        style={{
          backgroundImage: `linear-gradient(180deg, #FFF9F2 0%, #FDF6EE 34%, #F7EFE5 68%, #F4EAE0 100%)`,
        }}
      />
      <motion.div
        className='absolute inset-x-0 top-0 h-[48rem]'
        style={{
          backgroundImage: `radial-gradient(circle_at_14%_16%, ${hexToRgba(primaryColor, 0.22)}, transparent 36%), radial-gradient(circle_at_84%_12%, ${hexToRgba(accentColor, 0.24)}, transparent 36%), radial-gradient(circle_at_center, rgba(255,255,255,0.9), transparent 58%)`,
        }}
        animate={{ opacity: [0.82, 1, 0.86], scale: [1, 1.015, 0.995] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className='absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(88,55,43,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(88,55,43,0.08)_1px,transparent_1px)] [background-size:120px_120px] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.5),transparent_80%)]' />
      <motion.div
        className='absolute -left-20 top-[26rem] h-[20rem] w-[20rem] rounded-full border'
        style={{ borderColor: hexToRgba(primaryColor, 0.2) }}
        animate={{ x: [0, 12, -8, 0], y: [0, -16, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className='absolute -right-24 top-[42rem] h-[22rem] w-[22rem] rounded-full border'
        style={{ borderColor: hexToRgba(accentColor, 0.22) }}
        animate={{ x: [0, -14, 10, 0], y: [0, 14, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function InvitationView({ slug }: InvitationViewProps) {
  const router = useRouter();
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const rsvpRef = useRef<HTMLElement | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introSeenReady, setIntroSeenReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRsvpInView, setIsRsvpInView] = useState(false);
  const [hasRsvpSubmission, setHasRsvpSubmission] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('story-section');
  const [scrollY, setScrollY] = useState(0);

  const invitationQuery = useQuery({ queryKey: ['guest-invitation', slug], queryFn: getGuestInvitation, retry: false });

  const introSeenKey = `intro_seen_${slug}`;
  const musicPrefKey = `guest_music_muted_${slug}`;

  useEffect(() => {
    const guestToken = sessionStorage.getItem('guest_token');
    if (!guestToken) {
      router.replace(`/i/${slug}`);
      return;
    }

    setShowIntro(sessionStorage.getItem(introSeenKey) !== '1');
    setIntroSeenReady(true);
    if (localStorage.getItem(musicPrefKey) === '0') setIsMuted(false);
  }, [introSeenKey, musicPrefKey, router, slug]);

  useEffect(() => {
    if (!introSeenReady || !showIntro) return;
    const timer = window.setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem(introSeenKey, '1');
    }, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [introSeenKey, introSeenReady, showIntro]);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    if (showIntro) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [showIntro]);

  useEffect(() => {
    if (!rsvpRef.current) return;

    const updateRsvpVisibility = () => {
      if (!rsvpRef.current) return;
      const rect = rsvpRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const hasEnteredViewport = rect.top <= viewportHeight * 0.78;
      const isStillReachable = rect.bottom >= 140;
      setIsRsvpInView(hasEnteredViewport && isStillReachable);
    };

    updateRsvpVisibility();
    window.addEventListener('scroll', updateRsvpVisibility, { passive: true });
    window.addEventListener('resize', updateRsvpVisibility);

    return () => {
      window.removeEventListener('scroll', updateRsvpVisibility);
      window.removeEventListener('resize', updateRsvpVisibility);
    };
  }, []);

  const invitation = (invitationQuery.data?.invitation ?? FALLBACK_INVITATION) as typeof FALLBACK_INVITATION & Record<string, unknown>;
  const template = invitationQuery.data?.template;
  const media = invitationQuery.data?.media ?? {};

  const loveStoryChapters = (invitationQuery.data?.love_story_chapters ?? (Array.isArray(invitation.love_story_chapters) ? (invitation.love_story_chapters as LoveStoryItem[]) : []))
    .slice()
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  const entourageMembers = (invitationQuery.data?.entourage_members ?? (Array.isArray(invitation.entourage_members) ? (invitation.entourage_members as EntourageItem[]) : []))
    .slice()
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

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
  const invitationPalette =
    invitation.color_palette && typeof invitation.color_palette === 'object'
      ? (invitation.color_palette as Record<string, unknown>)
      : {};
  const palettePrimarySource = invitationPalette.primary ?? invitationPalette.accent;
  const brandPrimary = normalizeHexColor(palettePrimarySource, normalizeHexColor(dressColors[0], '#8A4B59'));
  const paletteAccentSource = invitationPalette.secondary ?? invitationPalette.accent;
  const brandAccent = normalizeHexColor(paletteAccentSource, normalizeHexColor(dressColors[1], mixHexColors(brandPrimary, '#FFFFFF', 0.68)));
  const brandSurface = normalizeHexColor(invitationPalette.surface, mixHexColors(brandAccent, '#FFFFFF', 0.76));
  const paletteInkSource = invitationPalette.ink ?? invitationPalette.text;
  const brandInk = normalizeHexColor(paletteInkSource, '#2A1712');
  const brandOnPrimary = pickReadableTextColor(brandPrimary);
  const pageThemeStyles: CSSProperties = {
    '--brand-primary': brandPrimary,
    '--brand-accent': brandAccent,
    '--brand-ink': brandInk,
    '--brand-surface': brandSurface,
    '--brand-surface-soft': hexToRgba(brandSurface, 0.92),
    '--brand-muted-text': hexToRgba(brandInk, 0.76),
    '--brand-on-primary': brandOnPrimary,
    '--brand-primary-soft': hexToRgba(brandPrimary, 0.15),
    '--brand-accent-soft': hexToRgba(brandAccent, 0.22),
    '--brand-border': hexToRgba(brandInk, 0.16),
  } as CSSProperties;
  const giftMethods = Array.isArray(invitation.gift_methods) ? invitation.gift_methods : [];
  const invitationPlan = typeof invitation.plan === 'string'
    ? invitation.plan
    : (typeof invitation.user_plan === 'string' ? invitation.user_plan : 'free');
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
  })).filter((group) => group.members.length > 0);

  const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(venueQuery)}&output=embed`;
  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(venueQuery)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(venueQuery)}`;
  const introStyleClass = String(template?.region ?? '').toLowerCase() === 'boho'
    ? 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_10%_20%,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_90%_30%,rgba(234,88,12,0.12),transparent_35%)]'
    : '';

  const activeLightbox = lightboxIndex !== null ? galleryImages[lightboxIndex] ?? null : null;
  const featuredVisualUrl = galleryImages[0]?.url ?? heroUrl ?? null;
  const heroBackdropUrl = heroUrl ?? featuredVisualUrl;
  const sectionLinks = useMemo<SectionLink[]>(
    () => [
      { id: 'story-section', label: 'Story' },
      { id: 'schedule-section', label: 'Schedule' },
      { id: 'venue-section', label: 'Venue' },
      { id: 'rsvp-section', label: 'RSVP' },
      { id: 'wishes-section', label: 'Wishes' },
    ],
    [],
  );

  const toggleMusic = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem(musicPrefKey, nextMuted ? '1' : '0');
  };

  useEffect(() => {
    const sections = sectionLinks
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const updateActiveSection = () => {
      const offset = window.innerHeight * 0.22;
      const current = sections.findLast((section) => section.getBoundingClientRect().top <= offset) ?? sections[0];
      setActiveSection(current.id);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [sectionLinks]);

  useEffect(() => {
    const updateScrollY = () => {
      const nextY = window.scrollY;
      setScrollY(nextY);
    };

    updateScrollY();
    window.addEventListener('scroll', updateScrollY, { passive: true });
    window.addEventListener('resize', updateScrollY);

    return () => {
      window.removeEventListener('scroll', updateScrollY);
      window.removeEventListener('resize', updateScrollY);
    };
  }, []);

  const showStickyRsvpCta = !showIntro && !hasRsvpSubmission && !isRsvpInView;
  const showStickyMapCta = !showIntro && hasVenueLocation && activeSection !== 'venue-section';
  const showBackToTop = !showIntro && scrollY > 1200;
  const showStickyControls = showStickyRsvpCta || showStickyMapCta || showBackToTop;

  if (invitationQuery.isLoading || !introSeenReady) return <main className='flex min-h-screen items-center justify-center text-sm text-[color:var(--brand-muted-text)]'>Loading invitation...</main>;

  return (
    <main className='relative min-h-screen scroll-smooth overflow-x-clip text-[color:var(--brand-ink)]' style={pageThemeStyles}>
      <a
        href='#rsvp-section'
        className='sr-only fixed left-4 top-4 z-[80] rounded-full border bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm focus:not-sr-only'
      >
        Skip to RSVP
      </a>
      <AmbientBackdrop primaryColor={brandPrimary} accentColor={brandAccent} />
      {musicVideoId ? (
        <iframe ref={playerRef} title='Background music' className='pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 opacity-0' src={`https://www.youtube.com/embed/${musicVideoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&showinfo=0&loop=1&playlist=${musicVideoId}&playsinline=1&mute=1`} loading='lazy' allow='autoplay' />
      ) : null}

      <AnimatePresence mode='wait'>
        {showIntro ? (
          <motion.section key='cinematic-intro' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.65 }} className={`fixed inset-0 z-50 overflow-hidden text-white ${introStyleClass}`}>
            {heroUrl ? <div className='absolute inset-0 scale-105 bg-cover bg-center blur-md' style={{ backgroundImage: `url(${heroUrl})` }} aria-hidden='true' /> : <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,207,232,0.22),transparent_45%),linear-gradient(145deg,#111827,#1f2937)]' />}
            <div className='absolute inset-0 bg-black/60' />
            <div className='relative z-10 flex h-full flex-col px-4 pb-8 pt-4 sm:px-8'>
              <div className='flex items-start justify-end'>
                <Button type='button' variant='outline' className='border-white/40 bg-black/30 text-white hover:bg-white/10' onClick={() => { setShowIntro(false); sessionStorage.setItem(introSeenKey, '1'); }} autoFocus aria-label='Skip intro'>Skip</Button>
              </div>
              <div className='flex flex-1 items-center justify-center text-center'>
                <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className='space-y-3'>
                  <h1 className='text-balance text-4xl font-semibold leading-tight sm:text-6xl'>{names}</h1>
                  <p className='text-sm uppercase tracking-[0.28em] text-neutral-200 sm:text-base'>{weddingDateText}</p>
                </motion.div>
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }} className='text-center text-sm text-neutral-200'>Scroll to explore</motion.p>
              <Button type='button' variant='outline' className='fixed bottom-4 right-4 z-[60] h-10 w-10 border-white/40 bg-black/30 text-white hover:bg-white/10 sm:bottom-auto sm:right-auto sm:self-end' onClick={toggleMusic} aria-label={isMuted ? 'Unmute ambient music' : 'Mute ambient music'}><IntroWaveform active={!isMuted} /></Button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className='relative flex w-full flex-col gap-4 pb-24 pt-4 sm:gap-6 sm:pt-5 lg:gap-7 lg:pt-6'>
        {invitationQuery.isError ? (
          <div className='mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:max-w-none lg:px-10'>
            <p className='rounded-xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900'>
              Invitation details are temporarily unavailable. Showing fallback details.
            </p>
          </div>
        ) : null}

        <SectionMotion index={0} className='bg-transparent pt-2 sm:pt-3 lg:pt-4' railClassName='max-w-[1240px] lg:max-w-none'>
          <div className='space-y-4'>
            <section className='relative isolate overflow-hidden border-y bg-[#fdf7ef]/75' style={{ borderColor: 'var(--brand-border)' }}>
              <div
                className='absolute inset-0'
                style={{
                  backgroundImage: `radial-gradient(circle_at_14%_12%, ${hexToRgba(brandPrimary, 0.2)}, transparent 34%), radial-gradient(circle_at_88%_18%, ${hexToRgba(brandAccent, 0.24)}, transparent 36%), linear-gradient(180deg, rgba(255,255,255,0.82), rgba(250,239,226,0.86))`,
                }}
              />
              <div className='absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(88,55,43,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(88,55,43,0.08)_1px,transparent_1px)] [background-size:120px_120px]' />
              <motion.div
                aria-hidden='true'
                className='absolute -left-16 top-[36%] h-48 w-48 rounded-full border'
                style={{ borderColor: hexToRgba(brandPrimary, 0.3) }}
                animate={{ x: [0, 10, -7, 0], y: [0, -12, 8, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden='true'
                className='absolute -right-20 top-[52%] h-56 w-56 rounded-full border'
                style={{ borderColor: hexToRgba(brandAccent, 0.3) }}
                animate={{ x: [0, -12, 8, 0], y: [0, 10, -6, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className='relative flex min-h-[calc(100svh-7.2rem)] flex-col px-4 py-6 sm:min-h-[calc(100svh-8rem)] sm:px-8 sm:py-7 lg:min-h-[calc(100svh-8.7rem)] lg:px-12 lg:py-8'>
                <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--brand-border)] pb-4'>
                  <div className='space-y-0.5'>
                    <p className='text-[10px] uppercase tracking-[0.26em] text-[color:var(--brand-muted-text)]'>Enchanted Weddings</p>
                    <p className='font-serif text-xl tracking-[-0.03em] text-[color:var(--brand-ink)]'>{names}</p>
                  </div>
                  <Tabs
                    value={activeSection}
                    onValueChange={(value) => {
                      setActiveSection(value);
                      document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className='hidden md:block'
                  >
                    <TabsList className='rounded-full border bg-white/55 p-1' style={{ borderColor: 'var(--brand-border)' }}>
                      {sectionLinks.map((link) => (
                        <TabsTrigger
                          key={link.id}
                          value={link.id}
                          className='rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-muted-text)] data-[active=true]:bg-[color:var(--brand-primary)] data-[active=true]:text-white'
                        >
                          {link.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <Button type='button' variant='outline' className='h-9 border bg-white/70 text-[color:var(--brand-ink)] hover:bg-white' style={{ borderColor: 'var(--brand-border)' }} onClick={toggleMusic} aria-label={isMuted ? 'Unmute ambient music' : 'Mute ambient music'}><IntroWaveform active={!isMuted} /></Button>
                </div>

                <div className='grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:py-10'>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: 'easeOut' }} className='space-y-6'>
                    <p className='text-[10px] uppercase tracking-[0.34em] text-[color:var(--brand-primary)] sm:text-[11px]'>LIFE IS AN EVENT</p>
                    <h1 className='max-w-[16ch] text-balance font-serif text-[clamp(2.2rem,9vw,5.8rem)] uppercase leading-[0.9] tracking-[-0.03em] text-neutral-900'>
                      Creating The Best Day Ever
                    </h1>
                    <p className='max-w-xl text-sm leading-7 text-[color:var(--brand-muted-text)] sm:text-[15px]'>
                      Join {names} as we celebrate love, family, and meaningful moments together.
                    </p>
                    <div className='flex flex-wrap gap-3'>
                      <Button
                        type='button'
                        variant='outline'
                        className='rounded-none border-2 bg-transparent px-8 py-5 text-xs uppercase tracking-[0.28em] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-primary-soft)]'
                        style={{ borderColor: 'var(--brand-primary)' }}
                        onClick={() => document.getElementById('story-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Explore
                      </Button>
                      <Button
                        type='button'
                        className='rounded-none px-8 py-5 text-xs uppercase tracking-[0.28em] text-[color:var(--brand-on-primary)] hover:opacity-95'
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                        onClick={() => document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        RSVP
                      </Button>
                    </div>
                    <div className='grid gap-2 border-t border-[color:var(--brand-border)] pt-4 sm:grid-cols-3'>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.2em] text-[color:var(--brand-muted-text)]'>Date</p>
                        <p className='mt-1 font-serif text-lg text-neutral-900'>{weddingDateText}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.2em] text-[color:var(--brand-muted-text)]'>Time</p>
                        <p className='mt-1 font-serif text-lg text-neutral-900'>{weddingTimeText}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.2em] text-[color:var(--brand-muted-text)]'>Venue</p>
                        <p className='mt-1 font-serif text-lg text-neutral-900'>{venueText}</p>
                      </div>
                    </div>
                    {guestGroup ? <p className='text-sm leading-6 text-[color:var(--brand-muted-text)]'>Unlocked for <span className='font-semibold text-[color:var(--brand-ink)]'>{guestGroup.name}</span>. Choose each invited guest in your group when you&apos;re ready to RSVP.</p> : null}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className='relative mx-auto w-full max-w-[500px] lg:justify-self-end'>
                    <div className='absolute -left-6 top-8 h-32 w-20 rounded-[100px] border border-[color:var(--brand-border)]/70 bg-white/40 sm:h-40 sm:w-24' />
                    <div className='absolute -right-5 bottom-12 h-36 w-24 rounded-[100px] border border-[color:var(--brand-border)]/70 bg-white/40 sm:h-44 sm:w-28' />
                    <div className='relative overflow-hidden rounded-[200px_200px_20px_20px] border border-[color:var(--brand-border)] bg-white shadow-[0_16px_36px_rgba(88,55,43,0.18)]'>
                      {heroBackdropUrl ? (
                        <Image src={heroBackdropUrl} alt={`${names} hero`} width={720} height={900} priority sizes='(max-width: 1024px) 100vw, 38vw' className='h-[420px] w-full object-cover object-center sm:h-[500px] grayscale-[12%]' />
                      ) : (
                        <div className='flex h-[420px] w-full items-center justify-center bg-[color:var(--brand-surface)] text-sm text-[color:var(--brand-muted-text)] sm:h-[500px]'>
                          Couple photo will appear here
                        </div>
                      )}
                      <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent px-4 pb-6 pt-10 text-center text-white'>
                        <p className='text-[10px] uppercase tracking-[0.24em] text-white/80'>Wedding Invitation</p>
                        <p className='mt-2 font-serif text-2xl tracking-[-0.03em]'>{heroMonogram}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            <div className='border-y bg-white/40 px-4 py-4 sm:px-6' style={{ borderColor: 'var(--brand-border)' }}>
              <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div className='space-y-2'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-primary)] sm:text-xs'>Explore the invitation</p>
                  <p className='max-w-2xl text-sm leading-6 text-[color:var(--brand-muted-text)]'>A quick guide for guests who want to jump straight to details, map, RSVP, or wishes.</p>
                </div>
                <div className='flex flex-col gap-3 md:items-end'>
                  <Tabs value={activeSection} onValueChange={(value) => {
                    setActiveSection(value);
                    document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}>
                    <TabsList className='w-full max-w-full overflow-x-auto rounded-[24px] border p-1.5 whitespace-nowrap md:w-auto' style={{ borderColor: 'var(--brand-border)', backgroundColor: hexToRgba(brandPrimary, 0.09) }}>
                      {sectionLinks.map((link) => (
                        <TabsTrigger
                          key={link.id}
                          value={link.id}
                          className='shrink-0 rounded-2xl border border-transparent px-3 py-2 text-[color:var(--brand-muted-text)] data-[active=true]:border-[color:var(--brand-border)] data-[active=true]:bg-[color:var(--brand-primary)] data-[active=true]:text-white'
                        >
                          {link.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  {hasVenueLocation ? <Button type='button' variant='outline' className='bg-white text-[color:var(--brand-ink)]' style={{ borderColor: 'var(--brand-border)' }} onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}>View Venue Map</Button> : null}
                </div>
              </div>
            </div>
          </div>
        </SectionMotion>

        <SectionMotion index={1}>
          <Card className='overflow-hidden rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm' style={{ borderColor: 'var(--brand-border)' }}>
            <CardContent className='space-y-7 px-5 py-7 sm:px-7 sm:py-10 md:px-9 lg:px-12'>
              <SectionHeading
                eyebrow='Cinematic Moments'
                title='Prenup Film & Gallery'
                description='Set the mood before the big day with the couple’s highlights, moving portraits, and favorite stills.'
              />
              {prenupVideoId ? (
                <LazyYouTubeEmbed
                  videoId={prenupVideoId}
                  title='Prenup video'
                  autoplay
                  muted
                />
              ) : (
                <div className='rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-5 py-8 text-sm leading-6 text-[color:var(--brand-muted-text)]'>
                  Video details are not available yet. Please check back later.
                </div>
              )}

              {galleryImages.length > 0 ? (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-sm font-medium text-neutral-900'>Photo Gallery</p>
                    <p className='text-xs uppercase tracking-[0.18em] text-[color:var(--brand-muted-text)]'>{galleryImages.length} photos</p>
                  </div>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                    {galleryImages.map((item, index) => (
                      <button
                        key={item.id}
                        type='button'
                        className='group relative h-32 overflow-hidden rounded-2xl border border-[color:var(--brand-border)]'
                        onClick={() => setLightboxIndex(index)}
                        aria-label={`Open ${item.title}`}
                      >
                        <Image
                          src={item.url}
                          alt={item.title}
                          fill
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
          </Card>
        </SectionMotion>

        <SectionMotion index={2}>
          <Card className='overflow-hidden rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm' style={{ borderColor: 'var(--brand-border)' }}>
            <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
              <SectionHeading
                eyebrow='Day Of'
                title='Countdown to Wedding Day'
                description='Every second brings us closer to the celebration. Save the date and follow the story below for everything you’ll need.'
              />
              <CountdownTimer weddingDate={weddingDate} />
            </CardContent>
          </Card>
        </SectionMotion>

        <SectionMotion index={3} id='story-section'><Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm'><CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'><SectionHeading eyebrow='Our Story' title='Love Story Timeline' description='A quiet look back at the moments that brought this celebration to life.' />{loveStoryChapters.length === 0 ? <p className='rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>Love story details are not available yet. Please check back later.</p> : <Timeline>{loveStoryChapters.map((chapter, index) => (<TimelineItem key={chapter.id ?? `${chapter.title}-${index}`}><TimelinePoint className='border-[color:var(--brand-border)] bg-[color:var(--brand-accent-soft)]' />{index < loveStoryChapters.length - 1 ? <TimelineLine className='bg-[color:var(--brand-accent-soft)]' /> : null}<Card className='overflow-hidden border-[color:var(--brand-border)] bg-white'><CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>{chapter.photo_path ? <div className='overflow-hidden rounded-2xl'><Image src={resolveAssetUrl(chapter.photo_path) ?? chapter.photo_path} alt={chapter.title ?? 'Love story chapter'} width={860} height={420} className='h-48 w-full object-cover grayscale sm:h-56' /></div> : null}<div className='space-y-2'><h3 className='font-serif uppercase text-[1.55rem] leading-tight tracking-[-0.03em] text-neutral-950'>{chapter.title ?? 'Untitled chapter'}</h3>{chapter.chapter_date ? <p className='text-xs uppercase tracking-[0.18em] text-[color:var(--brand-muted-text)]'>{formatWeddingDate(chapter.chapter_date)}</p> : null}<p className='text-sm leading-7 text-[color:var(--brand-ink)]'>{chapter.story_text ?? ''}</p></div></CardContent></Card></TimelineItem>))}</Timeline>}</CardContent></Card></SectionMotion>

        <SectionMotion index={4} id='schedule-section'><Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm'><CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'><SectionHeading eyebrow='Flow Of The Day' title='Wedding Day Schedule' description='A simple guide to the celebration so you know where to be and when to arrive.' />{schedule.length === 0 ? <p className='rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>Schedule details are not available yet. Please check back later.</p> : <Timeline>{schedule.map((item, index) => (<TimelineItem key={`${item.time}-${item.event}-${index}`}><TimelinePoint className='border-[color:var(--brand-border)] bg-[color:var(--brand-accent-soft)]' />{index < schedule.length - 1 ? <TimelineLine className='bg-[color:var(--brand-accent-soft)]' /> : null}<Card className='border-[color:var(--brand-border)] bg-[color:var(--brand-surface)]'><CardContent className='space-y-3 p-4 lg:p-5'><div className='flex flex-wrap items-center gap-2'><Badge className='border-[color:var(--brand-border)] bg-white text-[color:var(--brand-ink)]'>{formatScheduleTime(item.time)}</Badge><p className='font-serif uppercase text-[1.35rem] leading-tight tracking-[-0.03em] text-neutral-950'>{item.event ?? 'Event'}</p></div>{item.description ? <p className='text-sm leading-7 text-[color:var(--brand-muted-text)]'>{item.description}</p> : null}</CardContent></Card></TimelineItem>))}</Timeline>}</CardContent></Card></SectionMotion>

        <SectionMotion index={5} id='venue-section'>
          <Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm' style={{ borderColor: 'var(--brand-border)' }}>
            <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
              <SectionHeading
                eyebrow='Getting There'
                title='Venue & Directions'
                description='Find the ceremony location quickly, save it to your preferred map app, and plan your arrival with confidence.'
              />
              {hasVenueLocation ? (
                <div className='grid gap-6 md:grid-cols-[1.15fr_0.85fr] lg:grid-cols-[1.4fr_0.6fr]'>
                  <div className='overflow-hidden rounded-2xl border border-[color:var(--brand-border)] bg-white'>
                    <iframe title='Venue map' className='h-64 w-full sm:h-80 lg:h-full' src={mapsEmbedUrl} loading='lazy' />
                  </div>
                  <div className='space-y-4 rounded-2xl border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] p-5'>
                    <div className='space-y-2'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-muted-text)]'>{venueLocationLabel}</p>
                      <p className='text-sm leading-6 text-[color:var(--brand-ink)]'>{venueAddress.trim() || venueText}</p>
                    </div>
                    <div className='grid gap-3'>
                      <Button type='button' className='text-[color:var(--brand-on-primary)] hover:opacity-95' style={{ backgroundColor: 'var(--brand-primary)' }} onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}>Open in Google Maps</Button>
                      <Button type='button' variant='outline' className='bg-white text-[color:var(--brand-ink)]' style={{ borderColor: 'var(--brand-border)' }} onClick={() => window.open(wazeUrl, '_blank', 'noopener,noreferrer')}>Open in Waze</Button>
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
        </SectionMotion>

        <SectionMotion index={6}><Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm'><CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'><SectionHeading eyebrow='Wedding Party' title='Entourage Gallery' description='Meet the people walking with the couple through one of the most meaningful days of their lives.' />{groupedEntourage.length === 0 ? <p className='rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>Entourage details are not available yet. Please check back later.</p> : groupedEntourage.map((group) => (<div key={group.label} className='space-y-4'><h3 className='font-serif uppercase text-[1.55rem] leading-tight tracking-[-0.03em] text-neutral-950'>{group.label}</h3><div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>{group.members.map((member) => { const photoUrl = resolveAssetUrl(member.photo_path); const initials = String(member.name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join(''); return (<Card key={member.id ?? `${member.name}-${member.role}`} className='overflow-hidden border-[color:var(--brand-border)] bg-white'><CardContent className='space-y-3 p-3 text-center'>{photoUrl ? <Image src={photoUrl} alt={member.name ?? 'Entourage'} width={240} height={240} className='h-32 w-full rounded-xl object-cover grayscale' /> : <div className='flex h-32 items-center justify-center rounded-xl bg-[color:var(--brand-surface)] text-xl font-semibold text-[color:var(--brand-ink)]'>{initials || '?'}</div>}<p className='font-serif text-lg uppercase leading-tight tracking-[-0.03em] text-neutral-950'>{member.name ?? 'Unnamed'}</p><Badge className='border-[color:var(--brand-border)] bg-white text-[color:var(--brand-ink)]'>{roleToLabel(String(member.role ?? 'entourage'))}</Badge></CardContent></Card>); })}</div></div>))}</CardContent></Card></SectionMotion>

        <SectionMotion index={7}><Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm'><CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'><SectionHeading eyebrow='Style Notes' title='Dress Code' description='Come dressed for the mood of the celebration, with a palette that complements the couple’s chosen aesthetic.' /><p className='max-w-3xl text-sm leading-7 text-[color:var(--brand-ink)]'>{String(invitation.dress_code ?? 'Formal attire preferred.')}</p><div className='flex flex-wrap gap-4'>{dressColors.length === 0 ? <p className='text-sm text-[color:var(--brand-muted-text)]'>Color palette to be announced.</p> : dressColors.map((color) => (<div key={color} className='min-w-[96px] rounded-2xl border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] p-3 text-center shadow-sm'><span className='mx-auto block h-12 w-12 rounded-full border border-[color:var(--brand-border)] shadow-inner grayscale' style={{ backgroundColor: color }} aria-label={`Dress color ${color}`} title={color} /><p className='mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--brand-muted-text)]'>{color}</p></div>))}</div></CardContent></Card></SectionMotion>

        <SectionMotion index={8}><Card className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm'><CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'><SectionHeading eyebrow='Gift Guide' title='Cash Gift / QR Codes' description='If you’d like to bless the couple, their preferred gift methods are listed below for convenience.' />{giftMethods.length === 0 ? <p className='rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>Gift details are not available yet. Please check back later.</p> : <div className='grid gap-4 sm:grid-cols-2'>{giftMethods.map((method, index) => { const qrUrl = resolveAssetUrl(method.qr_path) ?? ''; return (<Card key={`${method.label}-${index}`} className='border-[color:var(--brand-border)] bg-white'><CardContent className='space-y-4 p-5'><p className='font-serif uppercase text-[1.5rem] leading-tight tracking-[-0.03em] text-neutral-950'>{method.label ?? 'Gift Method'}</p>{qrUrl ? <Image src={qrUrl} alt={`${method.label ?? 'Gift'} QR`} width={320} height={320} className='h-44 w-full rounded-2xl border border-[color:var(--brand-border)] bg-white p-3 object-contain grayscale' /> : <div className='flex h-44 items-center justify-center rounded-2xl bg-[color:var(--brand-surface)] text-sm text-[color:var(--brand-muted-text)]'>QR code not uploaded</div>}<div className='space-y-2 text-sm leading-7 text-[color:var(--brand-ink)]'><p>Account Name: {method.account_name ?? '-'}</p><p>Account Number: {method.account_number ?? '-'}</p></div></CardContent></Card>); })}</div>}</CardContent></Card></SectionMotion>

        <SectionMotion index={9} id='rsvp-section'>
          <section
            ref={rsvpRef}
            className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 p-1 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm sm:p-2'
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
          <div className='rounded-[24px] border border-[color:var(--brand-border)] bg-white/70 p-1 shadow-[0_12px_30px_rgba(88,55,43,0.08)] backdrop-blur-sm sm:p-2'>
            <WishesWall canSubmitWish={hasRsvpSubmission} slug={slug} />
          </div>
        </SectionMotion>
      </section>

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

      {showStickyControls ? (
        <div className='fixed inset-x-3 bottom-3 z-50 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] sm:inset-x-6 sm:bottom-6 sm:justify-end sm:pb-0 md:inset-x-8 lg:inset-x-auto lg:right-10'>
          {showBackToTop ? (
            <Button
              type='button'
              variant='outline'
              className='bg-white/95 text-neutral-800 shadow-sm'
              style={{ borderColor: 'var(--brand-border)' }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
            </Button>
          ) : null}
          {showStickyMapCta ? (
            <Button
              type='button'
              variant='outline'
              className='bg-white/95 text-[color:var(--brand-ink)] shadow-sm'
              style={{ borderColor: 'var(--brand-border)' }}
              onClick={() => document.getElementById('venue-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Map
            </Button>
          ) : null}
          {showStickyRsvpCta ? (
            <Button type='button' className='w-full text-[color:var(--brand-on-primary)] shadow-lg hover:opacity-95 sm:w-auto lg:px-6' style={{ backgroundColor: 'var(--brand-primary)' }} onClick={() => document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' })}>RSVP Now</Button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}








```

## File: frontend/src/components/invitation/RSVPForm.tsx
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import Confetti from "react-confetti";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { GuestInvitationGroupGuest, GuestRsvpResponse, getGuestRsvp, submitGuestRsvp } from "@/lib/guest";

const mealOptions = ["Beef", "Fish", "Vegetarian", "Kids"] as const;
const transportOptions = [
  { value: "has_car", label: "Has Car" },
  { value: "needs_shuttle", label: "Needs Shuttle" },
  { value: "own_arrangement", label: "Own Arrangement" },
] as const;
const TOTAL_STEPS = 4;
const STEP_LABELS = [
  { title: "Memory", description: "Start with something personal." },
  { title: "Attendance", description: "Let the couple know your plan." },
  { title: "Details", description: "Share meal and transport choices." },
  { title: "Message", description: "Leave a final note for the couple." },
] as const;
const BRAND_PRIMARY_BUTTON = "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)] hover:opacity-95";
const BRAND_BORDER = "border-[color:var(--brand-border)]";
const BRAND_SOFT = "bg-[color:var(--brand-accent-soft)]";
const BRAND_SURFACE = "bg-[color:var(--brand-surface)]";

const rsvpSchema = z
  .object({
    favorite_memory: z.string().max(300, "Favorite memory must be 300 characters or less.").optional().or(z.literal("")),
    attending: z.boolean().optional(),
    guest_id: z.number().int().positive().nullable(),
    guest_name: z.string().max(120, "Name is too long."),
    has_plus_one: z.boolean(),
    plus_one_name: z.string().max(120, "Plus one name is too long.").optional().or(z.literal("")),
    meal_preference: z.enum(mealOptions).nullable(),
    transport: z.enum(["has_car", "needs_shuttle", "own_arrangement"]).nullable(),
    message_to_couple: z.string().max(500, "Message must be 500 characters or less.").optional().or(z.literal("")),
  })
  .superRefine((values, context) => {
    if (typeof values.attending !== "boolean") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["attending"], message: "Please choose if you will attend." });
    }

    if (values.guest_id === null && values.guest_name.trim() === "") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["guest_name"], message: "Select a guest or enter a full name." });
    }

    if (values.attending === true && values.guest_id === null && values.guest_name.trim() === "") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["guest_name"], message: "Full name is required if attending." });
    }

    if (values.attending === true && values.has_plus_one && (values.plus_one_name ?? "").trim() === "") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["plus_one_name"], message: "Plus one name is required when enabled." });
    }

    if (values.attending === true && values.meal_preference === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["meal_preference"], message: "Please select a meal preference." });
    }

    if (values.attending === true && values.transport === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["transport"], message: "Please select transport." });
    }
  });

type RsvpFormValues = z.infer<typeof rsvpSchema>;

interface RSVPFormProps {
  partnerNames: string;
  weddingDate?: string;
  weddingTime?: string;
  venueName?: string;
  heroImageUrl?: string | null;
  isPremium: boolean;
  groupName?: string | null;
  groupGuests?: GuestInvitationGroupGuest[];
  onViewInvitationAgain: () => void;
  onSubmissionStateChange?: (submitted: boolean) => void;
}

function formatDisplayDate(value?: string): string {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatDisplayTime(value?: string): string {
  if (!value) return "TBA";
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function buildEventStartDate(weddingDate?: string, weddingTime?: string): Date {
  if (!weddingDate) return new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (weddingTime) {
    const [hourRaw, minuteRaw] = weddingTime.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      date.setHours(hour, minute, 0, 0);
      return date;
    }
  }
  date.setHours(9, 0, 0, 0);
  return date;
}

function buildGoogleCalendarUrl(params: { title: string; details: string; location: string; weddingDate?: string; weddingTime?: string }): string {
  const start = buildEventStartDate(params.weddingDate, params.weddingTime);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const format = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}00Z`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${format(start)}/${format(end)}`);
  url.searchParams.set("details", params.details);
  url.searchParams.set("location", params.location);
  return url.toString();
}

function buildAppleCalendarUrl(params: { title: string; details: string; location: string; weddingDate?: string; weddingTime?: string }): string {
  const start = buildEventStartDate(params.weddingDate, params.weddingTime);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const format = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}00Z`;
  const escapeText = (value: string) => value.replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Online//Boarding Pass//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@wedding-online`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${escapeText(params.title)}`,
    `DESCRIPTION:${escapeText(params.details)}`,
    `LOCATION:${escapeText(params.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function RSVPForm({
  partnerNames,
  weddingDate,
  weddingTime,
  venueName,
  heroImageUrl,
  isPremium,
  groupName,
  groupGuests = [],
  onViewInvitationAgain,
  onSubmissionStateChange,
}: RSVPFormProps) {
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSubmission, setRecentSubmission] = useState<GuestRsvpResponse | null>(null);
  const [activeSubmittedGuestId, setActiveSubmittedGuestId] = useState<number | null>(null);
  const [showFlipReveal, setShowFlipReveal] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const hasGroupRoster = groupGuests.length > 0;

  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      favorite_memory: "",
      attending: undefined,
      guest_id: null,
      guest_name: "",
      has_plus_one: false,
      plus_one_name: "",
      meal_preference: null,
      transport: null,
      message_to_couple: "",
    },
    mode: "onChange",
  });

  const lookupQuery = useQuery({ queryKey: ["guest-rsvp"], queryFn: getGuestRsvp, retry: false });
  const submitMutation = useMutation({
    mutationFn: submitGuestRsvp,
    onSuccess: (response) => {
      setErrorMessage(null);
      setRecentSubmission(response.rsvp);
      setActiveSubmittedGuestId(response.rsvp.id);
      setShowFlipReveal(true);
      void lookupQuery.refetch();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Unable to submit RSVP right now. Please try again.");
    },
  });

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectedGuestId = form.watch("guest_id");
  const attending = form.watch("attending");
  const hasPlusOne = form.watch("has_plus_one");
  const currentProgress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);
  const activeStepMeta = STEP_LABELS[step - 1];
  const submittedRsvps = useMemo(
    () => lookupQuery.data?.rsvps ?? [],
    [lookupQuery.data?.rsvps],
  );
  const submittedById = useMemo(
    () => new Map<number, GuestRsvpResponse>(submittedRsvps.map((rsvp) => [rsvp.id, rsvp])),
    [submittedRsvps],
  );
  const groupGuestsWithStatus = useMemo(
    () => groupGuests.map((guest) => {
      const submitted = submittedById.get(guest.id);
      return {
        ...guest,
        submitted_at: submitted?.submitted_at ?? guest.submitted_at,
      };
    }),
    [groupGuests, submittedById],
  );
  const fallbackLatestRsvp = lookupQuery.data?.latest_rsvp ?? null;
  const pendingGuest = groupGuestsWithStatus.find((guest) => guest.submitted_at === null) ?? null;
  const pendingGuests = groupGuestsWithStatus.filter((guest) => guest.submitted_at === null);
  const submittedGuests = groupGuestsWithStatus.filter((guest) => guest.submitted_at !== null);
  const selectedSubmittedRsvp = selectedGuestId !== null ? submittedById.get(selectedGuestId) ?? null : null;
  const boardingPass = (
    activeSubmittedGuestId !== null
      ? submittedById.get(activeSubmittedGuestId) ?? (recentSubmission?.id === activeSubmittedGuestId ? recentSubmission : null)
      : selectedSubmittedRsvp
  ) ?? recentSubmission ?? (!hasGroupRoster ? (lookupQuery.data?.rsvp ?? fallbackLatestRsvp) : null);

  useEffect(() => {
    if (!hasGroupRoster) return;
    if (selectedGuestId !== null) return;

    if (pendingGuest) {
      form.setValue("guest_id", pendingGuest.id, { shouldDirty: false });
      setActiveSubmittedGuestId(null);
      return;
    }

    if (groupGuestsWithStatus[0]) {
      form.setValue("guest_id", groupGuestsWithStatus[0].id, { shouldDirty: false });
      if (groupGuestsWithStatus[0].submitted_at) {
        setActiveSubmittedGuestId(groupGuestsWithStatus[0].id);
      }
    }
  }, [form, groupGuestsWithStatus, hasGroupRoster, pendingGuest, selectedGuestId]);

  useEffect(() => {
    if (selectedGuestId === null) return;
    setActiveSubmittedGuestId(submittedById.has(selectedGuestId) ? selectedGuestId : null);
  }, [selectedGuestId, submittedById]);

  useEffect(() => {
    onSubmissionStateChange?.(boardingPass !== null || submittedRsvps.length > 0);
  }, [boardingPass, onSubmissionStateChange, submittedRsvps.length]);

  const goNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const valid = await form.trigger("attending");
      if (valid) setStep(3);
      return;
    }
    if (step === 3) {
      if (hasGroupRoster && selectedGuestId === null) {
        setErrorMessage("Select the invited guest you are responding for.");
        return;
      }
      const fields: Array<keyof RsvpFormValues> = [
        hasGroupRoster ? "guest_id" : "guest_name",
        "plus_one_name",
        "meal_preference",
        "transport",
      ];
      const valid = await form.trigger(fields);
      if (valid) setStep(4);
    }
  };

  const onSubmit = async (values: RsvpFormValues) => {
    const isAttending = values.attending === true;
    if (hasGroupRoster && values.guest_id === null) {
      setErrorMessage("Select the invited guest you are responding for.");
      return;
    }

    await submitMutation.mutateAsync({
      guest_id: hasGroupRoster ? values.guest_id : null,
      guest_name: hasGroupRoster ? null : (values.guest_name.trim() === "" ? "Guest" : values.guest_name.trim()),
      attending: isAttending,
      plus_one_name: isAttending && values.has_plus_one ? values.plus_one_name?.trim() || null : null,
      meal_preference: isAttending ? values.meal_preference : null,
      transport: isAttending ? values.transport : null,
      favorite_memory: values.favorite_memory?.trim() || null,
      message_to_couple: values.message_to_couple?.trim() || null,
    });
  };

  if (lookupQuery.isLoading) return <p className="text-sm text-[color:var(--brand-muted-text)]">Loading RSVP status...</p>;

  if (boardingPass) {
    const formattedDate = formatDisplayDate(weddingDate);
    const formattedTime = formatDisplayTime(weddingTime);
    const googleCalendarUrl = buildGoogleCalendarUrl({
      title: `${partnerNames} Wedding`,
      details: `Confirmation: ${boardingPass.confirmation_code}`,
      location: venueName ?? "Wedding Venue",
      weddingDate,
      weddingTime,
    });
    const appleCalendarUrl = buildAppleCalendarUrl({
      title: `${partnerNames} Wedding`,
      details: `Confirmation: ${boardingPass.confirmation_code}`,
      location: venueName ?? "Wedding Venue",
      weddingDate,
      weddingTime,
    });

    return (
        <div className="space-y-5 overflow-hidden">
          {isPremium && showFlipReveal && viewport.width > 0 && viewport.height > 0 ? <Confetti width={viewport.width} height={viewport.height} numberOfPieces={180} recycle={false} gravity={0.25} /> : null}
          {fallbackLatestRsvp && !recentSubmission ? (
            <Card className={`${BRAND_BORDER} bg-[color:var(--brand-surface)] shadow-sm`}>
              <CardHeader><CardTitle className="text-neutral-950">A guest in your group already has a recorded RSVP. Here&apos;s the current confirmation.</CardTitle></CardHeader>
            </Card>
          ) : null}

        <div className="[perspective:1200px]">
          <motion.div initial={showFlipReveal ? { rotateY: 180, opacity: 0 } : { rotateY: 0, opacity: 1 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="gpu-transform [transform-style:preserve-3d]">
            <Card className={`overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-[0_18px_40px_rgba(0,0,0,0.08)]`}>
              <CardContent className="space-y-5 bg-[linear-gradient(180deg,#fafaf8,#fff)] p-5 sm:p-6">
                <div className={`flex items-center justify-between border-b border-dashed ${BRAND_BORDER} pb-3`}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--brand-muted-text)]">Boarding Pass</p>
                      <h3 className="font-serif text-lg uppercase tracking-[-0.03em] text-neutral-950">{partnerNames} Wedding</h3>
                      {groupName ? <p className="text-sm text-[color:var(--brand-muted-text)]">{groupName}</p> : null}
                    </div>
                  <Avatar alt={partnerNames} src={heroImageUrl ?? null} fallback={partnerNames.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "WO"} />
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className={`rounded-2xl border ${BRAND_BORDER} bg-[color:var(--brand-surface)] px-4 py-3`}><span className="font-semibold text-neutral-950">Guest:</span> <span className="text-[color:var(--brand-ink)]">{boardingPass.guest_name}</span></div>
                  <div className={`rounded-2xl border ${BRAND_BORDER} bg-[color:var(--brand-surface)] px-4 py-3`}><span className="font-semibold text-neutral-950">Date:</span> <span className="text-[color:var(--brand-ink)]">{formattedDate}</span></div>
                  <div className={`rounded-2xl border ${BRAND_BORDER} bg-[color:var(--brand-surface)] px-4 py-3`}><span className="font-semibold text-neutral-950">Time:</span> <span className="text-[color:var(--brand-ink)]">{formattedTime}</span></div>
                  <div className={`rounded-2xl border ${BRAND_BORDER} bg-[color:var(--brand-surface)] px-4 py-3`}><span className="font-semibold text-neutral-950">Venue:</span> <span className="text-[color:var(--brand-ink)]">{venueName ?? "TBA"}</span></div>
                </div>
                <div className={`rounded-3xl border ${BRAND_BORDER} bg-[color:var(--brand-surface)] p-4 text-sm text-[color:var(--brand-muted-text)]`}>
                  <p className="font-semibold tracking-[0.18em] text-neutral-950">Confirmation: {boardingPass.confirmation_code}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <p>Meal: {boardingPass.meal_preference ?? "-"}</p>
                    <p>+1: {boardingPass.plus_one_name ?? "-"}</p>
                    <p>Transport: {boardingPass.transport ?? "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Card className={`${BRAND_BORDER} bg-white/95 shadow-sm`}>
          <CardHeader><CardTitle className="font-serif uppercase tracking-[-0.03em] text-neutral-950">Add to Calendar</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className={`w-full sm:w-auto ${BRAND_PRIMARY_BUTTON}`} onClick={() => window.open(googleCalendarUrl, "_blank", "noopener,noreferrer")}>Google Calendar</Button>
            <a href={appleCalendarUrl} download="wedding-boarding-pass.ics" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className={`w-full ${BRAND_BORDER} bg-white text-[color:var(--brand-ink)]`}>Apple Calendar</Button>
            </a>
          </CardContent>
        </Card>

        <Card className={`overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-sm`}>
          {heroImageUrl ? (
            <div className="relative h-36 w-full">
              <Image src={heroImageUrl} alt={`${partnerNames} hero photo`} fill sizes="(max-width: 640px) 100vw, 768px" className="object-cover grayscale" />
            </div>
          ) : <div className="h-36 w-full bg-gradient-to-r from-[#ecebe7] to-[#d9d8d3]" />}
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium text-neutral-950">We can&apos;t wait to celebrate with you, {boardingPass.guest_name}.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {pendingGuest ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={`${BRAND_BORDER} bg-white text-[color:var(--brand-ink)]`}
                    onClick={() => {
                      form.setValue("guest_id", pendingGuest.id, { shouldValidate: true });
                      setActiveSubmittedGuestId(null);
                      setRecentSubmission(null);
                      setShowFlipReveal(false);
                      setStep(1);
                    }}
                  >
                    RSVP for Another Guest
                  </Button>
                ) : null}
                <Button type="button" variant="outline" className={`${BRAND_BORDER} bg-white text-[color:var(--brand-ink)]`} onClick={onViewInvitationAgain}>View Invitation Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-[0_16px_40px_rgba(0,0,0,0.06)]`}>
      <CardHeader className="space-y-4 bg-[linear-gradient(180deg,#fafaf8,#fff)]">
        <div className="space-y-2">
          <CardTitle className="font-serif text-2xl leading-tight tracking-[-0.025em] text-neutral-950">RSVP Journey</CardTitle>
          <p className="text-sm text-[color:var(--brand-muted-text)]">{activeStepMeta.description}</p>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--brand-muted-text)]">Takes about 1 minute.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--brand-muted-text)]">
            <span className={`rounded-full border ${BRAND_BORDER} bg-white px-2.5 py-1`}>Step {step} of {TOTAL_STEPS}</span>
            {groupName ? <span className={`rounded-full border ${BRAND_BORDER} bg-white px-2.5 py-1`}>Group: {groupName}</span> : null}
            <span className={`rounded-full border ${BRAND_BORDER} ${BRAND_SURFACE} px-2.5 py-1`}>{activeStepMeta.title}</span>
          </div>
        </div>
        <Progress
          value={currentProgress}
          className={`${BRAND_SURFACE} h-2.5`}
          indicatorClassName="bg-[color:var(--brand-primary)]"
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {STEP_LABELS.map((item, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === step;
            const isComplete = stepNumber < step;
            const stateLabel = isActive ? "Active" : isComplete ? "Done" : "Upcoming";
            return (
              <div key={item.title} className={isActive ? `rounded-2xl border ${BRAND_BORDER} px-3 py-2 text-white shadow-sm ring-1 ring-[color:var(--brand-primary)]` : isComplete ? `rounded-2xl border ${BRAND_BORDER} ${BRAND_SOFT} px-3 py-2 text-[color:var(--brand-ink)]` : `rounded-2xl border ${BRAND_BORDER} bg-white px-3 py-2 text-[color:var(--brand-muted-text)]`} style={isActive ? { backgroundColor: "var(--brand-primary)" } : undefined}>
                <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] md:text-[11px]">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px] font-semibold">
                    {stepNumber}
                  </span>
                  Step {stepNumber}
                </p>
                <p className="mt-1 text-sm font-semibold leading-tight md:text-[15px]">{item.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em]">{stateLabel}</p>
              </div>
            );
          })}
        </div>
      </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? <Alert variant="destructive"><AlertTitle>Submission error</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert> : null}
          {hasGroupRoster ? (
            <div className={`rounded-3xl border ${BRAND_BORDER} ${BRAND_SOFT} p-4`}>
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-950">Invited guests in this group</p>
                <p className="text-sm text-[color:var(--brand-muted-text)]">Choose the guest you are responding for. Done guests stay available for confirmation review.</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className={`rounded-2xl border ${BRAND_BORDER} bg-white px-3 py-3`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--brand-muted-text)]">Group size</p>
                  <p className="mt-1 text-xl font-semibold text-neutral-950">{groupGuestsWithStatus.length}</p>
                </div>
                <div className={`rounded-2xl border ${BRAND_BORDER} bg-white px-3 py-3`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--brand-muted-text)]">Pending</p>
                  <p className="mt-1 text-xl font-semibold text-neutral-950">{pendingGuests.length}</p>
                </div>
                <div className={`rounded-2xl border ${BRAND_BORDER} bg-white px-3 py-3`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--brand-muted-text)]">Done</p>
                  <p className="mt-1 text-xl font-semibold text-neutral-950">{submittedGuests.length}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {groupGuestsWithStatus.map((guest) => {
                  const isSelected = selectedGuestId === guest.id;
                  const hasSubmitted = guest.submitted_at !== null;
                  return (
                    <button
                      key={guest.id}
                      type="button"
                      className={isSelected ? `rounded-2xl border ${BRAND_BORDER} px-4 py-3 text-left text-white` : hasSubmitted ? `rounded-2xl border ${BRAND_BORDER} ${BRAND_SOFT} px-4 py-3 text-left text-[color:var(--brand-ink)]` : `rounded-2xl border ${BRAND_BORDER} bg-white px-4 py-3 text-left text-neutral-950`}
                      style={isSelected ? { backgroundColor: "var(--brand-primary)" } : undefined}
                      onClick={() => {
                        setErrorMessage(null);
                        form.setValue("guest_id", guest.id, { shouldValidate: true });
                      }}
                    >
                      <p className="text-sm font-semibold">{guest.guest_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em]">
                        {hasSubmitted ? "Done" : "Pending response"}
                      </p>
                      {hasSubmitted ? (
                        <span className="mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "var(--brand-border)" }}>
                          Done
                        </span>
                      ) : null}
                      {hasSubmitted && guest.confirmation_code ? (
                        <p className="mt-2 text-xs text-current/80">Code: {guest.confirmation_code}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="space-y-4">
            {step === 1 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-950">What&apos;s your favorite memory with {partnerNames}?</p>
                  <p className="text-sm text-[color:var(--brand-muted-text)]">A short story makes the RSVP feel warmer and more personal.</p>
                </div>
                <Textarea {...form.register("favorite_memory")} placeholder="Share a short memory..." rows={4} />
                <p className="text-xs text-[color:var(--brand-muted-text)]">{(form.watch("favorite_memory") ?? "").length}/300</p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-950">Will you be attending?</p>
                  <p className="text-sm text-[color:var(--brand-muted-text)]">Choose the option that reflects your current plan.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant={attending === true ? "default" : "outline"} className="h-12" onClick={() => form.setValue("attending", true, { shouldValidate: true })}>Yes</Button>
                  <Button type="button" variant={attending === false ? "default" : "outline"} className={`h-12 ${BRAND_BORDER} bg-white text-[color:var(--brand-ink)]`} onClick={() => form.setValue("attending", false, { shouldValidate: true })}>No</Button>
                </div>
                {form.formState.errors.attending ? <p className="text-xs text-red-700">{form.formState.errors.attending.message}</p> : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className={`rounded-2xl border ${BRAND_BORDER} ${BRAND_SOFT} px-4 py-3 text-sm text-[color:var(--brand-muted-text)]`}>
                  {attending
                    ? "We'll only ask for the details needed to help the couple prepare well for the day."
                    : "Choose the guest you are responding for, then continue to leave a message for the couple."}
                </div>

                {!hasGroupRoster ? (
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="guest_name">Full Name</label>
                    <Input id="guest_name" {...form.register("guest_name")} placeholder="Juan Dela Cruz" />
                    {form.formState.errors.guest_name ? <p className="text-xs text-red-700">{form.formState.errors.guest_name.message}</p> : null}
                  </div>
                ) : selectedGuestId === null ? (
                  <p className="text-xs text-red-700">Select the guest you are responding for.</p>
                ) : null}

                {attending ? (
                  <>
                    <div className="space-y-2">
                      <Button type="button" variant={hasPlusOne ? "default" : "outline"} className="h-11 w-full" onClick={() => form.setValue("has_plus_one", !hasPlusOne)}>
                        {hasPlusOne ? "Remove +1" : "Bringing a +1?"}
                      </Button>
                      {hasPlusOne ? <div className="space-y-1"><Input {...form.register("plus_one_name")} placeholder="Plus one full name" />{form.formState.errors.plus_one_name ? <p className="text-xs text-red-700">{form.formState.errors.plus_one_name.message}</p> : null}</div> : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Meal Preference</p>
                      <div className="grid grid-cols-2 gap-2">
                        {mealOptions.map((option) => <Button key={option} type="button" variant={form.watch("meal_preference") === option ? "default" : "outline"} onClick={() => form.setValue("meal_preference", option, { shouldValidate: true })}>{option}</Button>)}
                      </div>
                      {form.formState.errors.meal_preference ? <p className="text-xs text-red-700">{form.formState.errors.meal_preference.message}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Transport</p>
                      <div className="space-y-2">
                        {transportOptions.map((option) => <Button key={option.value} type="button" variant={form.watch("transport") === option.value ? "default" : "outline"} className="h-11 w-full justify-start" onClick={() => form.setValue("transport", option.value, { shouldValidate: true })}>{option.label}</Button>)}
                      </div>
                      {form.formState.errors.transport ? <p className="text-xs text-red-700">{form.formState.errors.transport.message}</p> : null}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-950">Leave a message for the couple</p>
                  <p className="text-sm text-[color:var(--brand-muted-text)]">A note here becomes part of their memory archive.</p>
                </div>
                <Textarea {...form.register("message_to_couple")} placeholder="Your message..." rows={5} />
                <p className="text-xs text-[color:var(--brand-muted-text)]">{(form.watch("message_to_couple") ?? "").length}/500</p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className={`w-full ${BRAND_BORDER} bg-white text-[color:var(--brand-ink)]`} disabled={step === 1 || submitMutation.isPending} onClick={() => setStep((prev) => Math.max(1, prev - 1))}>Back</Button>
          {step < TOTAL_STEPS ? (
            <Button type="button" className={`w-full ${BRAND_PRIMARY_BUTTON}`} onClick={goNext}>Continue</Button>
          ) : (
            <Button type="button" className={`w-full ${BRAND_PRIMARY_BUTTON}`} disabled={submitMutation.isPending} onClick={form.handleSubmit(onSubmit)}>{submitMutation.isPending ? "Submitting..." : "Submit RSVP"}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

```

## File: frontend/src/components/invitation/WishesWall.tsx
```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { createGuestWish, flagGuestWish, getGuestWishes } from "@/lib/guest";

const wishSchema = z.object({
  guest_name: z.string().min(1, "Name is required.").max(120, "Name is too long."),
  message: z.string().min(1, "Message is required.").max(500, "Message must be 500 characters or less."),
});

type WishFormValues = z.infer<typeof wishSchema>;

interface WishesWallProps {
  canSubmitWish: boolean;
  slug: string;
}

const BRAND_BORDER = "border-[color:var(--brand-border)]";
const BRAND_SURFACE = "bg-[color:var(--brand-surface)]";
const BRAND_SOFT = "bg-[color:var(--brand-accent-soft)]";
const BRAND_PRIMARY_BUTTON = "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)] hover:opacity-95";

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  const secondsDiff = Math.floor((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const thresholds: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
  ];

  let delta = secondsDiff;
  for (const [limit, unit] of thresholds) {
    if (Math.abs(delta) < limit) return formatter.format(delta, unit);
    delta = Math.round(delta / limit);
  }

  return formatter.format(delta, "year");
}

export function WishesWall({ canSubmitWish, slug }: WishesWallProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightWishId, setHighlightWishId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<WishFormValues>({
    resolver: zodResolver(wishSchema),
    defaultValues: {
      guest_name: "",
      message: "",
    },
  });

  const wishesQuery = useInfiniteQuery({
    queryKey: ["guest-wishes", slug],
    queryFn: ({ pageParam }) => getGuestWishes(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.has_more ? lastPage.meta.current_page + 1 : undefined),
  });

  const createMutation = useMutation({
    mutationFn: createGuestWish,
    onSuccess: (response) => {
      setErrorMessage(null);
      setHighlightWishId(response.wish.id);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["guest-wishes", slug] });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("Unable to post wish right now.");
    },
  });

  const flagMutation = useMutation({
    mutationFn: flagGuestWish,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guest-wishes", slug] });
    },
  });

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      const hit = entries.some((entry) => entry.isIntersecting);
      if (hit && wishesQuery.hasNextPage && !wishesQuery.isFetchingNextPage) {
        void wishesQuery.fetchNextPage();
      }
    }, { threshold: 0.2 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [wishesQuery]);

  const wishes = useMemo(() => wishesQuery.data?.pages.flatMap((page) => page.wishes) ?? [], [wishesQuery.data]);
  const isInitialLoading = wishesQuery.isLoading && wishes.length === 0;

  const onSubmit = async (values: WishFormValues) => {
    await createMutation.mutateAsync({
      guest_name: values.guest_name.trim(),
      message: values.message.trim(),
    });
  };

  return (
    <div className="space-y-5">
      <Card className={`overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-[0_16px_40px_rgba(0,0,0,0.06)]`}>
        <div className="h-1 w-full bg-gradient-to-r from-[color:var(--brand-primary)] via-[color:var(--brand-border)] to-[color:var(--brand-primary)]" />
        <CardHeader className="space-y-2 bg-[linear-gradient(180deg,#fafaf8,#fff)]">
          <CardTitle className="font-serif uppercase text-xl tracking-[-0.03em] text-neutral-950">Wishes Wall</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--brand-muted-text)]">
            A shared space for blessings, notes, and little messages the couple can revisit long after the wedding day.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Wish error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {canSubmitWish ? (
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-1">
                  <Input placeholder="Your name" {...form.register("guest_name")} />
                  {form.formState.errors.guest_name ? <p className="text-xs text-red-700">{form.formState.errors.guest_name.message}</p> : null}
                </div>
                <div className={`rounded-2xl border ${BRAND_BORDER} ${BRAND_SOFT} px-4 py-3 text-sm leading-6 text-[color:var(--brand-muted-text)]`}>
                  Wishes become part of the couple&apos;s memory archive, so a heartfelt note goes a long way.
                </div>
              </div>
              <div className="space-y-1">
                <Textarea placeholder="Leave a message for the couple..." rows={4} {...form.register("message")} />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[color:var(--brand-muted-text)]">{(form.watch("message") ?? "").length}/500</p>
                  {form.formState.errors.message ? <p className="text-xs text-red-700">{form.formState.errors.message.message}</p> : null}
                </div>
              </div>
              <Button type="submit" className={`w-full sm:w-auto ${BRAND_PRIMARY_BUTTON}`} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Posting..." : "Leave a Wish"}
              </Button>
            </form>
          ) : (
            <div className={`rounded-2xl border ${BRAND_BORDER} ${BRAND_SURFACE} px-4 py-4 text-sm text-[color:var(--brand-muted-text)]`}>
              Submit your RSVP first to unlock the wishes wall and leave a note for the couple.
            </div>
          )}
        </CardContent>
      </Card>

      {isInitialLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`wish-skeleton-${index}`} className="mb-4 break-inside-avoid">
              <Card className={`${BRAND_BORDER} bg-white`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[92%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : wishes.length === 0 ? (
        <Card className={`${BRAND_BORDER} bg-[linear-gradient(180deg,#fff,var(--brand-surface))] shadow-sm`}>
          <CardContent className="py-10 text-center text-neutral-600">
            Be the first to leave a wish for the couple.
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {wishes.map((wish) => {
            const initials = wish.guest_name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <motion.article
                key={wish.id}
                initial={wish.id === highlightWishId ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="gpu-transform group mb-4 break-inside-avoid"
              >
                <Card className={`relative overflow-hidden ${BRAND_BORDER} bg-[linear-gradient(180deg,#fff,var(--brand-surface))] shadow-sm transition hover:shadow-[0_14px_28px_rgba(0,0,0,0.08)]`}>
                  <CardContent className="space-y-3 p-4">
                    <span className="pointer-events-none absolute -right-1 top-2 text-4xl leading-none text-[color:var(--brand-border)]/55">&rdquo;</span>
                    <div className="flex items-center gap-2">
                      <Avatar alt={wish.guest_name} fallback={initials || "G"} />
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{wish.guest_name}</p>
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--brand-muted-text)]">{formatRelativeDate(wish.created_at)}</p>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-[color:var(--brand-ink)]">&ldquo;{wish.message}&rdquo;</p>

                    <Button
                      type="button"
                      variant="outline"
                      className={`absolute right-3 top-3 h-7 ${BRAND_BORDER} bg-white/90 px-2 text-xs text-[color:var(--brand-muted-text)] opacity-100 transition-opacity hover:text-[color:var(--brand-ink)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
                      onClick={() => flagMutation.mutate(wish.id)}
                      disabled={flagMutation.isPending}
                    >
                      Report
                    </Button>
                  </CardContent>
                </Card>
              </motion.article>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {wishesQuery.isFetchingNextPage ? <p className="text-center text-sm text-[color:var(--brand-muted-text)]">Loading more wishes...</p> : null}
    </div>
  );
}
```

## File: frontend/src/components/ui/timeline.tsx
```tsx
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
```

## File: frontend/src/lib/guest.ts
```ts
import { apiClient } from '@/lib/api';

export interface ValidateGuestCodeResponse {
  guest_token: string;
  invitation_slug: string;
  group: {
    id: number;
    name: string;
  } | null;
}

export interface ValidateGuestCodePayload {
  code: string;
}

export async function validateGuestCode(
  payload: ValidateGuestCodePayload,
): Promise<ValidateGuestCodeResponse> {
  return apiClient.post<ValidateGuestCodeResponse, ValidateGuestCodePayload>(
    '/guest/validate-code',
    payload,
    {
      requiresCsrf: false,
    },
  );
}

export interface GuestInvitationPayload {
  invitation: {
    id?: number;
    slug?: string;
    partner1_name?: string;
    partner2_name?: string;
    wedding_date?: string;
    wedding_time?: string;
    venue_name?: string;
    venue_address?: string;
    dress_code?: string;
    schedule?: Array<{ time?: string; event?: string; description?: string }>;
    music_url?: string | null;
    prenup_video_url?: string | null;
    gift_methods?: Array<{
      label?: string;
      qr_path?: string;
      account_name?: string;
      account_number?: string;
    }>;
    dress_code_colors?: string[];
  } & Record<string, unknown>;
  template?: {
    name?: string;
    slug?: string;
    region?: string;
    preview_image_path?: string;
  } | null;
  media?: Partial<Record<'hero' | 'gallery' | 'chapter' | 'entourage' | 'qr_code', Array<{ url?: string; type?: string }>>>;
  love_story_chapters?: Array<{
    id?: number;
    title?: string;
    story_text?: string;
    photo_path?: string | null;
    chapter_date?: string | null;
    sort_order?: number;
  }>;
  entourage_members?: Array<{
    id?: number;
    name?: string;
    role?: string;
    photo_path?: string | null;
    sort_order?: number;
  }>;
  wishes?: Array<{
    id?: number;
    guest_name?: string;
    message?: string;
    created_at?: string;
  }>;
  group?: GuestInvitationGroup | null;
}

export interface GuestInvitationGroupGuest {
  id: number;
  guest_name: string;
  email: string | null;
  guest_status: string | null;
  submitted_at: string | null;
  attending: boolean | null;
  confirmation_code: string | null;
  meal_preference: string | null;
  transport: string | null;
  plus_one_name: string | null;
}

export interface GuestInvitationGroup {
  id: number;
  name: string;
  access_code: string;
  guests: GuestInvitationGroupGuest[];
}

export async function getGuestInvitation(): Promise<GuestInvitationPayload> {
  return apiClient.get<GuestInvitationPayload>('/guest/invitation', {
    requiresCsrf: false,
  });
}

export interface GuestRsvpPayload {
  guest_id?: number | null;
  guest_name?: string | null;
  attending: boolean;
  plus_one_name?: string | null;
  meal_preference?: 'Beef' | 'Fish' | 'Vegetarian' | 'Kids' | null;
  transport?: 'has_car' | 'needs_shuttle' | 'own_arrangement' | null;
  favorite_memory?: string | null;
  message_to_couple?: string | null;
}

export interface GuestRsvpResponse {
  id: number;
  guest_name: string;
  email?: string | null;
  guest_group_id?: number | null;
  attending: boolean;
  plus_one_name: string | null;
  meal_preference: string | null;
  transport: string | null;
  favorite_memory: string | null;
  message_to_couple: string | null;
  confirmation_code: string;
  submitted_at?: string | null;
}

export interface GuestRsvpLookupResponse {
  rsvp: GuestRsvpResponse | null;
  latest_rsvp: GuestRsvpResponse | null;
  rsvps: GuestRsvpResponse[];
}

export interface SubmitGuestRsvpResponse {
  rsvp: GuestRsvpResponse;
  confirmation_code: string;
}

export async function getGuestRsvp(): Promise<GuestRsvpLookupResponse> {
  return apiClient.get<GuestRsvpLookupResponse>('/guest/rsvp', {
    requiresCsrf: false,
  });
}

export async function submitGuestRsvp(payload: GuestRsvpPayload): Promise<SubmitGuestRsvpResponse> {
  return apiClient.post<SubmitGuestRsvpResponse, GuestRsvpPayload>('/guest/rsvp', payload, {
    requiresCsrf: false,
  });
}

export interface GuestWish {
  id: number;
  guest_name: string;
  message: string;
  is_flagged: boolean;
  created_at: string;
}

export interface GuestWishesResponse {
  wishes: GuestWish[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export interface GuestWishPayload {
  guest_name: string;
  message: string;
}

export interface GuestWishMutationResponse {
  wish: GuestWish;
  message?: string;
}

export async function getGuestWishes(page = 1, perPage = 10): Promise<GuestWishesResponse> {
  return apiClient.get<GuestWishesResponse>(`/guest/wishes?page=${page}&per_page=${perPage}`, {
    requiresCsrf: false,
  });
}

export async function createGuestWish(payload: GuestWishPayload): Promise<GuestWishMutationResponse> {
  return apiClient.post<GuestWishMutationResponse, GuestWishPayload>('/guest/wishes', payload, {
    requiresCsrf: false,
  });
}

export async function flagGuestWish(id: number): Promise<GuestWishMutationResponse> {
  return apiClient.post<GuestWishMutationResponse, Record<string, never>>(`/guest/wishes/${id}/flag`, {}, {
    requiresCsrf: false,
  });
}
```

## File: frontend/src/lib/api.ts
```ts
import axios, { AxiosInstance, AxiosError, AxiosProgressEvent, InternalAxiosRequestConfig, ResponseType } from "axios";
import type { AxiosResponse } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TBody = unknown> {
  body?: TBody;
  headers?: Record<string, string>;
  requiresCsrf?: boolean;
  withCredentials?: boolean;
  signal?: AbortSignal;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
  responseType?: ResponseType;
}

export interface ApiErrorPayload {
  message: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.status = payload.status;
    this.details = payload.details;
  }
}

export class ApiClient {
  private readonly instance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly csrfCookieUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.csrfCookieUrl = this.resolveCsrfCookieUrl(this.baseUrl);
    this.instance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      withXSRFToken: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
    });

    this.setupInterceptors();
  }

  private resolveCsrfCookieUrl(baseUrl: string): string {
    if (/^https?:\/\//i.test(baseUrl)) {
      const parsedUrl = new URL(baseUrl);
      return `${parsedUrl.origin}/sanctum/csrf-cookie`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/sanctum/csrf-cookie`;
    }

    return "/sanctum/csrf-cookie";
  }

  private setupInterceptors(): void {
    // Request interceptor for Guest JWT
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // 1. Add Guest JWT if in sessionStorage
        if (typeof window !== "undefined") {
          const guestToken = sessionStorage.getItem("guest_token");
          const requestPath = config.url ?? "";
          const isGuestRequest = requestPath.includes("/guest/");

          if (guestToken && isGuestRequest) {
            config.headers.Authorization = `Bearer ${guestToken}`;
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for 401 and 422
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (!error.response) {
          return Promise.reject(
            new ApiError({
              message: `Unable to reach API server (${this.baseUrl}). Make sure backend is running and CORS/SANCTUM_STATEFUL_DOMAINS are configured for this frontend origin.`,
              status: 0,
              details: { csrfCookieUrl: this.csrfCookieUrl },
            })
          );
        }

        const status = error.response?.status;
        const data = error.response?.data as { message?: string; errors?: unknown } | undefined;

        // 422 Unprocessable Entity -> Structure validation errors
        if (status === 422) {
          return Promise.reject(
            new ApiError({
              message: data?.message ?? "Validation failed",
              status: 422,
              details: data?.errors,
            })
          );
        }

        // Generic error handling
        return Promise.reject(
          new ApiError({
            message: data?.message ?? error.message,
            status: status || 500,
            details: data?.errors,
          })
        );
      }
    );
  }

  public async bootstrapCsrf(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const hasXsrfCookie = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("XSRF-TOKEN="));

    if (hasXsrfCookie) {
      return;
    }

    try {
      // Use direct axios call for bootstrap to avoid circular interceptor call if we were using this.instance
      await axios.get(this.csrfCookieUrl, {
        withCredentials: true,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      const data = axiosError.response?.data as { message?: string } | undefined;

      throw new ApiError({
        message:
          data?.message ??
          `CSRF bootstrap failed at ${this.csrfCookieUrl}. Verify backend availability and Sanctum CORS/cookie settings.`,
        status: axiosError.response?.status ?? 0,
        details: axiosError.response?.data,
      });
    }
  }

  public async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const response = await this.instance.get<TResponse>(path, {
      headers: options.headers,
      signal: options.signal,
      responseType: options.responseType,
    });
    return response.data;
  }

  public async post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.post<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.put<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.patch<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async delete<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.delete<TResponse>(path, {
      headers: options.headers,
      signal: options.signal,
    });
    return response.data;
  }
}

function isLocalSpaHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolvePublicApiOrigin(): string {
  if (typeof window !== "undefined") {
    if (isLocalSpaHost(window.location.hostname)) {
      return "";
    }
  }

  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "";
  }

  return "";
}

const configuredApiBaseUrl = resolvePublicApiOrigin().replace(/\/+$/, "");
const resolvedBaseUrl = configuredApiBaseUrl ? `${configuredApiBaseUrl}/api/v1` : "/api/v1";

export const apiClient = new ApiClient(resolvedBaseUrl);
```



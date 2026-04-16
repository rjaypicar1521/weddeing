"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { validateGuestCode } from '@/lib/guest';
import { isPlausibleJwt } from '@/lib/security-utils';

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
  const [justPasted, setJustPasted] = useState(false);
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
      if (data.guest_token && isPlausibleJwt(data.guest_token)) {
        sessionStorage.setItem('guest_token', data.guest_token);
      } else {
        console.warn('[auth] Received invalid token format from API');
        setErrorMessage('Unable to validate access token. Please try again.');
        return;
      }
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
      if (isPlausibleJwt(existingToken)) {
        router.replace(`/i/${slug}/view`);
      } else {
        sessionStorage.removeItem('guest_token');
      }
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
                    className={`space-y-3 rounded-2xl border border-[#d5c2c2] bg-[#f6f3ee] p-4 ${justPasted ? 'ring-2 ring-green-400 ring-offset-2 transition-all duration-300' : ''}`}
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
                        const beforeLength = rawCode.length;
                        const normalized = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        if (normalized.length >= 6 && beforeLength < 3) {
                          setJustPasted(true);
                          window.setTimeout(() => setJustPasted(false), 600);
                        }
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
  const { slug } = use(params);

  return (
    <QueryProvider>
      <GuestCodeEntry slug={slug} />
    </QueryProvider>
  );
}

"use client";

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { sendSingleReminder } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { getInvitation } from '@/lib/invitation';
import { useAuthStore } from '@/stores/authStore';
import {
  addCoupleRsvpNote,
  CoupleRsvpItem,
  CoupleRsvpsResponse,
  CoupleRsvpStats,
  exportCoupleRsvpsCsv,
  getCoupleRsvps,
  getCoupleRsvpStats,
  RsvpStatusFilter,
  updateCoupleRsvp,
  UpdateRsvpPayload,
} from '@/lib/rsvps';

function statusLabel(value: boolean | null): string {
  if (value === true) return 'Attending';
  if (value === false) return 'Declined';
  return 'Pending';
}

function statusClass(value: boolean | null): string {
  if (value === true) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (value === false) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function transportLabel(value: string | null): string {
  if (value === 'has_car') return 'Has Car';
  if (value === 'needs_shuttle') return 'Needs Shuttle';
  if (value === 'own_arrangement') return 'Own Arrangement';
  return '-';
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.45, ease: 'easeOut' });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span>{rounded}</motion.span>;
}

const DEFAULT_STATS: CoupleRsvpStats = {
  total: 0,
  attending: 0,
  declined: 0,
  pending: 0,
  total_with_plus_ones: 0,
  meal_counts: {},
  transport_counts: {},
};

const editRsvpSchema = z.object({
  attending: z.enum(['yes', 'no']),
  plus_one_name: z.string().max(120).nullable(),
  meal_preference: z.enum(['', 'Beef', 'Fish', 'Vegetarian', 'Kids']),
  transport: z.enum(['', 'has_car', 'needs_shuttle', 'own_arrangement']),
  favorite_memory: z.string().max(300).nullable(),
  message_to_couple: z.string().max(500).nullable(),
});

type EditRsvpValues = z.infer<typeof editRsvpSchema>;
type RsvpInfiniteData = InfiniteData<CoupleRsvpsResponse, number>;

function toEditDefaults(rsvp: CoupleRsvpItem): EditRsvpValues {
  return {
    attending: rsvp.attending ? 'yes' : 'no',
    plus_one_name: rsvp.plus_one_name,
    meal_preference: (rsvp.meal_preference as EditRsvpValues['meal_preference']) ?? '',
    transport: (rsvp.transport as EditRsvpValues['transport']) ?? '',
    favorite_memory: rsvp.favorite_memory,
    message_to_couple: rsvp.message_to_couple,
  };
}

export default function GuestsDashboardPage() {
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<RsvpStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingRsvp, setEditingRsvp] = useState<CoupleRsvpItem | null>(null);
  const [noteDraftByRsvp, setNoteDraftByRsvp] = useState<Record<number, string>>({});

  const userQuery = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
    enabled: hasHydrated && !storedUser,
    staleTime: 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (userQuery.data?.user) {
      setUser(userQuery.data.user);
    }
  }, [setUser, userQuery.data?.user]);

  const user = storedUser ?? userQuery.data?.user ?? null;
  const isVerified = Boolean(user?.email_verified_at);
  const isAuthHydrating = !hasHydrated && !storedUser;
  const isUserLoading = isAuthHydrating || (!user && userQuery.isPending);

  const invitationQuery = useQuery({
    queryKey: ['couple-invitation'],
    queryFn: getInvitation,
    enabled: isVerified,
    staleTime: 60 * 1000,
    retry: false,
  });

  const editForm = useForm<EditRsvpValues>({
    resolver: zodResolver(editRsvpSchema),
    defaultValues: {
      attending: 'no',
      plus_one_name: null,
      meal_preference: '',
      transport: '',
      favorite_memory: null,
      message_to_couple: null,
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setCurrentPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    if (!editingRsvp) return;
    editForm.reset(toEditDefaults(editingRsvp));
  }, [editingRsvp, editForm]);

  const statsQuery = useQuery({
    queryKey: ['couple-rsvp-stats'],
    queryFn: getCoupleRsvpStats,
    enabled: isVerified && invitationQuery.isSuccess,
    staleTime: 60 * 1000,
    retry: false,
  });

  const listQuery = useInfiniteQuery({
    queryKey: ['couple-rsvps', status, debouncedSearch],
    queryFn: ({ pageParam }) => getCoupleRsvps({ page: pageParam, status, search: debouncedSearch }),
    enabled: isVerified && invitationQuery.isSuccess,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.has_more ? lastPage.meta.current_page + 1 : undefined),
    retry: false,
  });

  const replaceRsvpInCache = (rsvpId: number, updater: (rsvp: CoupleRsvpItem) => CoupleRsvpItem) => {
    queryClient.setQueriesData<RsvpInfiniteData>({ queryKey: ['couple-rsvps'] }, (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          rsvps: page.rsvps.map((rsvp) => (rsvp.id === rsvpId ? updater(rsvp) : rsvp)),
        })),
      };
    });
  };

  const exportMutation = useMutation({
    mutationFn: (onlyAttending: boolean) => exportCoupleRsvpsCsv(onlyAttending),
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setNotice({ type: 'success', message: 'Guest list exported!' });
    },
    onError: () => {
      setNotice({ type: 'error', message: 'Unable to export CSV right now. Please try again.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRsvpPayload }) => updateCoupleRsvp(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['couple-rsvps'] });
      const previousData = queryClient.getQueriesData<RsvpInfiniteData>({ queryKey: ['couple-rsvps'] });

      replaceRsvpInCache(id, (rsvp) => ({
        ...rsvp,
        ...payload,
        manually_overridden_at: new Date().toISOString(),
      }));

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      setNotice({ type: 'error', message: 'Unable to update RSVP. Please check your input and try again.' });
    },
    onSuccess: (response) => {
      replaceRsvpInCache(response.rsvp.id, () => response.rsvp);
      queryClient.invalidateQueries({ queryKey: ['couple-rsvp-stats'] });
      setEditingRsvp(response.rsvp);
      setNotice({
        type: 'success',
        message: response.notification_sent ? '✅ Notification sent to couple' : 'RSVP updated successfully.',
      });
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => addCoupleRsvpNote(id, note),
    onMutate: async ({ id, note }) => {
      await queryClient.cancelQueries({ queryKey: ['couple-rsvps'] });
      const previousData = queryClient.getQueriesData<RsvpInfiniteData>({ queryKey: ['couple-rsvps'] });

      replaceRsvpInCache(id, (rsvp) => ({
        ...rsvp,
        notes: [
          {
            id: -Date.now(),
            user_id: 0,
            note,
            created_at: new Date().toISOString(),
            user: { id: 0, name: 'You' },
          },
          ...(rsvp.notes ?? []),
        ],
      }));

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      setNotice({ type: 'error', message: 'Unable to save private note. Please try again.' });
    },
    onSuccess: (notes, variables) => {
      replaceRsvpInCache(variables.id, (rsvp) => ({ ...rsvp, notes }));
      setNoteDraftByRsvp((previous) => ({ ...previous, [variables.id]: '' }));
      setNotice({ type: 'success', message: 'Private note saved.' });
    },
  });

  const remindMutation = useMutation({
    mutationFn: (guestId: number) => sendSingleReminder(guestId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reminder-stats'] });
      setNotice({
        type: response.queued ? 'success' : 'error',
        message: response.queued
          ? `Reminder queued for ${response.guest_name}.`
          : `Skipped ${response.guest_name} (no valid email).`,
      });
    },
    onError: (error: Error) => {
      setNotice({
        type: 'error',
        message: error.message || 'Unable to send reminder right now.',
      });
    },
  });

  const stats = statsQuery.data ?? DEFAULT_STATS;
  const invitationError = invitationQuery.error instanceof ApiError ? invitationQuery.error : null;
  const pages = useMemo(() => listQuery.data?.pages ?? [], [listQuery.data?.pages]);
  const pagesByNumber = useMemo(() => {
    const map = new Map<number, (typeof pages)[number]>();
    for (const page of pages) {
      map.set(page.meta.current_page, page);
    }
    return map;
  }, [pages]);

  const activePage = pagesByNumber.get(currentPage) ?? pages[0];
  const rows = activePage?.rsvps ?? [];
  const lastPage = activePage?.meta.last_page ?? 1;
  const loadedMaxPage = pages.length > 0 ? Math.max(...pages.map((page) => page.meta.current_page)) : 1;

  const mealEntries = Object.entries(stats.meal_counts);
  const maxMealCount = mealEntries.length > 0 ? Math.max(...mealEntries.map(([, count]) => count)) : 1;

  const tabCounts: Record<RsvpStatusFilter, number> = {
    all: stats.total,
    attending: stats.attending,
    declined: stats.declined,
    pending: stats.pending,
  };

  const shuttleCount = stats.transport_counts.needs_shuttle ?? 0;
  const hasCarCount = stats.transport_counts.has_car ?? 0;
  const attendingRate = stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0;
  const mealTotal = mealEntries.reduce((sum, [, count]) => sum + count, 0);
  const transportEntries = Object.entries(stats.transport_counts);
  const transportTotal = transportEntries.reduce((sum, [, count]) => sum + count, 0);

  const goNext = async () => {
    if (currentPage < loadedMaxPage) {
      setCurrentPage((previous) => previous + 1);
      return;
    }

    if (listQuery.hasNextPage) {
      await listQuery.fetchNextPage();
      setCurrentPage((previous) => previous + 1);
    }
  };

  const goPrevious = () => {
    setCurrentPage((previous) => Math.max(1, previous - 1));
  };

  const toggleRow = (id: number) => {
    setExpanded((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const openEditSheet = (rsvp: CoupleRsvpItem) => {
    setEditingRsvp(rsvp);
  };

  const handleSubmitEdit = editForm.handleSubmit((values) => {
    if (!editingRsvp) return;

    const payload: UpdateRsvpPayload = {
      attending: values.attending === 'yes',
      plus_one_name: values.plus_one_name || null,
      meal_preference: values.meal_preference === '' ? null : values.meal_preference,
      transport: values.transport === '' ? null : values.transport,
      favorite_memory: values.favorite_memory || null,
      message_to_couple: values.message_to_couple || null,
    };

    updateMutation.mutate({ id: editingRsvp.id, payload });
  });

  const submitNote = (id: number) => {
    const note = (noteDraftByRsvp[id] ?? '').trim();
    if (!note) {
      setNotice({ type: 'error', message: 'Private note is required.' });
      return;
    }

    noteMutation.mutate({ id, note });
  };

  if (isUserLoading) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-80 w-full' />
      </main>
    );
  }

  if ((userQuery.isError && !user) || (!hasHydrated && !user)) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6'>
        <Alert variant='destructive'>
          <AlertTitle>Unable to load your account</AlertTitle>
          <AlertDescription>Please sign in again to continue to your RSVPs.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!isVerified) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-semibold text-neutral-900'>Verify Your Email</h1>
          <p className='text-neutral-700'>
            We need to verify <span className='font-medium'>{user?.email ?? 'your email address'}</span> before you can access RSVP management.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next Step</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-neutral-700'>
              Open the verification email we sent during registration. If it did not arrive, use the resend flow.
            </p>
            <Link href='/auth/verify-email' className='block'>
              <Button className='w-full sm:w-auto'>Open Verification Page</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (invitationError?.status === 422) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-semibold text-neutral-900'>Create Your Invitation First</h1>
          <p className='text-neutral-700'>RSVP management unlocks after you create your invitation.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open Builder</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-neutral-700'>
              Start with your wedding details, then return here once your invitation is ready.
            </p>
            <Link href='/dashboard/builder' className='block'>
              <Button className='w-full sm:w-auto'>Open Invitation Builder</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8'>
      {notice ? (
        <div className='fixed right-4 top-4 z-50 max-w-sm'>
          <Alert variant={notice.type === 'success' ? 'success' : 'destructive'}>
            <AlertTitle>{notice.type === 'success' ? 'Success' : 'Action Failed'}</AlertTitle>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <section className='overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_42%,#f5f5f4_42%,#fafaf9_100%)] shadow-sm'>
        <div className='grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-end'>
          <div className='space-y-4 text-white'>
            <div className='inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100'>
              RSVP Operations
            </div>
            <div className='space-y-2'>
              <h1 className='max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl'>
                Read the room before the wedding day arrives.
              </h1>
              <p className='max-w-lg text-sm text-stone-200 sm:text-base'>
                Track attendance, spot follow-up needs, and keep your guest details organized for final planning.
              </p>
            </div>
          </div>

          <Card className='border-stone-200/70 bg-white/90 shadow-none backdrop-blur'>
            <CardHeader className='space-y-3 pb-3'>
              <div className='flex items-center justify-between gap-3'>
                <CardTitle className='text-base text-stone-950'>RSVP Snapshot</CardTitle>
                <Badge className='border-stone-200 bg-stone-50 text-stone-700'>{stats.total_with_plus_ones} total heads</Badge>
              </div>
              <div className='space-y-2'>
                <div className='flex items-end justify-between'>
                  <p className='text-3xl font-semibold text-stone-950'><AnimatedNumber value={stats.attending} /></p>
                  <p className='text-sm text-stone-500'>{attendingRate}% attending</p>
                </div>
                <Progress value={attendingRate} />
              </div>
            </CardHeader>
            <CardContent className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600'>
                Shuttle needed: <span className='font-semibold text-stone-950'><AnimatedNumber value={shuttleCount} /></span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' className='w-full' disabled={exportMutation.isPending}>
                    {exportMutation.isPending ? (
                      <span className='inline-flex items-center gap-2'>
                        <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white' />
                        Exporting...
                      </span>
                    ) : (
                      'Export CSV'
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-full sm:w-48'>
                  <DropdownMenuItem onSelect={() => exportMutation.mutate(false)} disabled={exportMutation.isPending}>
                    All RSVPs
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportMutation.mutate(true)} disabled={exportMutation.isPending}>
                    Attending Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className='grid gap-3 md:grid-cols-2'>
        <Card className='border-stone-200 bg-white/90 shadow-none'>
          <CardHeader className='pb-2'>
            <CardDescription>Total RSVPs</CardDescription>
            <CardTitle className='text-3xl'><AnimatedNumber value={stats.total} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-stone-200 bg-white/90 shadow-none'>
          <CardHeader className='pb-2'>
            <CardDescription>Attending</CardDescription>
            <CardTitle className='text-3xl text-emerald-700'><AnimatedNumber value={stats.attending} /></CardTitle>
            <p className='text-sm text-emerald-700'>({attendingRate}%)</p>
          </CardHeader>
        </Card>
        <Card className='border-stone-200 bg-white/90 shadow-none'>
          <CardHeader className='pb-2'>
            <CardDescription>Declined</CardDescription>
            <CardTitle className='text-3xl text-rose-700'><AnimatedNumber value={stats.declined} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-stone-200 bg-white/90 shadow-none'>
          <CardHeader className='pb-2'>
            <CardDescription>Pending</CardDescription>
            <CardTitle className='text-3xl text-amber-700'><AnimatedNumber value={stats.pending} /></CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className='border-stone-200 bg-white/95 shadow-none'>
        <CardContent className='p-4 sm:p-5'>
          <p className='text-sm text-neutral-600'>
            Total headcount (incl +1s): <span className='font-semibold text-neutral-900'><AnimatedNumber value={stats.total_with_plus_ones} /> guests attending</span>
          </p>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-2'>
        <Card className='border-stone-200 bg-white/95 shadow-none'>
          <CardHeader>
            <CardTitle className='text-base'>Meal Preferences</CardTitle>
            <CardDescription>Breakdown of selected meal options.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
          {mealEntries.length === 0 ? (
            <p className='text-sm text-neutral-500'>Meal breakdown will appear once RSVPs are submitted.</p>
          ) : (
            mealEntries.map(([meal, count]) => (
              <div key={meal} className='space-y-1'>
                <div className='flex items-center justify-between text-sm'>
                  <span>{meal}</span>
                  <span>{count}</span>
                </div>
                <Progress value={mealTotal > 0 ? (count / mealTotal) * 100 : (count / maxMealCount) * 100} />
              </div>
            ))
          )}
          </CardContent>
        </Card>

        <Card className='border-stone-200 bg-white/95 shadow-none'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-base'>Transport Needs</CardTitle>
            <CardDescription>
              <AnimatedNumber value={shuttleCount} /> guests need shuttle, <AnimatedNumber value={hasCarCount} /> have cars
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {transportEntries.length === 0 ? (
              <p className='text-sm text-neutral-500'>Transport selections will appear once RSVPs are submitted.</p>
            ) : (
              transportEntries.map(([transport, count]) => (
                <div key={transport} className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <span>{transportLabel(transport)}</span>
                    <span>{count}</span>
                  </div>
                  <Progress
                    value={transportTotal > 0 ? (count / transportTotal) * 100 : 0}
                    indicatorClassName={transport === 'needs_shuttle' ? 'bg-amber-500' : undefined}
                  />
                </div>
              ))
            )}
            <div className='rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {shuttleCount} guests need shuttle
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='border-stone-200 bg-white/95 shadow-none'>
        <CardContent className='space-y-4 p-4 sm:p-5'>
          <Tabs value={status} onValueChange={(value) => setStatus(value as RsvpStatusFilter)}>
            <TabsList>
              {(['all', 'attending', 'declined', 'pending'] as RsvpStatusFilter[]).map((tab) => (
                <TabsTrigger key={tab} value={tab} className='flex items-center gap-2'>
                  <span className='capitalize'>{tab}</span>
                  <Badge>{tabCounts[tab]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search guest name...'
          />

          <div className='hidden lg:block'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>+1</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className='text-center text-neutral-500'>No RSVP records found.</TableCell></TableRow>
                ) : (
                  rows.map((row) => (
                    <Fragment key={`group-${row.id}`}>
                      <TableRow className='cursor-pointer' onClick={() => toggleRow(row.id)}>
                        <TableCell className='font-medium'>{row.guest_name}</TableCell>
                        <TableCell>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge className={statusClass(row.attending)}>{statusLabel(row.attending)}</Badge>
                            {row.manually_overridden_at ? <Badge className='bg-blue-50 text-blue-700 border-blue-200'>Manual override</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{row.plus_one_name ?? '-'}</TableCell>
                        <TableCell>{row.meal_preference ?? '-'}</TableCell>
                        <TableCell>{transportLabel(row.transport)}</TableCell>
                        <TableCell>{formatDate(row.submitted_at)}</TableCell>
                      </TableRow>
                      {expanded[row.id] ? (
                        <TableRow key={`detail-${row.id}`}>
                          <TableCell colSpan={6}>
                            <div className='grid gap-3 text-sm text-neutral-700 md:grid-cols-2'>
                              <div className='space-y-2'>
                                <div>
                                  <p className='font-medium'>Favorite Memory</p>
                                  <p>{row.favorite_memory || '-'}</p>
                                </div>
                                <div>
                                  <p className='font-medium'>Guest Message</p>
                                  <p>{row.message_to_couple || '-'}</p>
                                </div>
                                <Button type='button' variant='outline' onClick={() => openEditSheet(row)}>
                                  Edit RSVP
                                </Button>
                                <Button type='button' variant='outline' onClick={() => remindMutation.mutate(row.id)} disabled={remindMutation.isPending}>
                                  {remindMutation.isPending ? 'Sending...' : 'Remind'}
                                </Button>
                              </div>
                              <div className='space-y-2 rounded-md border border-neutral-200 p-3'>
                                <p className='font-medium'>Private Notes (Internal)</p>
                                {(row.notes ?? []).length === 0 ? <p className='text-neutral-500'>No private notes yet.</p> : null}
                                {(row.notes ?? []).map((note) => (
                                  <div key={note.id} className='rounded bg-neutral-50 p-2'>
                                    <p>{note.note}</p>
                                    <p className='mt-1 text-xs text-neutral-500'>
                                      {note.user?.name ?? 'Team'} • {formatDate(note.created_at)}
                                    </p>
                                  </div>
                                ))}
                                <Textarea
                                  className='min-h-20'
                                  placeholder='Add private note...'
                                  value={noteDraftByRsvp[row.id] ?? ''}
                                  onChange={(event) => setNoteDraftByRsvp((previous) => ({ ...previous, [row.id]: event.target.value }))}
                                />
                                <Button type='button' onClick={() => submitNote(row.id)} disabled={noteMutation.isPending}>
                                  Save Private Note
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='space-y-3 lg:hidden'>
            {rows.length === 0 ? (
              <Card><CardContent className='p-4 text-sm text-neutral-500'>No RSVP records found.</CardContent></Card>
            ) : (
              rows.map((row) => (
                <Card key={row.id}>
                  <CardContent className='space-y-3 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='font-medium'>{row.guest_name}</p>
                        <p className='text-xs text-neutral-500'>{formatDate(row.submitted_at)}</p>
                      </div>
                      <div className='flex flex-col items-end gap-2'>
                        <Badge className={statusClass(row.attending)}>{statusLabel(row.attending)}</Badge>
                        {row.manually_overridden_at ? <Badge className='bg-blue-50 text-blue-700 border-blue-200'>Manual override</Badge> : null}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-2 text-sm'>
                      <p><span className='font-medium'>+1:</span> {row.plus_one_name ?? '-'}</p>
                      <p><span className='font-medium'>Meal:</span> {row.meal_preference ?? '-'}</p>
                      <p className='col-span-2'><span className='font-medium'>Transport:</span> {transportLabel(row.transport)}</p>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <Button type='button' variant='outline' onClick={() => toggleRow(row.id)}>
                        {expanded[row.id] ? 'Hide Details' : 'View Details'}
                      </Button>
                      <Button type='button' onClick={() => openEditSheet(row)}>
                        Edit RSVP
                      </Button>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      onClick={() => remindMutation.mutate(row.id)}
                      disabled={remindMutation.isPending}
                    >
                      {remindMutation.isPending ? 'Sending...' : 'Remind'}
                    </Button>
                    {expanded[row.id] ? (
                      <div className='space-y-3 rounded-md bg-neutral-50 p-3 text-sm'>
                        <div>
                          <p className='font-medium'>Favorite Memory</p>
                          <p>{row.favorite_memory || '-'}</p>
                        </div>
                        <div>
                          <p className='font-medium'>Guest Message</p>
                          <p>{row.message_to_couple || '-'}</p>
                        </div>
                        <div>
                          <p className='font-medium'>Private Notes (Internal)</p>
                          {(row.notes ?? []).map((note) => (
                            <div key={note.id} className='mt-2 rounded bg-white p-2'>
                              <p>{note.note}</p>
                              <p className='text-xs text-neutral-500'>{note.user?.name ?? 'Team'} • {formatDate(note.created_at)}</p>
                            </div>
                          ))}
                          <Textarea
                            className='mt-2 min-h-20 bg-white'
                            placeholder='Add private note...'
                            value={noteDraftByRsvp[row.id] ?? ''}
                            onChange={(event) => setNoteDraftByRsvp((previous) => ({ ...previous, [row.id]: event.target.value }))}
                          />
                          <Button type='button' className='mt-2 w-full' onClick={() => submitNote(row.id)} disabled={noteMutation.isPending}>
                            Save Private Note
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm text-neutral-600'>Page {currentPage} of {lastPage}</p>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={goPrevious} disabled={currentPage <= 1}>
                Previous
              </Button>
              <Button type='button' onClick={() => void goNext()} disabled={currentPage >= lastPage || listQuery.isFetchingNextPage}>
                {listQuery.isFetchingNextPage ? 'Loading...' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={Boolean(editingRsvp)} onOpenChange={(open) => (!open ? setEditingRsvp(null) : null)}>
        <SheetContent className='w-full sm:w-[420px]'>
          <SheetHeader>
            <SheetTitle>Edit RSVP</SheetTitle>
          </SheetHeader>

          <form className='space-y-3' onSubmit={handleSubmitEdit}>
            <div className='space-y-1'>
              <p className='text-sm font-medium'>Attending</p>
              <Select {...editForm.register('attending')}>
                <option value='yes'>Yes</option>
                <option value='no'>No</option>
              </Select>
            </div>

            <div className='space-y-1'>
              <p className='text-sm font-medium'>+1 Name</p>
              <Input
                value={editForm.watch('plus_one_name') ?? ''}
                onChange={(event) => editForm.setValue('plus_one_name', event.target.value || null, { shouldDirty: true })}
                placeholder='Optional'
              />
            </div>

            <div className='space-y-1'>
              <p className='text-sm font-medium'>Meal Preference</p>
              <Select {...editForm.register('meal_preference')}>
                <option value=''>Not set</option>
                <option value='Beef'>Beef</option>
                <option value='Fish'>Fish</option>
                <option value='Vegetarian'>Vegetarian</option>
                <option value='Kids'>Kids</option>
              </Select>
            </div>

            <div className='space-y-1'>
              <p className='text-sm font-medium'>Transport</p>
              <Select {...editForm.register('transport')}>
                <option value=''>Not set</option>
                <option value='has_car'>Has Car</option>
                <option value='needs_shuttle'>Needs Shuttle</option>
                <option value='own_arrangement'>Own Arrangement</option>
              </Select>
            </div>

            <div className='space-y-1'>
              <p className='text-sm font-medium'>Favorite Memory</p>
              <Textarea
                className='min-h-20'
                value={editForm.watch('favorite_memory') ?? ''}
                onChange={(event) => editForm.setValue('favorite_memory', event.target.value || null, { shouldDirty: true })}
                placeholder='Optional'
              />
            </div>

            <div className='space-y-1'>
              <p className='text-sm font-medium'>Guest Message</p>
              <Textarea
                className='min-h-20'
                value={editForm.watch('message_to_couple') ?? ''}
                onChange={(event) => editForm.setValue('message_to_couple', event.target.value || null, { shouldDirty: true })}
                placeholder='Optional'
              />
            </div>

            <div className='mt-4 flex gap-2'>
              <Button type='submit' className='flex-1' disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <SheetClose className='flex-1'>Cancel</SheetClose>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  );
}


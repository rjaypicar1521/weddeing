"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  bulkInviteCoupleGuests,
  createTableGuestGroups,
  createCoupleGuestGroup,
  deleteCoupleGuest,
  getCoupleGuestGroups,
  getCoupleGuests,
  moveCoupleGuestToGroup,
  regenerateCoupleGuestGroupCode,
  renameCoupleGuestGroup,
  type CoupleGuestFilter,
  type CoupleGuestGroupItem,
  type CoupleGuestItem,
  type CoupleGuestStatus,
  updateCoupleGuestStatus,
} from '@/lib/couple-guests';
import { getCurrentUser } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { createInvitation, getInvitation } from '@/lib/invitation';
import { getGuestUsage } from '@/lib/payments';
import { useAuthStore } from '@/stores/authStore';

function formatDate(value: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function parseCsvPreview(raw: string): Array<{ name: string; email: string; group_name?: string | null }> {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: Array<{ name: string; email: string; group_name?: string | null }> = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const parts = line.split(',').map((part) => part?.trim() ?? '');
    const [firstRaw, secondRaw, thirdRaw] = parts;

    if (index === 0 && (
      (firstRaw.toLowerCase() === 'name' && secondRaw.toLowerCase() === 'email')
      || ((firstRaw.toLowerCase() === 'group_name' || firstRaw.toLowerCase() === 'table_name') && secondRaw.toLowerCase() === 'name' && thirdRaw?.toLowerCase() === 'email')
    )) {
      continue;
    }

    if (parts.length >= 3) {
      if (!secondRaw || !thirdRaw) continue;
      rows.push({ group_name: firstRaw || null, name: secondRaw, email: thirdRaw });
      continue;
    }

    if (!firstRaw || !secondRaw) continue;
    rows.push({ name: firstRaw, email: secondRaw, group_name: null });
  }

  return rows;
}

const guestGroupSchema = z.object({
  name: z.string().trim().min(2, 'Enter a group name.').max(100, 'Group name is too long.'),
});

type GuestGroupFormValues = z.infer<typeof guestGroupSchema>;

export default function GuestsManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<CoupleGuestFilter | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CoupleGuestGroupItem | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; email: string; group_name?: string | null }>>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const createGroupForm = useForm<GuestGroupFormValues>({
    resolver: zodResolver(guestGroupSchema),
    defaultValues: { name: '' },
  });

  const renameGroupForm = useForm<GuestGroupFormValues>({
    resolver: zodResolver(guestGroupSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [status, debouncedSearch]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const userQuery = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
    enabled: hasHydrated && !storedUser,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnMount: false,
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
    retry: false,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const guestsQuery = useQuery({
    queryKey: ['couple-guests', status, debouncedSearch, page],
    queryFn: () => getCoupleGuests({
      page,
      status: status === 'all' ? undefined : status,
      search: debouncedSearch || undefined,
    }),
    enabled: isVerified && invitationQuery.isSuccess,
    retry: false,
    staleTime: 30 * 1000,
  });

  const usageQuery = useQuery({
    queryKey: ['guest-usage'],
    queryFn: getGuestUsage,
    enabled: isVerified && invitationQuery.isSuccess,
    retry: false,
    staleTime: 30 * 1000,
  });

  const guestGroupsQuery = useQuery({
    queryKey: ['couple-guest-groups'],
    queryFn: getCoupleGuestGroups,
    enabled: isVerified && invitationQuery.isSuccess,
    retry: false,
    staleTime: 30 * 1000,
  });

  const rows = guestsQuery.data?.guests ?? [];
  const guestGroups = guestGroupsQuery.data?.groups ?? [];
  const meta = guestsQuery.data?.meta;
  const limitReached = Boolean(usageQuery.data?.upgrade_needed);
  const invitationError = invitationQuery.error instanceof ApiError ? invitationQuery.error : null;
  const guestGroupsError = guestGroupsQuery.error instanceof Error ? guestGroupsQuery.error : null;
  const guestsError = guestsQuery.error instanceof Error ? guestsQuery.error : null;
  const usageError = usageQuery.error instanceof Error ? usageQuery.error : null;
  const submittedGuestCount = guestGroups.reduce((total, group) => total + group.submitted_count, 0);

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const deleteMutation = useMutation({
    mutationFn: deleteCoupleGuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      setNotice({ type: 'success', message: 'Guest deleted.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to delete guest.' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: CoupleGuestStatus }) => updateCoupleGuestStatus(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      setNotice({ type: 'success', message: 'Guest status updated.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to update status.' });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: bulkInviteCoupleGuests,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guest-usage'] });
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      setNotice({ type: 'success', message: `${response.added} new guests added.` });
      setCsvFile(null);
      setCsvPreview([]);
      setCsvDialogOpen(false);
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'CSV import failed.' });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (values: GuestGroupFormValues) => createCoupleGuestGroup(values.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      createGroupForm.reset();
      setCreateGroupOpen(false);
      setNotice({ type: 'success', message: 'Guest group created.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to create guest group.' });
    },
  });

  const renameGroupMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: GuestGroupFormValues }) => renameCoupleGuestGroup(id, values.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      renameGroupForm.reset();
      setEditingGroup(null);
      setNotice({ type: 'success', message: 'Guest group renamed.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to rename guest group.' });
    },
  });

  const regenerateGroupCodeMutation = useMutation({
    mutationFn: regenerateCoupleGuestGroupCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      setNotice({ type: 'success', message: 'Group code regenerated.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to regenerate group code.' });
    },
  });

  const createTableGroupsMutation = useMutation({
    mutationFn: () => createTableGuestGroups(20),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      setNotice({
        type: 'success',
        message: response.created_count > 0
          ? `Created ${response.created_count} table codes.`
          : 'The default table codes already exist.',
      });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to create table codes.' });
    },
  });

  const moveGuestMutation = useMutation({
    mutationFn: ({ id, guestGroupId }: { id: number; guestGroupId: number }) => moveCoupleGuestToGroup(id, guestGroupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-guests'] });
      queryClient.invalidateQueries({ queryKey: ['couple-guest-groups'] });
      setNotice({ type: 'success', message: 'Guest moved to a different table.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to move guest.' });
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-invitation'] });
      setNotice({ type: 'success', message: 'Invitation created. You can add guests now.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Unable to create invitation.' });
    },
  });

  const onSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.id));
  };

  const onToggleRow = (id: number) => {
    setSelectedIds((previous) => (
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    ));
  };

  const onCsvFile = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    setCsvPreview(parseCsvPreview(text));
  };

  const showUpgradeBlock = () => {
    setUpgradeDialogOpen(true);
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ type: 'success', message: successMessage });
    } catch {
      setNotice({ type: 'error', message: 'Unable to copy to clipboard.' });
    }
  };

  if (isUserLoading || (isVerified && invitationQuery.isPending)) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8'>
        <div className='space-y-2'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-5 w-full max-w-xl' />
        </div>
        <Card>
          <CardContent className='space-y-4 p-4 sm:p-6'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-48 w-full' />
          </CardContent>
        </Card>
      </main>
    );
  }

  if ((userQuery.isError && !user) || !user) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6'>
        <Card className='w-full'>
          <CardContent className='space-y-4 p-6'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold'>Unable to load your account</h1>
              <p className='text-sm text-neutral-600'>
                Refresh the page and sign in again if the problem persists.
              </p>
            </div>
            <Button type='button' onClick={() => router.push('/login')}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isVerified) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6'>
        <Card className='w-full border-amber-200 bg-amber-50/60'>
          <CardHeader>
            <CardTitle className='text-2xl'>Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm leading-6 text-neutral-700'>
              Email verification is required before you can manage guests and send invitations.
            </p>
            <Button type='button' onClick={() => router.push('/auth/verify-email')}>
              Open Verification Page
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (invitationError?.status === 422) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6'>
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className='text-2xl'>Create Your Invitation First</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm leading-6 text-neutral-700'>
              Create your draft invitation first, then you can start importing and managing guests right away.
            </p>
            <Button
              type='button'
              onClick={() => createInvitationMutation.mutate()}
              disabled={createInvitationMutation.isPending}
            >
              {createInvitationMutation.isPending ? 'Creating...' : 'Create Invitation'}
            </Button>
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

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to add more guests</DialogTitle>
            <DialogDescription>
              You reached your guest limit. Upgrade to continue adding or sending invites.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Close</DialogClose>
            <Button type='button' onClick={() => router.push('/dashboard/upgrade')}>
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createGroupOpen}
        onOpenChange={(open) => {
          setCreateGroupOpen(open);
          if (!open) createGroupForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Guest Group</DialogTitle>
            <DialogDescription>
              Create a family, household, or team-specific access code.
            </DialogDescription>
          </DialogHeader>
          <form className='space-y-4' onSubmit={createGroupForm.handleSubmit((values) => createGroupMutation.mutate(values))}>
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='new-group-name'>Group name</label>
              <Input id='new-group-name' {...createGroupForm.register('name')} placeholder='Santos Family' />
              {createGroupForm.formState.errors.name ? <p className='text-xs text-red-700'>{createGroupForm.formState.errors.name.message}</p> : null}
            </div>
            <DialogFooter>
              <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Cancel</DialogClose>
              <Button type='submit' disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingGroup !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroup(null);
            renameGroupForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Guest Group</DialogTitle>
            <DialogDescription>
              Update the name guests see after entering their code.
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={renameGroupForm.handleSubmit((values) => {
              if (!editingGroup) return;
              renameGroupMutation.mutate({ id: editingGroup.id, values });
            })}
          >
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='rename-group-name'>Group name</label>
              <Input id='rename-group-name' {...renameGroupForm.register('name')} placeholder='Bride Squad' />
              {renameGroupForm.formState.errors.name ? <p className='text-xs text-red-700'>{renameGroupForm.formState.errors.name.message}</p> : null}
            </div>
            <DialogFooter>
              <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Cancel</DialogClose>
              <Button type='submit' disabled={renameGroupMutation.isPending}>
                {renameGroupMutation.isPending ? 'Saving...' : 'Save Name'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className='overflow-hidden rounded-[28px] border border-[#e7c8d0] bg-[linear-gradient(135deg,#4a1420_0%,#6f1d2b_42%,#f8eef1_42%,#fcf8f9_100%)] shadow-sm'>
        <div className='grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-end'>
          <div className='space-y-4 text-white'>
            <div className='inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7dfe6]'>
              Guest Operations
            </div>
            <div className='space-y-2'>
              <h1 className='max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl'>
                Keep your invite list clean, current, and ready to send.
              </h1>
              <p className='max-w-lg text-sm text-[#f3d9e0] sm:text-base'>
                Import guests in bulk, track delivery status, and manage the list without losing sight of plan limits.
              </p>
            </div>
          </div>

          <Card className='border-[#e7c8d0]/80 bg-white/90 shadow-none backdrop-blur'>
            <CardHeader className='space-y-3 pb-3'>
              <div className='flex items-center justify-between gap-3'>
                <CardTitle className='text-base text-[#4a1420]'>Capacity Snapshot</CardTitle>
                <Badge className='border-[#d8a9b6] bg-[#f7e9ee] text-[#7a1f35]'>
                  {usageQuery.data?.guests_used ?? 0}/{usageQuery.data?.guest_limit ?? 25}
                </Badge>
              </div>
              <Progress value={Math.min(100, Math.round(((usageQuery.data?.guests_used ?? 0) / Math.max(1, usageQuery.data?.guest_limit ?? 25)) * 100))} />
            </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-[#7b5560]'>
              Invite emails are queued automatically during CSV import.
            </p>
            <div className='rounded-2xl border border-[#e7c8d0] bg-[#fbf3f5] px-4 py-3 text-sm text-[#7b5560]'>
              {limitReached ? 'You reached your current guest limit. Upgrade to continue importing.' : 'You still have room to grow your guest list on the current plan.'}
            </div>
            {usageError ? (
              <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                Usage summary is temporarily unavailable. Refresh the page to retry.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      </section>

      <Card className='border-[#e7c8d0] bg-white/95 shadow-none'>
        <CardHeader className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <CardTitle>Guest Groups & Codes</CardTitle>
            <p className='text-sm text-neutral-600'>
              Create table or family-specific access codes for households, squads, and a full 200-pax floor plan.
            </p>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              variant='outline'
              onClick={() => createTableGroupsMutation.mutate()}
              disabled={createTableGroupsMutation.isPending}
            >
              {createTableGroupsMutation.isPending ? 'Creating Tables...' : 'Create Table Codes'}
            </Button>
            <Button type='button' variant='outline' onClick={() => setCreateGroupOpen(true)}>
              Create Guest Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='rounded-3xl border border-[#e7c8d0] bg-[linear-gradient(135deg,#fdf6f8,#fbf0f3)] px-5 py-5 text-sm text-[#6c3241]'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div className='space-y-1'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b59]'>200 Pax Setup</p>
                <p className='text-base font-semibold text-[#4a1420]'>Generate 20 table codes in one click</p>
                <p>
                  This creates <span className='font-medium'>Table 01</span> through <span className='font-medium'>Table 20</span> and keeps RSVP submission per invited guest inside each table.
                </p>
              </div>
              <div className='rounded-2xl border border-[#e7c8d0] bg-white px-4 py-3 text-[#7a1f35]'>
                <p className='text-xs uppercase tracking-[0.18em] text-[#8a4b59]'>Suggested Layout</p>
                <p className='mt-1 text-lg font-semibold'>20 tables • 10 seats</p>
              </div>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-2xl border border-[#e7c8d0] bg-[#fbf3f5] px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.16em] text-[#8a4b59]'>Groups / Tables</p>
              <p className='mt-1 text-2xl font-semibold text-[#4a1420]'>{guestGroups.length}</p>
            </div>
            <div className='rounded-2xl border border-[#e7c8d0] bg-[#fbf3f5] px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.16em] text-[#8a4b59]'>Guests Assigned</p>
              <p className='mt-1 text-2xl font-semibold text-[#4a1420]'>{guestGroups.reduce((total, group) => total + group.guest_count, 0)}</p>
            </div>
            <div className='rounded-2xl border border-[#e7c8d0] bg-[#fbf3f5] px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.16em] text-[#8a4b59]'>Responses Logged</p>
              <p className='mt-1 text-2xl font-semibold text-[#4a1420]'>{submittedGuestCount}</p>
            </div>
          </div>

          {guestGroupsQuery.isLoading ? (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className='h-40 w-full rounded-3xl' />
              ))}
            </div>
          ) : null}

          {guestGroupsError ? (
            <div className='rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='space-y-1'>
                  <p className='font-medium text-red-800'>We couldn&apos;t load guest groups.</p>
                  <p>{guestGroupsError.message || 'Please try again in a moment.'}</p>
                </div>
                <Button type='button' variant='outline' onClick={() => guestGroupsQuery.refetch()}>
                  Retry Groups
                </Button>
              </div>
            </div>
          ) : null}

          {!guestGroupsQuery.isLoading && !guestGroupsError && guestGroups.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-sm text-stone-600'>
              No guest groups yet. Create one to give a family or table its own access code.
            </div>
          ) : null}

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {guestGroups.map((group) => (
              <Card key={group.id} className='overflow-hidden border-[#e7c8d0] bg-[linear-gradient(180deg,#fffdfd,#fbf3f5)] shadow-none'>
                <CardContent className='space-y-4 p-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-base font-semibold text-[#4a1420]'>{group.name}</p>
                        {group.is_default ? <Badge className='border-[#e7c8d0] bg-[#f7e9ee] text-[#8a4b59]'>Default</Badge> : null}
                      </div>
                      <p className='text-xs uppercase tracking-[0.22em] text-[#8a4b59]'>Access code</p>
                      <button
                        type='button'
                        className='text-left text-2xl font-semibold tracking-[0.24em] text-[#4a1420]'
                        onClick={() => void copyToClipboard(group.access_code, `${group.name} code copied.`)}
                      >
                        {group.access_code}
                      </button>
                    </div>
                    <Badge className='border-[#d8a9b6] bg-[#f7e9ee] text-[#7a1f35]'>
                      {group.guest_count} guests
                    </Badge>
                  </div>

                  <div className='grid grid-cols-3 gap-2'>
                    <div className='rounded-2xl border border-[#e7c8d0] bg-white px-3 py-2'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-[#8a4b59]'>Pending</p>
                      <p className='mt-1 text-lg font-semibold text-[#4a1420]'>{group.pending_count}</p>
                    </div>
                    <div className='rounded-2xl border border-[#e7c8d0] bg-white px-3 py-2'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-[#8a4b59]'>Submitted</p>
                      <p className='mt-1 text-lg font-semibold text-[#4a1420]'>{group.submitted_count}</p>
                    </div>
                    <div className='rounded-2xl border border-[#e7c8d0] bg-white px-3 py-2'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-[#8a4b59]'>Attending</p>
                      <p className='mt-1 text-lg font-semibold text-[#4a1420]'>{group.attending_count}</p>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setEditingGroup(group);
                        renameGroupForm.reset({ name: group.name });
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={regenerateGroupCodeMutation.isPending}
                      onClick={() => regenerateGroupCodeMutation.mutate(group.id)}
                    >
                      Regenerate Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='border-stone-200 bg-white/95 shadow-none'>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
            <Button
              type='button'
              onClick={() => (limitReached ? showUpgradeBlock() : setCsvDialogOpen(true))}
            >
              Upload CSV • Add Guests & Send Invites
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>CSV Import</DialogTitle>
                <DialogDescription>Upload CSV with columns: `group_name,name,email`, `table_name,name,email`, or `name,email`.</DialogDescription>
              </DialogHeader>

              <div
                className='rounded-md border border-dashed border-neutral-300 p-4 text-sm'
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) void onCsvFile(file);
                }}
              >
                <p className='text-neutral-700'>Drag and drop CSV here, or choose a file.</p>
                <Input
                  className='mt-2'
                  type='file'
                  accept='.csv,text/csv'
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onCsvFile(file);
                  }}
                />
              </div>

              <div className='max-h-48 overflow-auto rounded-md border border-neutral-200 p-2 text-sm'>
                {csvPreview.length === 0 ? (
                  <p className='text-neutral-500'>No preview rows yet.</p>
                ) : (
                  csvPreview.map((row, index) => (
                    <p key={`${row.email}-${index}`}>
                      {row.group_name ? `${row.group_name} • ` : ''}
                      {row.name} • {row.email}
                    </p>
                  ))
                )}
              </div>

              <DialogFooter>
                <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Cancel</DialogClose>
                <Button
                  type='button'
                  disabled={!csvFile || bulkInviteMutation.isPending || limitReached}
                  onClick={() => csvFile && bulkInviteMutation.mutate(csvFile)}
                >
                  {bulkInviteMutation.isPending ? 'Uploading...' : 'Add Guests & Send Invites'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <p className='text-sm text-neutral-600'>
            Invite emails are queued automatically when you upload a CSV.
          </p>
        </CardContent>
      </Card>

      <Card className='border-stone-200 bg-white/95 shadow-none'>
        <CardContent className='space-y-4 p-4 sm:p-5'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <Select
              className='w-full sm:w-56'
              value={status}
              onChange={(event) => setStatus(event.target.value as CoupleGuestFilter | 'all')}
            >
              <option value='all'>All Statuses</option>
              <option value='invited'>Invited</option>
              <option value='rsvp-pending'>RSVP Pending</option>
              <option value='attending'>Attending</option>
              <option value='declined'>Declined</option>
            </Select>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search name/email'
              className='w-full sm:w-72'
            />
          </div>

          {guestsError ? (
            <div className='rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='space-y-1'>
                  <p className='font-medium text-red-800'>Guest list unavailable</p>
                  <p>{guestsError.message || 'We could not load the current guest list.'}</p>
                </div>
                <Button type='button' variant='outline' onClick={() => guestsQuery.refetch()}>
                  Retry Guests
                </Button>
              </div>
            </div>
          ) : null}

          <div className='hidden lg:block'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12'>
                    <input type='checkbox' checked={allSelected} onChange={onSelectAll} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Move To</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guestsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={8}>Loading guests...</TableCell></TableRow>
                ) : null}
                {!guestsQuery.isLoading && !guestsError && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>No guests found.</TableCell></TableRow>
                ) : null}
                {rows.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <input
                        type='checkbox'
                        checked={selectedIds.includes(guest.id)}
                        onChange={() => onToggleRow(guest.id)}
                      />
                    </TableCell>
                    <TableCell className='font-medium'>{guest.name}</TableCell>
                    <TableCell>
                      <div className='space-y-1'>
                        <p className='text-sm font-medium text-stone-900'>{guest.group_name ?? 'General Guests'}</p>
                        <p className='text-xs uppercase tracking-[0.16em] text-stone-500'>{guest.group_code ?? '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(guest.guest_group_id ?? '')}
                        onChange={(event) => moveGuestMutation.mutate({
                          id: guest.id,
                          guestGroupId: Number(event.target.value),
                        })}
                      >
                        {guestGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>{guest.email ?? '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={guest.guest_status}
                          onChange={(event) => statusMutation.mutate({
                          id: guest.id,
                          value: event.target.value as CoupleGuestStatus,
                        })}
                      >
                        <option value='invited'>invited</option>
                        <option value='contacted'>contacted</option>
                        <option value='no_reply'>no_reply</option>
                        <option value='rsvp-pending'>rsvp-pending</option>
                        <option value='attending'>attending</option>
                        <option value='declined'>declined</option>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(guest.invited_at)}</TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => deleteMutation.mutate(guest.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className='space-y-3 lg:hidden'>
            {!guestsQuery.isLoading && !guestsError && rows.length === 0 ? (
              <div className='rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-sm text-stone-600'>
                No guests match the current filters yet.
              </div>
            ) : null}
            {rows.map((guest: CoupleGuestItem) => (
              <Card key={guest.id}>
                <CardContent className='space-y-3 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-medium'>{guest.name}</p>
                      <p className='text-sm text-neutral-600'>{guest.email ?? '-'}</p>
                      <p className='text-xs uppercase tracking-[0.14em] text-stone-500'>
                        {guest.group_name ?? 'General Guests'} • {guest.group_code ?? '-'}
                      </p>
                    </div>
                    <input
                      type='checkbox'
                      checked={selectedIds.includes(guest.id)}
                      onChange={() => onToggleRow(guest.id)}
                    />
                  </div>
                  <p className='text-sm'>Invited: {formatDate(guest.invited_at)}</p>
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-[0.16em] text-stone-500'>Move to table</p>
                    <Select
                      value={String(guest.guest_group_id ?? '')}
                      onChange={(event) => moveGuestMutation.mutate({
                        id: guest.id,
                        guestGroupId: Number(event.target.value),
                      })}
                    >
                      {guestGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Select
                    value={guest.guest_status}
                    onChange={(event) => statusMutation.mutate({
                      id: guest.id,
                      value: event.target.value as CoupleGuestStatus,
                    })}
                  >
                    <option value='invited'>invited</option>
                    <option value='contacted'>contacted</option>
                    <option value='no_reply'>no_reply</option>
                    <option value='rsvp-pending'>rsvp-pending</option>
                    <option value='attending'>attending</option>
                    <option value='declined'>declined</option>
                  </Select>
                  <div className='grid grid-cols-1 gap-2'>
                    <Button type='button' variant='outline' onClick={() => deleteMutation.mutate(guest.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='flex items-center justify-between'>
            <p className='text-sm text-neutral-600'>Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}</p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={(meta?.current_page ?? 1) <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                Previous
              </Button>
              <Button
                type='button'
                disabled={(meta?.current_page ?? 1) >= (meta?.last_page ?? 1)}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}



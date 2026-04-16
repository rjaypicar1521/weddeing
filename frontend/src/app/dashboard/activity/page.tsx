"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Timeline, TimelineItem, TimelineLine, TimelinePoint } from '@/components/ui/timeline';
import { ActivityFilter, ActivityItem, getAdminActivity } from '@/lib/activity';
import { useAuthStore } from '@/stores/authStore';

function toActionLabel(action: string, details: string | null): string {
  if (action === 'rsvp_submitted') return `RSVP submitted${details ? `: ${details}` : ''}`;
  if (action === 'rsvp_updated') return `RSVP updated${details ? `: ${details}` : ''}`;
  if (action === 'invite_sent') return details ?? 'Invite sent';
  if (action === 'reminder_sent') return details ?? 'Reminder sent';
  if (action === 'guest_added') return details ?? 'Guest added';
  if (action === 'guest_deleted') return details ?? 'Guest deleted';
  return details ?? action;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function groupLabel(value: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const key = date.toDateString();
  if (key === today.toDateString()) return 'Today';
  if (key === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export default function ActivityPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAdmin = user?.is_admin ?? false;
  const [type, setType] = useState<ActivityFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [type, debouncedSearch]);

  const activityQuery = useQuery({
    queryKey: ['admin-activity', type, debouncedSearch, page],
    queryFn: () => getAdminActivity({ page, type, search: debouncedSearch || undefined }),
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
    enabled: hasHydrated && isAdmin,
  });

  const grouped = useMemo(() => {
    const source = activityQuery.data?.data ?? [];
    return source.reduce<Record<string, ActivityItem[]>>((acc, item) => {
      const label = groupLabel(item.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {});
  }, [activityQuery.data]);

  const meta = activityQuery.data?.meta;
  const totalItems = activityQuery.data?.data.length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_46%,#f5f5f4_46%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Activity Feed
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Follow RSVP, invite, and guest actions without losing the thread.
              </h1>
              <p className="max-w-xl text-sm text-stone-200 sm:text-base">
                This screen now adapts for compact phones, mid-width tablets, and wide desktops so filters and timelines stay readable instead of stacking awkwardly.
              </p>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/92 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-stone-950">Live Snapshot</CardTitle>
                  <CardDescription className="text-stone-600">Current filter and page state.</CardDescription>
                </div>
                <Badge className="border-stone-200 bg-stone-100 text-stone-700">
                  {type === 'all' ? 'All activity' : type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Visible events</p>
                <p>{totalItems} items on this page</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Pagination</p>
                <p>Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-stone-200 bg-white/95 shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_auto] xl:items-center">
          <Select value={type} onChange={(event) => setType(event.target.value as ActivityFilter)} className="w-full">
            <option value="all">All</option>
            <option value="rsvps">RSVPs</option>
            <option value="invites">Invites</option>
            <option value="reminders">Reminders</option>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guest name"
            className="w-full"
          />
          <div className="text-sm text-stone-500 xl:text-right">
            Auto-refreshes every 30 seconds
          </div>
        </CardContent>
      </Card>

      {hasHydrated && !isAdmin ? (
        <Alert>
          <AlertTitle>Admin access required</AlertTitle>
          <AlertDescription>This screen is reserved for admin users, so the layout stays available but the activity feed will not query protected endpoints for regular couple accounts.</AlertDescription>
        </Alert>
      ) : null}

      {activityQuery.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {activityQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load activity</AlertTitle>
          <AlertDescription>Please refresh and try again.</AlertDescription>
        </Alert>
      ) : null}

      {!activityQuery.isLoading && totalItems === 0 ? (
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardContent className="p-5 text-sm text-stone-600">No activity found for this filter.</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className="space-y-4">
          {Object.entries(grouped).map(([label, items]) => (
            <Card key={label} className="border-stone-200 bg-white/95 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-stone-950">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline>
                  {items.map((item, index) => (
                    <TimelineItem key={item.id}>
                      <TimelinePoint />
                      {index !== items.length - 1 ? <TimelineLine /> : null}
                      <div className="space-y-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-xs text-stone-500">{formatTime(item.created_at)}</p>
                        <p className="text-sm text-stone-700">
                          <span className="font-medium text-stone-950">{item.user_name}</span> {'->'} {toActionLabel(item.action, item.details)}
                        </p>
                        {item.ip ? <p className="text-xs text-stone-500">IP: {item.ip}</p> : null}
                      </div>
                    </TimelineItem>
                  ))}
                </Timeline>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit border-stone-200 bg-white/95 shadow-none xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="text-stone-950">Filter Guide</CardTitle>
            <CardDescription>Quick reminders while scanning the feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="font-medium text-stone-900">RSVPs</p>
              <p>Track submissions and edits from guests.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="font-medium text-stone-900">Invites</p>
              <p>Review sends and guest additions around outreach.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="font-medium text-stone-900">Reminders</p>
              <p>Check follow-up cadence before RSVP deadlines.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-3 rounded-[24px] border border-stone-200 bg-white/95 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            disabled={(meta?.current_page ?? 1) <= 1}
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={(meta?.current_page ?? 1) >= (meta?.last_page ?? 1)}
            onClick={() => setPage((previous) => previous + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </main>
  );
}

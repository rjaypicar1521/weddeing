"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminInviteAnalytics } from '@/lib/admin';
import { useAuthStore } from '@/stores/authStore';

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAdmin = user?.is_admin ?? false;
  const [range, setRange] = useState<7 | 30>(7);
  const [isChartReady, setIsChartReady] = useState(false);

  const analyticsQuery = useQuery({
    queryKey: ['admin-invite-analytics', range],
    queryFn: () => getAdminInviteAnalytics(range),
    staleTime: 5 * 60 * 1000,
    enabled: hasHydrated && isAdmin,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const analytics = analyticsQuery.data;

  const deviceChartData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'Mobile', value: analytics.by_device.mobile, fill: '#0f766e' },
      { name: 'Desktop', value: analytics.by_device.desktop, fill: '#1d4ed8' },
    ];
  }, [analytics]);

  const deviceTotal = (analytics?.by_device.mobile ?? 0) + (analytics?.by_device.desktop ?? 0);
  const mobilePct = deviceTotal > 0 ? Math.round(((analytics?.by_device.mobile ?? 0) / deviceTotal) * 100) : 0;
  const desktopPct = deviceTotal > 0 ? 100 - mobilePct : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_46%,#f5f5f4_46%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Invite Analytics
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Watch opens and engagement patterns in a layout that scales with the screen.
              </h1>
              <p className="max-w-xl text-sm text-stone-200 sm:text-base">
                The controls, KPI cards, and charts now adapt across compact phones, tablets, and larger desktop dashboards.
              </p>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/92 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-stone-950">Range Control</CardTitle>
                  <CardDescription className="text-stone-600">Switch between short-term and longer invite windows.</CardDescription>
                </div>
                <Badge className="border-stone-200 bg-stone-100 text-stone-700">
                  Last {range} days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={range === 7 ? 'default' : 'outline'} onClick={() => setRange(7)}>
                  Last 7 days
                </Button>
                <Button type="button" variant={range === 30 ? 'default' : 'outline'} onClick={() => setRange(30)}>
                  Last 30 days
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {hasHydrated && !isAdmin ? (
        <Alert>
          <AlertTitle>Admin access required</AlertTitle>
          <AlertDescription>This analytics view is admin-only, so couple accounts now see a clean access state instead of repeatedly hitting protected endpoints.</AlertDescription>
        </Alert>
      ) : null}

      {analyticsQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : null}

      {analyticsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load invite analytics</AlertTitle>
          <AlertDescription>Please refresh and try again.</AlertDescription>
        </Alert>
      ) : null}

      {analytics ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-stone-200 bg-white/95 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">Total Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-stone-950">{analytics.total_sent}</p>
              </CardContent>
            </Card>
            <Card className="border-stone-200 bg-white/95 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">Opened</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-stone-950">{analytics.total_opened}</p>
                <p className="text-sm text-stone-600">{analytics.open_rate}% open rate</p>
              </CardContent>
            </Card>
            <Card className="border-stone-200 bg-white/95 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">Opened Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-stone-950">{analytics.opened_today}</p>
              </CardContent>
            </Card>
            <Card className="border-stone-200 bg-white/95 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">Avg Open Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-stone-950">{analytics.avg_days_to_open}</p>
                <p className="text-sm text-stone-600">days to open</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
            <Card className="min-w-0 border-stone-200 bg-white/95 shadow-none">
              <CardHeader>
                <CardTitle className="text-stone-950">Invite Opens Timeline</CardTitle>
                <CardDescription>Compare total opens with mobile and desktop behavior over time.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] min-w-0 sm:h-[320px] lg:h-[360px]">
                {!isChartReady ? (
                  <div className="h-full rounded-2xl border border-stone-200 bg-stone-50" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={analytics.timeline} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#57534e' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#57534e' }} width={36} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="opens" stroke="#111827" strokeWidth={2.5} name="Total Opens" />
                      <Line type="monotone" dataKey="mobile" stroke="#0f766e" strokeWidth={2.5} name="Mobile" />
                      <Line type="monotone" dataKey="desktop" stroke="#1d4ed8" strokeWidth={2.5} name="Desktop" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Card className="border-stone-200 bg-white/95 shadow-none">
                <CardHeader>
                  <CardTitle className="text-stone-950">Device Breakdown</CardTitle>
                  <CardDescription>Share of invite opens by device class.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mx-auto h-56 w-full min-w-0">
                    {!isChartReady ? (
                      <div className="h-full rounded-2xl border border-stone-200 bg-stone-50" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie data={deviceChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-stone-600">
                    <p>Mobile {analytics.by_device.mobile} ({mobilePct}%)</p>
                    <p>Desktop {analytics.by_device.desktop} ({desktopPct}%)</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-stone-200 bg-white/95 shadow-none">
                <CardHeader>
                  <CardTitle className="text-stone-950">Reading Notes</CardTitle>
                  <CardDescription>Quick context for interpreting the charts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-stone-600">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="font-medium text-stone-900">Mobile-first audience</p>
                    <p>High mobile share suggests the invitation experience should remain optimized for handheld browsing.</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="font-medium text-stone-900">Range switching</p>
                    <p>Short windows help spot spikes, while 30-day views help judge overall momentum.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

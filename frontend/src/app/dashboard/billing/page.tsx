"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { safeExternalOpen } from '@/lib/security-utils';
import {
  createBillingPortalSession,
  createProCheckout,
  getBillingStatus,
  getInvoiceHistory,
  getUsageAnalytics,
} from '@/lib/payments';

function BillingContent() {
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
    staleTime: 60 * 1000,
  });

  const upgradeMutation = useMutation({
    mutationFn: createProCheckout,
    onSuccess: (response) => {
      window.location.href = response.checkout_url;
    },
    onError: (error: Error) => {
      setNotice({
        type: 'error',
        message: error.message || 'Unable to start checkout right now.',
      });
    },
  });

  const invoiceHistoryQuery = useQuery({
    queryKey: ['billing-invoice-history'],
    queryFn: getInvoiceHistory,
    staleTime: 60 * 1000,
  });

  const usageAnalyticsQuery = useQuery({
    queryKey: ['billing-usage-analytics'],
    queryFn: getUsageAnalytics,
    staleTime: 60 * 1000,
  });

  const portalMutation = useMutation({
    mutationFn: createBillingPortalSession,
    onSuccess: (response) => {
      safeExternalOpen(response.portal_url);
    },
    onError: (error: Error) => {
      setNotice({
        type: 'error',
        message: error.message || 'Unable to open billing portal right now.',
      });
    },
  });

  useEffect(() => {
    const checkoutState = searchParams.get('checkout');
    if (checkoutState === 'success') {
      setNotice({ type: 'success', message: 'Payment received. Your account is now Pro.' });
    } else if (checkoutState === 'cancelled') {
      setNotice({ type: 'error', message: 'Checkout was cancelled.' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const status = statusQuery.data;
  const invoices = invoiceHistoryQuery.data?.invoices ?? [];
  const usageAnalytics = usageAnalyticsQuery.data;
  const usagePercent = status?.guest_usage.percent ?? 0;
  const usageLimit = status?.guest_usage.limit ?? 25;
  const usageUsed = status?.guest_usage.used ?? 0;
  const over80 = usagePercent >= 80;
  const isPro = status?.is_pro ?? false;

  const progressClass = useMemo(() => {
    if (usagePercent >= 100) return 'bg-rose-500';
    if (usagePercent >= 80) return 'bg-amber-500';
    return 'bg-stone-900';
  }, [usagePercent]);

  const trendData = useMemo(() => {
    const trend = usageAnalytics?.trend ?? [];
    const normalized = trend
      .slice()
      .reverse()
      .map((item) => ({
        month: item.month,
        guests: item.guests,
        projected: null as number | null,
      }));

    if (normalized.length > 0 && usageAnalytics) {
      normalized.push({
        month: 'Projected',
        guests: normalized[normalized.length - 1]?.guests ?? 0,
        projected: usageAnalytics.projected_total,
      });
    }

    return normalized;
  }, [usageAnalytics]);

  const monthOverMonth = useMemo(() => {
    const trend = usageAnalytics?.trend ?? [];
    const current = trend[0]?.guests ?? 0;
    const previous = trend[1]?.guests ?? 0;
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [usageAnalytics]);

  const usageToneClass = over80
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {notice ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm">
          <Alert variant={notice.type === 'success' ? 'success' : 'destructive'}>
            <AlertTitle>{notice.type === 'success' ? 'Success' : 'Action Failed'}</AlertTitle>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_46%,#f5f5f4_46%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.3fr_0.95fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Billing Control
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Keep guest capacity, plan access, and billing decisions in one place.
              </h1>
              <p className="max-w-xl text-sm text-stone-200 sm:text-base">
                This view is tuned to stay readable on phone, tablet, and large desktop screens so usage trends and upgrade decisions do not collapse into a single narrow layout.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="bg-white text-stone-950 hover:bg-stone-100"
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending || isPro}
              >
                {isPro ? 'Already on Pro' : upgradeMutation.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending || !isPro}
              >
                {portalMutation.isPending ? 'Opening...' : 'Manage Billing'}
              </Button>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/92 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-stone-950">Plan Snapshot</CardTitle>
                  <CardDescription className="text-stone-600">
                    {status ? `${usageUsed}/${usageLimit} guest slots used` : 'Loading billing state...'}
                  </CardDescription>
                </div>
                <Badge className={isPro ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-100 text-stone-700'}>
                  {status?.plan_label ?? 'Free'} Plan
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-semibold text-stone-950">{usagePercent}%</p>
                  <p className="text-right text-sm text-stone-500">Guest capacity in use</p>
                </div>
                <Progress value={usagePercent} indicatorClassName={progressClass} className="h-2.5" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Plan allowance</p>
                <p>{usageLimit} guests available on the current plan.</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${usageToneClass}`}>
                <p className="font-medium">Capacity watch</p>
                <p>{over80 ? 'You are close to the current limit.' : 'Usage is still comfortably below the limit.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {statusQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load billing status</AlertTitle>
          <AlertDescription>Please refresh and try again.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Current Plan</CardDescription>
            <CardTitle className="text-2xl text-stone-950">{status?.plan_label ?? 'Free'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            {isPro ? 'Custom domain and higher guest capacity are active.' : 'Upgrade unlocks custom domain and more guest capacity.'}
          </CardContent>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Guests Used</CardDescription>
            <CardTitle className="text-2xl text-stone-950">{usageUsed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">Tracked against a plan limit of {usageLimit} guests.</CardContent>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Monthly Direction</CardDescription>
            <CardTitle className="text-2xl text-stone-950">
              {monthOverMonth >= 0 ? '+' : '-'}
              {Math.abs(monthOverMonth)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">Compared with the previous month’s guest usage.</CardContent>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Projected Total</CardDescription>
            <CardTitle className="text-2xl text-stone-950">{usageAnalytics?.projected_total ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">{usageAnalytics?.projected ?? 'Projection will appear once trend data is available.'}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <Card className="min-w-0 border-stone-200 bg-white/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-stone-950">Usage Trend</CardTitle>
            <CardDescription>Six-month usage view with a projection marker for capacity planning.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] min-w-0 sm:h-[320px] lg:h-[360px]">
            {usageAnalyticsQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load usage analytics</AlertTitle>
                <AlertDescription>Please refresh and try again.</AlertDescription>
              </Alert>
            ) : !isChartReady ? (
              <div className="h-full rounded-2xl border border-stone-200 bg-stone-50" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={trendData} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" tick={{ fill: '#57534e', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#57534e', fontSize: 12 }} width={36} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    y={usageAnalytics?.current_month.guest_limit ?? usageLimit}
                    stroke="#d97706"
                    strokeDasharray="5 5"
                    label="Limit"
                  />
                  <Line type="monotone" dataKey="guests" stroke="#1c1917" strokeWidth={2.5} dot={{ r: 3 }} name="Guests" />
                  <Line type="monotone" dataKey="projected" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Projected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Monthly Snapshot</CardTitle>
              <CardDescription>Current usage and pacing for the active billing cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-600">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">This month</p>
                <p>
                  {usageAnalytics?.current_month.guests_used ?? usageUsed}/
                  {usageAnalytics?.current_month.guest_limit ?? usageLimit} guests used
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">Usage rate</p>
                <p>{usageAnalytics?.current_month.usage_pct ?? usagePercent}% of limit consumed</p>
              </div>
              {(usageAnalytics?.current_month.usage_pct ?? 0) >= 80 ? (
                <Alert>
                  <AlertTitle>Upgrade Nudge</AlertTitle>
                  <AlertDescription>Pro plan covers up to 250 guests and reduces last-minute capacity risk.</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Billing Timeline</CardTitle>
              <CardDescription>Current billing anchors and renewal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-600">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">Billed</p>
                <p>{status?.current_plan?.billed_at ? new Date(status.current_plan.billed_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">Next bill date</p>
                <p>{status?.current_plan?.next_bill_date ? new Date(status.current_plan.next_bill_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-stone-200 bg-white/95 shadow-none">
        <CardHeader>
          <CardTitle className="text-stone-950">Billing History</CardTitle>
          <CardDescription>Invoice records stay scrollable on small screens and readable on larger workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceHistoryQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load invoice history</AlertTitle>
              <AlertDescription>Please refresh and try again.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-stone-500">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.invoice_id}>
                        <TableCell>{invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: invoice.currency || 'USD',
                          }).format(invoice.amount)}
                        </TableCell>
                        <TableCell className="capitalize">{invoice.status}</TableCell>
                        <TableCell>
                          {invoice.invoice_pdf_url ? (
                            <a
                              href={invoice.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-stone-900 underline"
                            >
                              PDF
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-stone-950">Free</CardTitle>
            <CardDescription>For smaller weddings and lighter guest lists.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p>25 guests</p>
              <p>Wedding Online URL</p>
              <p>No custom domain</p>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled>
              Current baseline
            </Button>
          </CardContent>
        </Card>

        <Card className="border-stone-900 bg-stone-950 text-white shadow-none">
          <CardHeader>
            <CardTitle>Pro $29</CardTitle>
            <CardDescription className="text-stone-300">One-time upgrade for a fuller event setup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-stone-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p>250 guests</p>
              <p>Custom domain</p>
              <p>Priority support</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                className="w-full bg-white text-stone-950 hover:bg-stone-100"
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending || isPro}
              >
                {isPro ? 'Already on Pro' : upgradeMutation.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                disabled={!isPro}
              >
                Billing managed in portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-20 w-full" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

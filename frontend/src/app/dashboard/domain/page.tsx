"use client";

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getBillingStatus, getDomainStatus, verifyCustomDomain } from '@/lib/payments';

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export default function DomainSetupPage() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const billingQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
    staleTime: 60 * 1000,
  });

  const domainStatusQuery = useQuery({
    queryKey: ['domain-status'],
    queryFn: getDomainStatus,
    staleTime: 30 * 1000,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyCustomDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-status'] });
      setNotice({ type: 'success', message: 'Domain verified. Your site is now live on your custom domain.' });
    },
    onError: (error: Error) => {
      setNotice({ type: 'error', message: error.message || 'Domain verification failed.' });
    },
  });

  const normalizedDomain = useMemo(() => normalizeDomain(domain), [domain]);
  const status = domainStatusQuery.data;
  const billing = billingQuery.data;
  const isPro = billing?.is_pro ?? false;
  const expectedTxt = status?.expected_txt_value ?? 'wedding-[ID].weddingonline.com';

  const statusBadge = useMemo(() => {
    if (!status) return { text: 'Loading...', className: 'border-stone-200 bg-stone-100 text-stone-700' };
    if (status.status === 'verified') return { text: 'Live', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
    if (status.status === 'failed') return { text: 'Failed', className: 'border-rose-200 bg-rose-50 text-rose-700' };
    return { text: 'Pending', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }, [status]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_46%,#f5f5f4_46%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.3fr_0.95fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Custom Domain
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Give your invitation a permanent address that feels like your event.
              </h1>
              <p className="max-w-xl text-sm text-stone-200 sm:text-base">
                The setup is broken into clear steps that reflow cleanly across phone, tablet, and desktop so DNS details remain readable instead of getting cramped.
              </p>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/92 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-stone-950">Domain Status</CardTitle>
                  <CardDescription className="text-stone-600">
                    {status?.custom_domain ? status.custom_domain : 'No custom domain connected yet'}
                  </CardDescription>
                </div>
                <Badge className={statusBadge.className}>{statusBadge.text}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Plan access</p>
                <p>{isPro ? 'Custom domain is available on your account.' : 'Upgrade to Pro to activate domain tools.'}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Fallback route</p>
                <p>weddingonline.com/i/[slug] remains available while DNS is propagating.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {notice ? (
        <Alert variant={notice.type === 'success' ? 'success' : 'destructive'}>
          <AlertTitle>{notice.type === 'success' ? 'Success' : 'Verification failed'}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      {!isPro ? (
        <Alert variant="destructive">
          <AlertTitle>Pro plan required</AlertTitle>
          <AlertDescription>Custom domains are available for Pro accounts only. Upgrade in Billing to continue.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Step 1: Enter your domain</CardTitle>
              <CardDescription>Use the root domain you want guests to remember.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="yourwedding.com"
                disabled={!isPro}
              />
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Live preview</p>
                <p>{normalizedDomain || 'yourwedding.com'} will be your guest-facing address.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Step 2: Add DNS TXT record</CardTitle>
              <CardDescription>Copy this record into your DNS provider dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  <p className="font-medium text-stone-900">Type</p>
                  <p>TXT</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  <p className="font-medium text-stone-900">Host</p>
                  <p>@</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  <p className="font-medium text-stone-900">Value</p>
                  <p className="break-all">{expectedTxt}</p>
                </div>
              </div>
              <p className="text-sm text-stone-600">Wait 5 to 10 minutes after saving DNS, then run verification.</p>
              <Button
                type="button"
                disabled={!isPro || normalizedDomain.length < 3 || verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ domain: normalizedDomain })}
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify Domain'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Step 3: Status</CardTitle>
              <CardDescription>Connection health, verification result, and next steps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-600">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">Next step</p>
                <p>{status?.next_steps ?? 'Checking current domain state...'}</p>
              </div>
              {status?.custom_domain ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="font-medium text-stone-900">Connected domain</p>
                  <p>{status.custom_domain}</p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">Fallback</p>
                <p>weddingonline.com/i/[slug]</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-white/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-stone-950">Setup Notes</CardTitle>
              <CardDescription>Useful reminders while switching between breakpoints and devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-600">
              <p>Some DNS providers show TXT records in compressed card layouts on mobile, so keeping this reference concise matters.</p>
              <p>Tablet layouts keep the instructions and status side by side so you can copy values without constant scrolling.</p>
              <p>Desktop layouts preserve the command-center feel while still making the DNS record easy to scan.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

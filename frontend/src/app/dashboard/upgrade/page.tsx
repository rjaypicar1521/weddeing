"use client";

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UpgradePage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_46%,#f5f5f4_46%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_0.95fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Upgrade Path
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                You reached the free-plan ceiling. The next step should feel obvious on every screen size.
              </h1>
              <p className="max-w-xl text-sm text-stone-200 sm:text-base">
                This page now frames the decision clearly on mobile, tablet, and desktop instead of collapsing into a single plain card.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="button" className="bg-white text-stone-950 hover:bg-stone-100" onClick={() => router.push('/dashboard/billing')}>
                Go to Billing
              </Button>
              <Button type="button" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => router.push('/dashboard/guests-management')}>
                Back to Guests
              </Button>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/92 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-stone-950">Plan Difference</CardTitle>
                  <CardDescription className="text-stone-600">Free plan has already hit its guest ceiling.</CardDescription>
                </div>
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">Capacity Reached</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Free</p>
                <p>25 guests with Wedding Online URL only.</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-medium text-stone-900">Pro</p>
                <p>250 guests, custom domain, and priority support.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-stone-950">Why upgrade now</CardTitle>
            <CardDescription>Stay ahead of invite list growth before RSVP reminders and final planning start.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              <p className="font-medium text-stone-900">Guest capacity</p>
              <p>Expand from 25 to 250 guests.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              <p className="font-medium text-stone-900">Branding</p>
              <p>Use a custom domain for a more polished invitation link.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              <p className="font-medium text-stone-900">Support</p>
              <p>Get priority support while finalizing your setup.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-900 bg-stone-950 text-white shadow-none">
          <CardHeader>
            <CardTitle>Recommended next move</CardTitle>
            <CardDescription className="text-stone-300">Open billing to review the plan and start checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-stone-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p>Your guest list is already at the limit, so the upgrade page should move you forward instead of making you re-interpret the problem.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" className="w-full bg-white text-stone-950 hover:bg-stone-100" onClick={() => router.push('/dashboard/billing')}>
                Continue to Billing
              </Button>
              <Button type="button" variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => router.push('/dashboard/guests-management')}>
                Review Guests
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

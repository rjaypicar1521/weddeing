"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getInvitation } from "@/lib/invitation";
import { getGuestUsage } from "@/lib/payments";
import { getCoupleRsvpStats } from "@/lib/rsvps";
import { useAuthStore } from "@/stores/authStore";

function DashboardContent() {
  const searchParams = useSearchParams();
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const verified = searchParams.get("verified") === "1";

  const userQuery = useQuery({
    queryKey: ["auth-user"],
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

  useEffect(() => {
    if (hasHydrated) {
      setHydrationTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHydrationTimedOut(true);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasHydrated]);

  const user = storedUser ?? userQuery.data?.user ?? null;
  const isVerified = Boolean(user?.email_verified_at);
  const isAuthHydrating = !hasHydrated && !storedUser && !hydrationTimedOut;
  const isUserLoading = isAuthHydrating || (!user && userQuery.isPending);

  const invitationQuery = useQuery({
    queryKey: ["couple-invitation"],
    queryFn: getInvitation,
    enabled: isVerified,
    staleTime: 60 * 1000,
    retry: false,
  });

  const rsvpStatsQuery = useQuery({
    queryKey: ["couple-rsvp-stats"],
    queryFn: getCoupleRsvpStats,
    enabled: isVerified && invitationQuery.isSuccess,
    staleTime: 60 * 1000,
    retry: false,
  });

  const usageQuery = useQuery({
    queryKey: ["guest-usage"],
    queryFn: getGuestUsage,
    enabled: isVerified,
    staleTime: 60 * 1000,
    retry: false,
  });

  if (isUserLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-32 w-full rounded-[28px]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  if ((userQuery.isError && !user) || (hydrationTimedOut && !user)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#4a1420]">Your Dashboard Session Expired</h1>
          <p className="text-sm text-[#7b5560] sm:text-base">
            Sign in again to continue managing invitations, RSVPs, and guest settings.
          </p>
        </div>

        <Card className="border-[#e7c8d0] bg-white/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-[#4a1420]">Continue to Couple Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Unable to load your account</AlertTitle>
              <AlertDescription>Please sign in again to continue to your dashboard.</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full bg-[#6f1d2b] text-white hover:bg-[#5b1823] sm:w-auto">Sign in</Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full border-[#d8a9b6] text-[#6f1d2b] hover:bg-[#f8eef1] sm:w-auto" variant="outline">
                  Create account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isVerified) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        {verified ? (
          <Alert variant="success">
            <AlertTitle>Email verified successfully</AlertTitle>
            <AlertDescription>Your account is ready. Continue to set up your invitation.</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-neutral-900">Verify Your Email</h1>
          <p className="text-neutral-700">
            We need to verify <span className="font-medium">{user?.email ?? "your email address"}</span> before unlocking your invitation tools.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next Step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-700">
              Open the verification email we sent during registration. If it did not arrive, use the resend flow.
            </p>
            <Link href="/auth/verify-email" className="block">
              <Button className="w-full sm:w-auto">Open Verification Page</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const invitationError = invitationQuery.error instanceof ApiError ? invitationQuery.error : null;
  const hasInvitation = invitationQuery.isSuccess;
  const invitation = invitationQuery.data?.invitation;
  const usage = usageQuery.data;
  const rsvpStats = rsvpStatsQuery.data;
  const invitedGuests = usage?.guests_used ?? 0;
  const guestLimit = usage?.guest_limit ?? 25;
  const guestUsagePercent = guestLimit > 0 ? Math.min(100, Math.round((invitedGuests / guestLimit) * 100)) : 0;
  const invitationStatus = String(invitation?.status ?? "draft").toLowerCase();
  const statusLabel = invitationStatus.charAt(0).toUpperCase() + invitationStatus.slice(1);
  const statusTone = invitationStatus === "published"
    ? "border-[#d8a9b6] bg-[#f7e9ee] text-[#7a1f35]"
    : "border-[#e7c8d0] bg-[#fbf1f4] text-[#8a4b59]";
  const readinessPercent = hasInvitation
    ? Math.min(
        100,
        (invitationStatus === "published" ? 40 : 15) +
          (rsvpStats ? 25 : 0) +
          (usage ? 20 : 0) +
          (invitedGuests > 0 ? 15 : 0),
      )
    : 10;

  if (invitationError?.status === 422) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        {verified ? (
          <Alert variant="success">
            <AlertTitle>Email verified successfully</AlertTitle>
            <AlertDescription>Your account is ready. Start creating your invitation.</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-neutral-900">Welcome, {user?.name ?? "friend"}</h1>
          <p className="text-neutral-700">Your account is ready, but you have not created your invitation yet.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-700">
              Start with your wedding details, then continue through theme, media, and publish steps.
            </p>
            <Link href="/dashboard/builder" className="block">
              <Button className="w-full sm:w-auto">Open Invitation Builder</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const summaryCards = [
    { label: "Invitation Status", value: statusLabel, hint: invitationStatus === "published" ? "Guests can access the invitation" : "Still hidden from guests" },
    { label: "Guest Code", value: invitation?.guest_code ?? "-", hint: "Share this with invited guests" },
    { label: "RSVPs", value: String(rsvpStats?.total ?? 0), hint: "Responses collected so far" },
    { label: "Attending", value: String(rsvpStats?.attending ?? 0), hint: "Confirmed seats for the day" },
  ];

  const actionCards = [
    {
      href: "/dashboard/builder",
      title: "Continue Builder",
      description: "Refine your story, schedule, theme, and final invitation details.",
      primary: true,
    },
    {
      href: "/dashboard/builder/preview",
      title: "Preview Invitation",
      description: "Review the guest-facing experience before sending it out.",
      primary: false,
    },
    {
      href: "/dashboard/guests-management",
      title: "Manage Guests",
      description: "Import guests, monitor capacity, and keep the invite list clean.",
      primary: false,
    },
    {
      href: "/dashboard/guests",
      title: "Review RSVPs",
      description: "Track attendance, meal choices, and response momentum.",
      primary: false,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {verified ? (
        <Alert variant="success">
          <AlertTitle>Email verified successfully</AlertTitle>
          <AlertDescription>Your dashboard is now unlocked.</AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-[#e7c8d0] bg-[linear-gradient(180deg,#fff9fb_0%,#fdf5f7_100%)] shadow-sm">
        <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.35fr_0.95fr] lg:items-stretch">
          <div className="rounded-[24px] border border-[#7b2a3b] bg-[linear-gradient(145deg,#4a1420_0%,#6f1d2b_48%,#8a3246_100%)] px-5 py-6 shadow-sm sm:px-7 sm:py-8">
            <div className="space-y-4 text-white">
              <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7dfe6]">
                Wedding Command Center
              </div>
              <div className="space-y-3">
                <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                  Keep your invitation polished, published, and guest-ready.
                </h1>
                <p className="max-w-lg text-sm text-[#f3d9e0] sm:text-base">
                  Monitor launch status, watch RSVP movement, and keep your guest experience aligned from one place.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-[#f3d9e0] sm:grid-cols-2">
                <p>Invitation status: {statusLabel}</p>
                <p>Guest usage: {invitedGuests}/{guestLimit}</p>
              </div>
            </div>
          </div>

          <Card className="h-full border-[#e7c8d0]/80 bg-white/95 shadow-none">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base text-[#4a1420]">Readiness Snapshot</CardTitle>
                <Badge className={statusTone}>{statusLabel}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold text-[#4a1420]">{readinessPercent}%</p>
                  <p className="text-sm text-[#8a4b59]">{invitedGuests} invited</p>
                </div>
                <Progress value={readinessPercent} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-[#7b5560] sm:grid-cols-2">
              <div>
                <p className="font-medium text-[#4a1420]">Guest code</p>
                <p>{invitation?.guest_code ?? "-"}</p>
              </div>
              <div>
                <p className="font-medium text-[#4a1420]">Plan</p>
                <p>{user?.plan === "premium" ? "Premium" : "Free"}</p>
              </div>
              <div>
                <p className="font-medium text-[#4a1420]">RSVPs</p>
                <p>{rsvpStats?.total ?? 0} received</p>
              </div>
              <div>
                <p className="font-medium text-[#4a1420]">Attending</p>
                <p>{rsvpStats?.attending ?? 0} guests confirmed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {invitationQuery.isLoading || usageQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {invitationQuery.isError && !invitationError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load invitation overview</AlertTitle>
          <AlertDescription>Please refresh and try again.</AlertDescription>
        </Alert>
      ) : null}

      {hasInvitation ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((item) => (
              <Card key={item.label} className="border-[#e7c8d0] bg-white/90 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#8a4b59]">{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-semibold text-[#4a1420]">{item.value}</p>
                  <p className="text-sm text-[#7b5560]">{item.hint}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="border-[#e7c8d0] bg-white/95 shadow-none lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-[#4a1420]">Next Best Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {actionCards.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={item.primary
                      ? "rounded-2xl border border-[#6f1d2b] bg-[#6f1d2b] p-4 text-white transition-transform hover:-translate-y-0.5"
                      : "rounded-2xl border border-[#e7c8d0] bg-[#fbf3f5] p-4 text-[#4a1420] transition-transform hover:-translate-y-0.5 hover:border-[#c98b9b]"}
                  >
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold">{item.title}</p>
                        <p className={item.primary ? "text-sm text-[#f3d9e0]" : "text-sm text-[#7b5560]"}>
                          {item.description}
                        </p>
                      </div>
                      <Button className={item.primary ? "w-full bg-white text-[#4a1420] hover:bg-[#f8eef1]" : "w-full border-[#d8a9b6] text-[#6f1d2b] hover:bg-[#f8eef1]"} variant="outline">
                        Open
                      </Button>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[#e7c8d0] bg-[linear-gradient(180deg,#fff,#fbf3f5)] shadow-none">
              <CardHeader>
                <CardTitle className="text-[#4a1420]">Guest Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-semibold text-[#4a1420]">
                    {invitedGuests}/{guestLimit}
                  </p>
                  <p className="text-sm text-[#7b5560]">Guests used for your current plan</p>
                </div>
                <Progress value={guestUsagePercent} />
                <div className="rounded-2xl border border-[#e7c8d0] bg-white px-4 py-3 text-sm text-[#7b5560]">
                  <p>{guestUsagePercent}% of capacity is already allocated.</p>
                  <p className="mt-1">Use guest management to keep imports and reminders under control.</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-20 w-full" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

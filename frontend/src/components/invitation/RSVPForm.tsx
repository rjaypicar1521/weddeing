"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { GuestInvitationGroupGuest, GuestRsvpResponse, getGuestRsvp, submitGuestRsvp } from "@/lib/guest";
import { safeExternalOpen } from "@/lib/security-utils";

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
  const prevSubmissionState = useRef<boolean>(false);
  const formTopRef = useRef<HTMLDivElement | null>(null);

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
    const next = boardingPass !== null || submittedRsvps.length > 0;
    if (prevSubmissionState.current !== next) {
      prevSubmissionState.current = next;
      onSubmissionStateChange?.(next);
    }
  }, [boardingPass, onSubmissionStateChange, submittedRsvps.length]);

  useUnsavedChangesGuard(step > 1 && boardingPass === null && form.formState.isDirty);

  useEffect(() => {
    if (boardingPass !== null) return;
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [boardingPass, step]);

  const goNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const valid = await form.trigger("attending", { shouldFocus: true });
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
      const valid = await form.trigger(fields, { shouldFocus: true });
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
        <div className="space-y-5 overflow-hidden typography-first-body">
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
                      <h3 className="typography-first-heading text-lg uppercase tracking-[-0.03em] text-neutral-950">{partnerNames} Wedding</h3>
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
          <CardHeader><CardTitle className="typography-first-heading uppercase tracking-[-0.03em] text-neutral-950">Add to Calendar</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className={`w-full sm:w-auto ${BRAND_PRIMARY_BUTTON}`} onClick={() => safeExternalOpen(googleCalendarUrl)}>Google Calendar</Button>
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
    <Card className={`typography-first-body overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-[0_16px_40px_rgba(0,0,0,0.06)]`}>
      <div ref={formTopRef} />
      <CardHeader className="space-y-4 bg-[linear-gradient(180deg,#fafaf8,#fff)]">
        <div className="space-y-2">
          <CardTitle className="typography-first-heading text-2xl leading-tight tracking-[-0.025em] text-neutral-950">RSVP Journey</CardTitle>
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
          <div aria-live="polite" className="sr-only">
            {`Step ${step} of ${TOTAL_STEPS}: ${activeStepMeta?.title ?? ""}`}
          </div>
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


"use client";

import Image from "next/image";
import { use, useMemo, useRef, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Timeline, TimelineItem, TimelineLine, TimelinePoint } from "@/components/ui/timeline";
import { ApiError } from "@/lib/api";
import { getGuestInvitation, submitGuestRsvp } from "@/lib/guest";
import { isPlausibleJwt, safeExternalOpen } from "@/lib/security-utils";

const revealVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const rsvpSchema = z
  .object({
    guest_name: z.string().min(2, "Please enter your full name."),
    attending: z.enum(["yes", "no"], { message: "Please select your attendance." }),
    meal_preference: z.enum(["Beef", "Fish", "Vegetarian", "Kids"]).nullable(),
    message_to_couple: z.string().max(500, "Message must be 500 characters or less."),
  })
  .superRefine((values, ctx) => {
    if (values.attending === "yes" && values.meal_preference === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meal_preference"],
        message: "Please choose a meal preference.",
      });
    }
  });

type RsvpValues = z.infer<typeof rsvpSchema>;

function formatDate(value?: string): string {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatTime(value?: string): string {
  if (!value) return "Time to be announced";
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdn) return path;
  return `${cdn.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function InvitationSection({
  id,
  index,
  className,
  reduceMotion = false,
  children,
}: {
  id?: string;
  index: number;
  className?: string;
  reduceMotion?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      variants={revealVariant}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={reduceMotion ? undefined : { once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut", delay: Math.min(index * 0.06, 0.2) }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function PublicInvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);
  const invitationRef = useRef<HTMLDivElement | null>(null);
  const [hasGuestToken, setHasGuestToken] = useState<boolean>(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const form = useForm<RsvpValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      guest_name: "",
      attending: "yes",
      meal_preference: null,
      message_to_couple: "",
    },
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("guest_token") : null;
    if (!token || !isPlausibleJwt(token)) {
      if (token && typeof window !== "undefined") {
        sessionStorage.removeItem("guest_token");
      }
      router.replace(`/i/${slug}`);
      return;
    }
    setHasGuestToken(true);
    setTokenChecked(true);
  }, [router, slug]);

  const invitationQuery = useQuery({
    queryKey: ["public-invitation", slug],
    queryFn: getGuestInvitation,
    enabled: hasGuestToken,
    retry: false,
  });

  const rsvpMutation = useMutation({
    mutationFn: submitGuestRsvp,
    onSuccess: () => {
      setRsvpError(null);
      form.reset({
        guest_name: "",
        attending: "yes",
        meal_preference: null,
        message_to_couple: "",
      });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setRsvpError(error.message);
        return;
      }
      setRsvpError("Unable to submit RSVP right now. Please try again.");
    },
  });

  const invitation = invitationQuery.data?.invitation;
  const partnerNames = useMemo(() => {
    const first = invitation?.partner1_name ?? "Partner 1";
    const second = invitation?.partner2_name ?? "Partner 2";
    return `${first} & ${second}`;
  }, [invitation?.partner1_name, invitation?.partner2_name]);

  const weddingDate = formatDate(invitation?.wedding_date);
  const weddingTime = formatTime(invitation?.wedding_time);
  const venueName = invitation?.venue_name?.trim() || "Venue to be announced";
  const venueAddress = invitation?.venue_address?.trim() || venueName;
  const dressCode = invitation?.dress_code?.trim() || "Formal attire";
  const schedule = invitation?.schedule ?? [];
  const groupGuests = invitationQuery.data?.group?.guests ?? [];

  const heroImage = useMemo(() => {
    const hero = invitationQuery.data?.media?.hero?.[0]?.url;
    const firstGallery = invitationQuery.data?.media?.gallery?.[0]?.url;
    return resolveAssetUrl(hero ?? firstGallery ?? null);
  }, [invitationQuery.data?.media?.gallery, invitationQuery.data?.media?.hero]);

  const gallery = useMemo(() => {
    const items = invitationQuery.data?.media?.gallery ?? [];
    return items
      .map((item, index) => ({
        id: `${item.type ?? "gallery"}-${index}`,
        url: resolveAssetUrl(item.url ?? null),
        title: `Gallery photo ${index + 1}`,
      }))
      .filter((item): item is { id: string; url: string; title: string } => Boolean(item.url));
  }, [invitationQuery.data?.media?.gallery]);

  const activePhoto = activePhotoIndex !== null ? gallery[activePhotoIndex] : null;
  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(venueAddress)}`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(venueAddress)}&output=embed`;
  const attendingValue = form.watch("attending");
  const mealValue = form.watch("meal_preference");
  const messageLength = form.watch("message_to_couple").length;

  useEffect(() => {
    if (attendingValue === "no" && mealValue !== null) {
      form.setValue("meal_preference", null, { shouldValidate: true });
    }
  }, [attendingValue, form, mealValue]);

  const onSubmitRsvp = (values: RsvpValues) => {
    setRsvpError(null);

    const normalizedGuestName = values.guest_name.trim().toLowerCase();
    const matchedGuest =
      groupGuests.find((guest) => guest.guest_name.trim().toLowerCase() === normalizedGuestName) ?? null;

    if (groupGuests.length > 0 && !matchedGuest) {
      setRsvpError("Select your guest name from the list before submitting RSVP.");
      return;
    }

    rsvpMutation.mutate({
      guest_id: matchedGuest?.id ?? null,
      guest_name: values.guest_name.trim(),
      attending: values.attending === "yes",
      meal_preference: values.attending === "yes" ? values.meal_preference : null,
      message_to_couple: values.message_to_couple.trim() || null,
      transport: null,
      plus_one_name: null,
      favorite_memory: null,
    });
  };

  if (!tokenChecked && !hasGuestToken) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-stone-600">Loading invitation...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (invitationQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-stone-600">Preparing your invitation...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (invitationQuery.isError || !invitation) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-3xl text-center">Invitation unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-stone-600">We couldn&apos;t load this invitation right now.</p>
              <Button onClick={() => router.replace(`/i/${slug}`)}>Back to Guest Access</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--background)] text-[var(--foreground)] font-sans">
      <InvitationSection
        index={0}
        reduceMotion={shouldReduceMotion}
        className="relative min-h-screen w-full overflow-hidden bg-base-100 px-4 md:px-8"
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${partnerNames} wedding hero`}
            fill
            priority
            className="object-cover object-center"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-stone-900/40 to-amber-950/35" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center text-center text-white">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-100/90">Wedding Invitation</p>
          <h1 className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl md:text-7xl">{partnerNames}</h1>
          <p className="mt-6 text-lg sm:text-xl">{weddingDate}</p>
          <div className="mt-8 h-px w-40 bg-amber-200/80" />
          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="mt-10 min-h-11 rounded-full border border-amber-100/50 px-5 text-sm uppercase tracking-[0.2em] text-amber-100 transition hover:border-amber-50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/80"
            onClick={() => invitationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Scroll Down
          </motion.button>
          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
            className="mt-4 block text-amber-100/80"
          >
            v
          </motion.span>
        </div>
      </InvitationSection>

      <InvitationSection
        id="invitation-card"
        index={1}
        reduceMotion={shouldReduceMotion}
        className="bg-base-200 px-4 py-16 md:px-8 md:py-20"
      >
        <div ref={invitationRef} className="mx-auto max-w-xl">
          <Card className="rounded-lg border-amber-200/70 bg-white/95 shadow-md shadow-amber-100/40 backdrop-blur-[1px]">
            <CardHeader className="space-y-4 text-center">
              <CardTitle className="font-serif text-4xl">You&apos;re Invited</CardTitle>
              <p className="text-sm leading-7 text-stone-600">
                &ldquo;Love is patient, love is kind. It always protects, always trusts, always hopes, always
                perseveres.&rdquo;
              </p>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <h2 className="font-serif text-3xl">{partnerNames}</h2>
              <div className="space-y-2 text-sm leading-7 text-stone-700">
                <p className="font-semibold">Ceremony</p>
                <p>{weddingDate}</p>
                <p>{weddingTime}</p>
                <p>{venueName}</p>
              </div>
              <div className="space-y-2 pt-2 text-sm leading-7 text-stone-700">
                <p className="font-semibold">Reception</p>
                <p>{venueName}</p>
                <p>{venueAddress}</p>
              </div>
              <Badge className="mx-auto border border-amber-300/70 bg-amber-50 text-stone-700">
                Dress Code: {dressCode}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </InvitationSection>

      <InvitationSection index={2} reduceMotion={shouldReduceMotion} className="bg-base-100 px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-500">Wedding Program</p>
          <h2 className="mb-10 text-left font-serif text-4xl">Wedding Day Timeline</h2>
          {schedule.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-stone-600">Timeline details will be shared soon.</CardContent>
            </Card>
          ) : (
            <Timeline>
              {schedule.map((item, index) => (
                <motion.div
                  key={`${item.time}-${item.event}-${index}`}
                  whileHover={reduceMotion ? undefined : { x: 2 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="rounded-lg"
                >
                  <TimelineItem>
                    <TimelinePoint className="border-amber-300 bg-amber-100" />
                    {index < schedule.length - 1 ? <TimelineLine className="bg-amber-200" /> : null}
                    <div className="grid w-full gap-2 md:grid-cols-[180px_1fr] md:items-start">
                      <p className="text-left text-sm font-medium uppercase tracking-wide text-stone-500">
                        {item.time || "Time TBD"}
                      </p>
                      <div className="text-left">
                        <p className="font-serif text-2xl">{item.event || "Event"}</p>
                        {item.description ? <p className="mt-1 text-sm text-stone-600">{item.description}</p> : null}
                      </div>
                    </div>
                  </TimelineItem>
                </motion.div>
              ))}
            </Timeline>
          )}
        </div>
      </InvitationSection>

      <InvitationSection index={3} reduceMotion={shouldReduceMotion} className="bg-base-200 px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-500">Location</p>
          <h2 className="mb-10 text-left font-serif text-4xl">Venue</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <iframe
                  title="Venue map"
                  src={mapEmbedUrl}
                  loading="lazy"
                  className="h-72 w-full border-0 md:h-full"
                />
              </CardContent>
            </Card>
            <Card className="rounded-lg bg-white/90">
              <CardContent className="space-y-5 p-6">
                <h3 className="text-left font-serif text-3xl">{venueName}</h3>
                <p className="text-left text-sm leading-7 text-stone-600">{venueAddress}</p>
                <motion.div whileHover={reduceMotion ? undefined : { x: 2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                  <Button
                    type="button"
                    className="w-full md:w-auto"
                    onClick={() => safeExternalOpen(directionsUrl)}
                  >
                    Get Directions
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </div>
        </div>
      </InvitationSection>

      <InvitationSection
        id="rsvp-section"
        index={4}
        reduceMotion={shouldReduceMotion}
        className="bg-base-100 px-4 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-xl">
          <Card className="rounded-lg bg-white/95 shadow-md shadow-amber-100/30">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-4xl">RSVP</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {rsvpMutation.isSuccess ? (
                  <motion.div
                    key="rsvp-success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.4,
                      ease: "easeOut",
                    }}
                    className="overflow-hidden text-center"
                    aria-live="polite"
                  >
                    <p className="font-serif text-3xl text-stone-800">Thank You</p>
                    <p className="mt-3 text-sm leading-7 text-stone-600">
                      Your RSVP has been received. We can&apos;t wait to celebrate with you.
                    </p>
                    <p className="mt-4 text-sm font-medium text-stone-700">
                      Confirmation Code: {rsvpMutation.data?.confirmation_code ?? "Generated"}
                    </p>
                    <Button className="mt-6" variant="outline" onClick={() => rsvpMutation.reset()}>
                      Submit Another RSVP
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="rsvp-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.35,
                      ease: "easeOut",
                    }}
                    className="space-y-5 overflow-hidden"
                    onSubmit={form.handleSubmit(onSubmitRsvp)}
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label htmlFor="guest_name">Guest Name</Label>
                      <Input
                        id="guest_name"
                        list={groupGuests.length > 0 ? "guest-name-options" : undefined}
                        {...form.register("guest_name")}
                        placeholder="Juan Dela Cruz"
                        aria-invalid={Boolean(form.formState.errors.guest_name)}
                        aria-describedby={
                          form.formState.errors.guest_name ? "guest_name_error" : groupGuests.length > 0 ? "guest_name_help" : undefined
                        }
                      />
                      {groupGuests.length > 0 ? (
                        <>
                          <datalist id="guest-name-options">
                            {groupGuests.map((guest) => (
                              <option key={guest.id} value={guest.guest_name} />
                            ))}
                          </datalist>
                          <p id="guest_name_help" className="text-xs text-stone-500">
                            Choose your name from the guest list suggestions.
                          </p>
                        </>
                      ) : null}
                      {form.formState.errors.guest_name ? (
                        <p id="guest_name_error" role="alert" className="text-xs text-red-700">
                          {form.formState.errors.guest_name.message}
                        </p>
                      ) : null}
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Will you attend?</legend>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-3 py-2.5 text-sm transition hover:border-stone-400">
                          <input
                            type="radio"
                            value="yes"
                            {...form.register("attending")}
                            className="accent-stone-800"
                          />
                          Yes, gladly
                        </label>
                        <label className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-3 py-2.5 text-sm transition hover:border-stone-400">
                          <input
                            type="radio"
                            value="no"
                            {...form.register("attending")}
                            className="accent-stone-800"
                          />
                          Regretfully no
                        </label>
                      </div>
                      {form.formState.errors.attending ? (
                        <p role="alert" className="text-xs text-red-700">
                          {form.formState.errors.attending.message}
                        </p>
                      ) : null}
                    </fieldset>

                    <div className="space-y-2">
                      <Label>Meal Preference</Label>
                      <Select
                        value={mealValue ?? ""}
                        disabled={attendingValue === "no"}
                        onChange={(event) =>
                          form.setValue(
                            "meal_preference",
                            event.target.value === "" ? null : (event.target.value as RsvpValues["meal_preference"]),
                            { shouldValidate: true }
                          )
                        }
                        aria-invalid={Boolean(form.formState.errors.meal_preference)}
                        aria-describedby={form.formState.errors.meal_preference ? "meal_preference_error" : undefined}
                      >
                        <option value="">Select meal option</option>
                        <option value="Beef">Beef</option>
                        <option value="Fish">Fish</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Kids">Kids</option>
                      </Select>
                      {attendingValue === "no" ? (
                        <p className="text-xs text-stone-500">Meal selection is only needed if attending.</p>
                      ) : null}
                      {form.formState.errors.meal_preference ? (
                        <p id="meal_preference_error" role="alert" className="text-xs text-red-700">
                          {form.formState.errors.meal_preference.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message_to_couple">Message (Optional)</Label>
                      <Textarea
                        id="message_to_couple"
                        rows={4}
                        maxLength={500}
                        {...form.register("message_to_couple")}
                        placeholder="Share a short message for the couple..."
                      />
                      <p className="text-right text-xs text-stone-500" aria-live="polite">
                        {messageLength}/500
                      </p>
                    </div>

                    {rsvpError ? (
                      <p role="alert" className="text-sm text-red-700">
                        {rsvpError}
                      </p>
                    ) : null}

                    <Button type="submit" className="w-full" disabled={rsvpMutation.isPending}>
                      {rsvpMutation.isPending ? "Submitting..." : "Send RSVP"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </InvitationSection>

      <InvitationSection index={5} reduceMotion={shouldReduceMotion} className="w-full bg-base-200 px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center font-serif text-4xl">Gallery</h2>
          {gallery.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-stone-600">
                Photos will be shared soon.
              </CardContent>
            </Card>
          ) : (
            <div className="columns-2 gap-4 space-y-4 md:columns-3">
              {gallery.map((photo, index) => (
                <motion.button
                  key={photo.id}
                  type="button"
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className="group relative block w-full break-inside-avoid overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700/80"
                  onClick={() => setActivePhotoIndex(index)}
                >
                  <Image
                    src={photo.url}
                    alt={photo.title}
                    width={1200}
                    height={900}
                    loading="lazy"
                    className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </InvitationSection>

      <footer className="bg-base-100 px-4 py-16 text-center md:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="mx-auto h-px w-28 bg-amber-200/80" />
          <p className="font-serif text-3xl">{partnerNames}</p>
          <p className="text-sm uppercase tracking-[0.2em] text-stone-500">{weddingDate}</p>
          <p className="text-sm leading-7 text-stone-600">
            &ldquo;Two hearts, one promise, and a lifetime to celebrate together.&rdquo;
          </p>
          <p className="text-sm font-medium text-stone-700">#AlexAndJamieForever</p>
        </div>
      </footer>

      <Dialog open={activePhotoIndex !== null} onOpenChange={(open) => !open && setActivePhotoIndex(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activePhoto?.title ?? "Gallery photo"}</DialogTitle>
          </DialogHeader>
          {activePhoto ? (
            <div className="space-y-4">
              <div className="relative h-[65vh] overflow-hidden rounded-lg">
                <Image src={activePhoto.url} alt={activePhoto.title} fill className="object-contain" />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setActivePhotoIndex((current) => {
                      if (current === null) return 0;
                      return (current - 1 + gallery.length) % gallery.length;
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setActivePhotoIndex((current) => {
                      if (current === null) return 0;
                      return (current + 1) % gallery.length;
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

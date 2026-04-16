"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { BuilderCanvas } from "@/components/builder/BuilderCanvas";
import { BuilderSidebar } from "@/components/builder/BuilderSidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import { getInvitation, saveInvitationDraft } from "@/lib/invitation";
import { useBuilderStore } from "@/stores/builderStore";
import { BUILDER_SECTIONS, BuilderSectionId, WeddingDetailsDraft } from "@/types/builder";

function isWeddingDetailsSaveable(payload: WeddingDetailsDraft): boolean {
  if (
    payload.partner1_name.trim().length === 0 ||
    payload.partner2_name.trim().length === 0 ||
    payload.venue_name.trim().length === 0 ||
    payload.wedding_date.trim().length === 0
  ) {
    return false;
  }

  const date = new Date(`${payload.wedding_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date > today;
}

function sanitizeWeddingProgramForSave(payload: ReturnType<typeof useBuilderStore.getState>["weddingProgram"]) {
  return {
    schedule: payload.schedule.filter((item) => item.time.trim().length > 0 && item.event.trim().length > 0),
  };
}

function normalizeScheduleTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return value;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function normalizeHydratedSchedule(
  payload: ReturnType<typeof useBuilderStore.getState>["weddingProgram"]["schedule"] | null | undefined,
) {
  return (payload ?? []).map((item, index) => ({
    id: item.id?.trim() ? item.id : `hydrated-${index}`,
    time: normalizeScheduleTime(item.time),
    event: item.event ?? "",
    description: item.description ?? "",
  }));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.details && typeof error.details === "object") {
      const firstIssue = Object.values(error.details as Record<string, unknown>)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === "string");

      if (typeof firstIssue === "string" && firstIssue.trim().length > 0) {
        return firstIssue;
      }
    }

    if (error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function BuilderPageContent() {
  const activeSectionId = useBuilderStore((state) => state.activeSectionId);
  const sections = useBuilderStore((state) => state.sections);
  const weddingDetails = useBuilderStore((state) => state.weddingDetails);
  const weddingProgram = useBuilderStore((state) => state.weddingProgram);
  const themeDesign = useBuilderStore((state) => state.themeDesign);
  const mediaDraft = useBuilderStore((state) => state.mediaDraft);
  const hasUnsavedChanges = useBuilderStore((state) => state.hasUnsavedChanges);
  const saveState = useBuilderStore((state) => state.saveState);
  const lastSavedAt = useBuilderStore((state) => state.lastSavedAt);
  const setActiveSection = useBuilderStore((state) => state.setActiveSection);
  const updateWeddingDetails = useBuilderStore((state) => state.updateWeddingDetails);
  const updateWeddingProgram = useBuilderStore((state) => state.updateWeddingProgram);
  const updateThemeDesign = useBuilderStore((state) => state.updateThemeDesign);
  const updateMediaDraft = useBuilderStore((state) => state.updateMediaDraft);
  const updateSectionCompletion = useBuilderStore((state) => state.updateSectionCompletion);
  const hydrateBuilder = useBuilderStore((state) => state.hydrateBuilder);
  const markSaving = useBuilderStore((state) => state.markSaving);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const markSaveError = useBuilderStore((state) => state.markSaveError);

  const invitationQuery = useQuery({
    queryKey: ["invitation", "builder-hydration"],
    queryFn: getInvitation,
    staleTime: 60_000,
  });

  const sectionRefs = useRef<Partial<Record<BuilderSectionId, HTMLElement>>>({});
  const isProgrammaticScroll = useRef(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: saveInvitationDraft,
    onMutate: () => {
      setSaveErrorMessage(null);
      markSaving();
    },
    onSuccess: () => {
      setSaveErrorMessage(null);
      markSaved(new Date().toISOString());
    },
    onError: (error: unknown) => {
      setSaveErrorMessage(getErrorMessage(error, "Unable to save your invitation draft."));
      markSaveError();
    },
  });

  const updateMediaCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("media", complete);
  }, [updateSectionCompletion]);

  const updateLoveStoryCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("love-story", complete);
  }, [updateSectionCompletion]);

  const updateEntourageCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("entourage", complete);
  }, [updateSectionCompletion]);

  const updateGiftQrCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("gift-qr", complete);
  }, [updateSectionCompletion]);

  const updateGuestAccessCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("guest-access", complete);
  }, [updateSectionCompletion]);

  const updatePublishCompletion = useCallback((complete: boolean) => {
    updateSectionCompletion("publish", complete);
  }, [updateSectionCompletion]);

  const completedSections = useMemo(
    () => Object.values(sections).filter((section) => section.complete).length,
    [sections],
  );
  const builderProgress = Math.round((completedSections / BUILDER_SECTIONS.length) * 100);

  useEffect(() => {
    const invitation = invitationQuery.data?.invitation;
    if (!invitation) return;

    hydrateBuilder({
      weddingDetails: {
        partner1_name: invitation.partner1_name ?? "",
        partner2_name: invitation.partner2_name ?? "",
        wedding_date: invitation.wedding_date ?? "",
        wedding_time: invitation.wedding_time ?? "",
        venue_name: invitation.venue_name ?? "",
        venue_address: invitation.venue_address ?? "",
        dress_code: invitation.dress_code ?? "",
        dress_code_colors: invitation.dress_code_colors ?? [],
      },
      weddingProgram: {
        schedule: normalizeHydratedSchedule(invitation.schedule),
      },
      themeDesign: {
        theme_key: invitation.theme_key ?? null,
        font_pairing: invitation.font_pairing ?? null,
        template_id: invitation.template_id ?? null,
        color_palette: invitation.color_palette ?? null,
      },
      mediaDraft: {
        prenup_video_url: invitation.prenup_video_url ?? "",
        music_url: invitation.music_url ?? "",
      },
    });
  }, [hydrateBuilder, invitationQuery.data?.invitation]);

  const statusMessage = useMemo(() => {
    if (saveMutation.isPending || saveState === "saving") return "Saving draft...";
    if (saveState === "saved" && lastSavedAt) {
      return `Saved at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (saveState === "error") return "Draft needs attention.";
    if (hasUnsavedChanges && !isWeddingDetailsSaveable(weddingDetails)) return "Complete required wedding details to enable save.";
    if (hasUnsavedChanges) return "Unsaved changes pending.";
    return "No pending changes.";
  }, [hasUnsavedChanges, lastSavedAt, saveMutation.isPending, saveState, weddingDetails]);

  const executeSave = useCallback(() => {
    if (!hasUnsavedChanges || saveMutation.isPending || !isWeddingDetailsSaveable(weddingDetails)) return;

    saveMutation.mutate({
      ...weddingDetails,
      ...sanitizeWeddingProgramForSave(weddingProgram),
      ...themeDesign,
      ...mediaDraft,
    });
  }, [hasUnsavedChanges, mediaDraft, saveMutation, themeDesign, weddingDetails, weddingProgram]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      executeSave();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [executeSave]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio);

        const topMatch = visibleSections[0];
        if (!topMatch) return;

        const sectionId = topMatch.target.id as BuilderSectionId;
        setActiveSection(sectionId);
      },
      {
        root: null,
        threshold: [0.3, 0.6],
        rootMargin: "-20% 0px -55% 0px",
      },
    );

    const nodes = Object.values(sectionRefs.current);
    nodes.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [setActiveSection]);

  const setSectionRef = (sectionId: BuilderSectionId, element: HTMLElement | null) => {
    if (!element) {
      delete sectionRefs.current[sectionId];
      return;
    }

    sectionRefs.current[sectionId] = element;
  };

  const scrollToSection = (sectionId: BuilderSectionId) => {
    const element = sectionRefs.current[sectionId];
    if (!element) return;

    isProgrammaticScroll.current = true;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
  };

  const handleSectionSelect = (sectionId: BuilderSectionId) => {
    if (sectionId === activeSectionId) return;

    if (hasUnsavedChanges) {
      const shouldProceed = window.confirm(
        "You have unsaved changes. Switch sections anyway? Your draft will still auto-save in the background.",
      );

      if (!shouldProceed) return;
    }

    setActiveSection(sectionId);
    scrollToSection(sectionId);
    setIsMobileSheetOpen(false);
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-5 overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1c1917_0%,#292524_42%,#f5f5f4_42%,#fafaf9_100%)] shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-end">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-100">
              Invitation Studio
            </div>
            <div className="space-y-2">
              <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Shape the invitation your guests will remember.
              </h1>
              <p className="max-w-lg text-sm text-stone-200 sm:text-base">
                Move section by section, keep your draft synced, and build a guest experience that feels intentional from the first screen.
              </p>
            </div>
          </div>

          <Card className="border-stone-200/70 bg-white/90 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base text-stone-950">Builder Progress</CardTitle>
                <Badge className={saveState === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : hasUnsavedChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                  {statusMessage}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold text-stone-950">{builderProgress}%</p>
                  <p className="text-sm text-stone-500">{completedSections}/{BUILDER_SECTIONS.length} sections complete</p>
                </div>
                <Progress value={builderProgress} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={executeSave}
                disabled={!hasUnsavedChanges || saveMutation.isPending || !isWeddingDetailsSaveable(weddingDetails)}
              >
                {saveMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                Focus first on wedding details, then move into media, story, and publish readiness.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {saveState === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Draft save issue</AlertTitle>
          <AlertDescription>{saveErrorMessage ?? "Unable to save right now. Review your connection and try Save Draft again."}</AlertDescription>
        </Alert>
      ) : null}

      <section className="mb-4 lg:hidden">
        <Card className="border-stone-200 bg-white/95 shadow-none">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">Sections</p>
                <p className="text-sm text-stone-600">Jump between invitation areas without losing context.</p>
              </div>
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50">
                  Open Sidebar
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Builder Sections</SheetTitle>
                  </SheetHeader>
                  <BuilderSidebar activeSectionId={activeSectionId} sections={sections} onSectionSelect={handleSectionSelect} />
                  <SheetClose className="mt-4">Close</SheetClose>
                </SheetContent>
              </Sheet>
            </div>

            <Tabs value={activeSectionId} onValueChange={(value) => handleSectionSelect(value as BuilderSectionId)}>
              <TabsList>
                {BUILDER_SECTIONS.map((section) => (
                  <TabsTrigger key={section.id} value={section.id}>
                    {sections[section.id].complete ? "Complete" : "Pending"}: {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="hidden border-stone-200 bg-white/95 shadow-none lg:block">
          <CardContent className="p-3">
            <BuilderSidebar
              className="sticky top-4 h-fit"
              activeSectionId={activeSectionId}
              sections={sections}
              onSectionSelect={handleSectionSelect}
            />
          </CardContent>
        </Card>

        <BuilderCanvas
          activeSectionId={activeSectionId}
          sections={sections}
          weddingDetails={weddingDetails}
          weddingProgram={weddingProgram}
          themeDesign={themeDesign}
          mediaDraft={mediaDraft}
          onWeddingDetailsChange={updateWeddingDetails}
          onWeddingProgramChange={updateWeddingProgram}
          onThemeDesignChange={updateThemeDesign}
          onMediaDraftChange={updateMediaDraft}
          onMediaCompletionChange={updateMediaCompletion}
          onLoveStoryCompletionChange={updateLoveStoryCompletion}
          onEntourageCompletionChange={updateEntourageCompletion}
          onGiftQrCompletionChange={updateGiftQrCompletion}
          onGuestAccessCompletionChange={updateGuestAccessCompletion}
          onPublishCompletionChange={updatePublishCompletion}
          setSectionRef={setSectionRef}
        />
      </section>
    </main>
  );
}

export default function BuilderPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <BuilderPageContent />
    </QueryClientProvider>
  );
}

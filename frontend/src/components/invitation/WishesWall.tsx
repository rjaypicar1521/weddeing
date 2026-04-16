"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeDate } from "@/lib/date-utils";
import { ApiError } from "@/lib/api";
import {
  createGuestWish,
  flagGuestWish,
  getGuestWishes,
  GuestWishMutationResponse,
  GuestWishesResponse,
} from "@/lib/guest";

const wishSchema = z.object({
  guest_name: z.string().min(1, "Name is required.").max(120, "Name is too long."),
  message: z.string().min(1, "Message is required.").max(500, "Message must be 500 characters or less."),
});

type WishFormValues = z.infer<typeof wishSchema>;

interface WishesWallProps {
  canSubmitWish: boolean;
  slug: string;
}

const BRAND_BORDER = "border-[color:var(--brand-border)]";
const BRAND_SURFACE = "bg-[color:var(--brand-surface)]";
const BRAND_SOFT = "bg-[color:var(--brand-accent-soft)]";
const BRAND_PRIMARY_BUTTON = "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)] hover:opacity-95";

export function WishesWall({ canSubmitWish, slug }: WishesWallProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightWishId, setHighlightWishId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<WishFormValues>({
    resolver: zodResolver(wishSchema),
    defaultValues: {
      guest_name: "",
      message: "",
    },
  });

  const wishesQuery = useInfiniteQuery({
    queryKey: ["guest-wishes", slug],
    queryFn: ({ pageParam }) => getGuestWishes(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.has_more ? lastPage.meta.current_page + 1 : undefined),
  });

  const createMutation = useMutation<
    GuestWishMutationResponse,
    unknown,
    { guest_name: string; message: string },
    { previousData?: InfiniteData<GuestWishesResponse, number> }
  >({
    mutationFn: createGuestWish,
    onMutate: async (newWish) => {
      setErrorMessage(null);
      await queryClient.cancelQueries({ queryKey: ["guest-wishes", slug] });

      const previousData = queryClient.getQueryData<InfiniteData<GuestWishesResponse, number>>([
        "guest-wishes",
        slug,
      ]);

      queryClient.setQueryData<InfiniteData<GuestWishesResponse, number>>(
        ["guest-wishes", slug],
        (current) => {
          if (!current?.pages?.[0]) return current;

          const optimisticWish = {
            id: -Date.now(),
            guest_name: newWish.guest_name,
            message: newWish.message,
            is_flagged: false,
            created_at: new Date().toISOString(),
          };

          return {
            ...current,
            pages: [
              {
                ...current.pages[0],
                wishes: [optimisticWish, ...current.pages[0].wishes],
              },
              ...current.pages.slice(1),
            ],
          };
        },
      );

      return { previousData };
    },
    onSuccess: (response) => {
      setHighlightWishId(response.wish.id);
      form.reset();
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["guest-wishes", slug], context.previousData);
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("Unable to post wish right now.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["guest-wishes", slug] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: flagGuestWish,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guest-wishes", slug] });
    },
  });

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      const hit = entries.some((entry) => entry.isIntersecting);
      if (hit && wishesQuery.hasNextPage && !wishesQuery.isFetchingNextPage) {
        void wishesQuery.fetchNextPage();
      }
    }, { threshold: 0.2 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [wishesQuery]);

  const wishes = useMemo(() => wishesQuery.data?.pages.flatMap((page) => page.wishes) ?? [], [wishesQuery.data]);
  const isInitialLoading = wishesQuery.isLoading && wishes.length === 0;

  const onSubmit = async (values: WishFormValues) => {
    await createMutation.mutateAsync({
      guest_name: values.guest_name.trim(),
      message: values.message.trim(),
    });
  };

  return (
    <div className="space-y-5 typography-first-body">
      <Card className={`overflow-hidden ${BRAND_BORDER} bg-white/95 shadow-[0_16px_40px_rgba(0,0,0,0.06)]`}>
        <div className="h-1 w-full bg-gradient-to-r from-[color:var(--brand-primary)] via-[color:var(--brand-border)] to-[color:var(--brand-primary)]" />
        <CardHeader className="space-y-2 bg-[linear-gradient(180deg,#fafaf8,#fff)]">
          <CardTitle className="typography-first-heading uppercase text-xl tracking-[-0.03em] text-neutral-950">Wishes Wall</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--brand-muted-text)]">
            A shared space for blessings, notes, and little messages the couple can revisit long after the wedding day.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Wish error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {canSubmitWish ? (
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-1">
                  <Input placeholder="Your name" {...form.register("guest_name")} />
                  {form.formState.errors.guest_name ? <p className="text-xs text-red-700">{form.formState.errors.guest_name.message}</p> : null}
                </div>
                <div className={`rounded-2xl border ${BRAND_BORDER} ${BRAND_SOFT} px-4 py-3 text-sm leading-6 text-[color:var(--brand-muted-text)]`}>
                  Wishes become part of the couple&apos;s memory archive, so a heartfelt note goes a long way.
                </div>
              </div>
              <div className="space-y-1">
                <Textarea placeholder="Leave a message for the couple..." rows={4} {...form.register("message")} />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[color:var(--brand-muted-text)]">{(form.watch("message") ?? "").length}/500</p>
                  {form.formState.errors.message ? <p className="text-xs text-red-700">{form.formState.errors.message.message}</p> : null}
                </div>
              </div>
              <Button type="submit" className={`w-full sm:w-auto ${BRAND_PRIMARY_BUTTON}`} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Posting..." : "Leave a Wish"}
              </Button>
            </form>
          ) : (
            <div className={`rounded-2xl border ${BRAND_BORDER} ${BRAND_SURFACE} px-4 py-4 text-sm text-[color:var(--brand-muted-text)]`}>
              Submit your RSVP first to unlock the wishes wall and leave a note for the couple.
            </div>
          )}
        </CardContent>
      </Card>

      {isInitialLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`wish-skeleton-${index}`} className="mb-4 break-inside-avoid">
              <Card className={`${BRAND_BORDER} bg-white`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[92%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : wishes.length === 0 ? (
        <Card className={`${BRAND_BORDER} bg-[linear-gradient(180deg,#fff,var(--brand-surface))] shadow-sm`}>
          <CardContent className="py-10 text-center text-neutral-600">
            Be the first to leave a wish for the couple.
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {wishes.map((wish) => {
            const initials = wish.guest_name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <motion.article
                key={wish.id}
                initial={wish.id === highlightWishId ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="gpu-transform group mb-4 break-inside-avoid"
              >
                <Card className={`relative overflow-hidden ${BRAND_BORDER} bg-[linear-gradient(180deg,#fff,var(--brand-surface))] shadow-sm transition hover:shadow-[0_14px_28px_rgba(0,0,0,0.08)]`}>
                  <CardContent className="space-y-3 p-4">
                    <span className="pointer-events-none absolute -right-1 top-2 text-4xl leading-none text-[color:var(--brand-border)]/55">&rdquo;</span>
                    <div className="flex items-center gap-2">
                      <Avatar alt={wish.guest_name} fallback={initials || "G"} />
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{wish.guest_name}</p>
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--brand-muted-text)]">{formatRelativeDate(wish.created_at)}</p>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-[color:var(--brand-ink)]">&ldquo;{wish.message}&rdquo;</p>

                    <Button
                      type="button"
                      variant="outline"
                      className={`absolute right-3 top-3 h-7 ${BRAND_BORDER} bg-white/90 px-2 text-xs text-[color:var(--brand-muted-text)] opacity-100 transition-opacity hover:text-[color:var(--brand-ink)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
                      onClick={() => flagMutation.mutate(wish.id)}
                      disabled={flagMutation.isPending}
                    >
                      Report
                    </Button>
                  </CardContent>
                </Card>
              </motion.article>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {wishesQuery.isFetchingNextPage ? <p className="text-center text-sm text-[color:var(--brand-muted-text)]">Loading more wishes...</p> : null}
    </div>
  );
}

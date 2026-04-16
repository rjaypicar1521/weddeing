"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export function DashboardNavbar() {
  const pathname = usePathname();
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
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

  const user = storedUser ?? userQuery.data?.user;
  const isHydrating = !hasHydrated && !storedUser;
  const isVerified = Boolean(user?.email_verified_at);
  const planLabel = user?.plan === "premium" ? "Pro" : "Free";
  const desktopBadgeLabel = isHydrating
    ? "Loading account..."
    : isVerified
      ? `${planLabel} account verified`
      : "Email verification required";
  const mobileBadgeLabel = isHydrating ? "Loading..." : isVerified ? `${planLabel} verified` : "Verify email";

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/guests", label: "RSVPs" },
    { href: "/dashboard/guests-management", label: "Guests" },
    { href: "/dashboard/builder", label: "Builder" },
    { href: "/dashboard/billing", label: "Billing" },
    { href: "/dashboard/domain", label: "Domain" },
    { href: "/dashboard/upgrade", label: "Upgrade" },
  ];

  return (
    <header className="border-b border-[#e7c8d0]/80 bg-[linear-gradient(180deg,rgba(253,246,248,0.98),rgba(255,252,253,0.94))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a4b59] sm:text-sm">
              Wedding Online
            </Link>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[#4a1420] sm:text-xl">Couple Dashboard</p>
              <p className="max-w-2xl text-sm text-[#7b5560]">
                Track invitation progress, guest momentum, and launch readiness across desktop, tablet, and mobile screens.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-start lg:flex-col lg:items-end">
            <Badge className={cn(
              "inline-flex",
              isHydrating ? "border-[#ead7dc] bg-[#f7f1f3] text-[#8a4b59]" : isVerified ? "border-[#d8a9b6] bg-[#f7e9ee] text-[#7a1f35]" : "border-[#e7c8d0] bg-[#fbf1f4] text-[#8a4b59]",
            )}>
              <span className="sm:hidden">{mobileBadgeLabel}</span>
              <span className="hidden sm:inline">{desktopBadgeLabel}</span>
            </Badge>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e7c8d0] bg-white/85 p-2 shadow-sm">
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-center text-sm transition-colors",
                    isActive
                      ? "border-[#6f1d2b] bg-[#6f1d2b] text-white"
                      : "border-[#e7c8d0] bg-white text-[#7b5560] hover:border-[#c98b9b] hover:text-[#4a1420]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="hidden gap-2 overflow-x-auto pb-1 text-sm lg:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-2 transition-colors",
                    isActive
                      ? "border-[#6f1d2b] bg-[#6f1d2b] text-white"
                      : "border-[#e7c8d0] bg-white text-[#7b5560] hover:border-[#c98b9b] hover:text-[#4a1420]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

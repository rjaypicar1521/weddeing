# AGENTS.md — Wedding-Online
# Read this file before every task.

## Project
Filipino-first online wedding invitation platform.
Name: Wedding-Online
Stack: Next.js 15 (App Router) + Laravel 11 + MySQL + Cloudflare R2 + PayMongo + Resend

## Context Files in This Workspace
- PROJECT-CONTEXT.md         → Full rules, API reference, DB schema, env vars
- epics.md                   → All 49 stories with acceptance criteria + tech notes

## Always Do This First
1. Read PROJECT-CONTEXT.md
2. Read the relevant story from epics.md
3. Show a plan BEFORE writing any code
4. Check all acceptance criteria before marking done

## Hard Rules — Never Break These
- Conventional Commits: feat:, fix:, refactor:, docs:, chore:
- Mobile-first always: 375px → 768px → 1280px+
- React Hook Form + Zod for ALL forms
- TanStack Query for ALL API calls (no raw fetch/axios in components)
- Sanctum SPA cookie auth for couples
- Guest auth = stateless 24hr JWT
- Admin auth = Sanctum + is_admin check
- Never build V2/V3 features (see Out of Scope in PROJECT-CONTEXT.md)
- One RSVP per guest JWT token (1 per token enforced server-side)
- All images → convert to WebP via intervention/image before R2 upload
- QR codes → PNG (do NOT convert to WebP)

## Folder Structure (Strict)
Follow EXACTLY what is in PROJECT-CONTEXT.md → Repository Structure section.

## Frontend Rules
- Next.js 15 App Router only (never Pages Router)
- Server Components by default
- Client Components only when: hooks, state, browser APIs, animations needed
- Zustand for global state: authStore, builderStore, invitationStore
- shadcn/ui + Tailwind CSS only (no other UI libraries)
- Framer Motion for all animations
- Path aliases: @/components @/lib @/hooks @/stores @/types

## Backend Rules
- Laravel 11 REST API only (no Blade/Livewire)
- All routes under /api/v1/ prefix
- Form Requests for all validation
- Services for business logic (no fat controllers)
- Eloquent ORM only (no raw SQL)
- Rate limiting on all public endpoints (see PROJECT-CONTEXT.md)
- WebP conversion before every R2 upload

## Local Dev URLs
- Frontend: http://localhost:3000
- Backend:  http://localhost:8000
- Database: MySQL localhost:3306

## Current Sprint
Sprint 2 — Authentication & Onboarding
Status: Starting E-02-S01

## Sprint 2 Stories (in order)
E-02-S01 → Couple Registration
E-02-S02 → Email Verification
E-02-S03 → Couple Login & Logout
E-02-S04 → Onboarding Flow (3-step)
E-02-S05 → Dashboard Overview Page
E-02-S06 → Admin Login & Role Guard

## Deferred (Do Not Implement Yet)
- B-01: Backend hosting → deferred to pre-deployment
- B-02: Sanctum CORS for production → local config only for now
- V2/V3 features: Wedding Day Mode, Blast notifications, Seat assignment,
  Debut/Baptism events, Custom subdomains, Highlight reel, Anniversary page

## Definition of Done (Every Story)
- [ ] All acceptance criteria met
- [ ] No console errors in browser
- [ ] Mobile responsive (tested at 375px, 768px, 1280px)
- [ ] API returns correct HTTP status codes
- [ ] Basic error handling implemented (user-facing messages)
- [ ] Committed with Conventional Commits format
- [ ] No hardcoded credentials or API keys

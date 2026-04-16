---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - c:\Users\Asus\Desktop\WEDDING\PROJECT-CONTEXT.md
---

# WEDDING INV AND PLANNER - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for WEDDING INV AND PLANNER, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system must allow couple account registration, login, logout, and email verification/resend flows.
FR2: The system must allow each authenticated couple user to create and manage exactly one invitation with wedding core details (names, date/time, venue, dress code, schedule, theme, media links).
FR3: The system must support invitation publish, unpublish, and preview workflows.
FR4: The system must generate and manage a unique invitation slug and a unique 6-character guest access code, including guest code regeneration.
FR5: The system must provide couple-side CRUD and reorder for entourage members.
FR6: The system must provide couple-side CRUD and reorder for love story chapters.
FR7: The system must support media upload/list/delete with Cloudflare R2 storage and DB tracking, including hero, gallery, entourage, chapter, and QR assets.
FR8: The system must provide code-gated guest access: validate guest code, issue 24-hour guest token, and fetch invitation data via guest token.
FR9: The guest invitation experience must render a cinematic, section-based invitation page in the defined section order.
FR10: The system must provide a multi-step RSVP flow for guests and enforce one RSVP per guest token.
FR11: The system must generate and return RSVP confirmation data for boarding-pass style confirmation display.
FR12: The system must allow guests to view and submit wishes on the wishes wall.
FR13: The couple dashboard must support RSVP management including list, stats, export, manual add, edit, and delete.
FR14: The system must integrate PayMongo checkout, webhook processing, and plan/status retrieval.
FR15: The system must provide admin capabilities for platform stats, event/user listing, plan changes, user suspension, storage monitoring, and flagged wishes review.
FR16: The system must enforce freemium feature gating (template access, storage limits, premium-only features).

### NonFunctional Requirements

NFR1: The solution must use the prescribed tech stack (Next.js 15 App Router frontend, Laravel 11 backend, MySQL 8, Sanctum, R2, PayMongo, Resend) without stack substitutions.
NFR2: Authentication and authorization must follow dual-mode architecture: Sanctum SPA cookie auth for couples/admin and stateless JWT for guests.
NFR3: Security controls must include CSRF handling for SPA auth, signed webhook validation for payments, and role-based admin enforcement.
NFR4: API endpoints must apply defined rate limits for login, guest code validation, RSVP submission, wishes submission, and media uploads.
NFR5: Storage usage must be quota-enforced by plan (Free 50MB, Premium 500MB).
NFR6: Invitation URLs must remain permanently resolvable (non-expiring invitation access; archival is status-based, not hard expiry).
NFR7: Uploaded media must be transformed/formatted according to rules (WebP conversion except QR PNG) and served via CDN path conventions.
NFR8: Frontend and invitation experience must support responsive behavior across mobile and desktop layouts.
NFR9: Data model integrity must enforce uniqueness and business constraints (slug uniqueness, guest code uniqueness, RSVP uniqueness per token context).
NFR10: Delivery workflow must maintain repository conventions, component boundaries, and conventional commit standards.

### Additional Requirements

- Repository structure must follow the defined monorepo split with `frontend/` (Next.js app) and `backend/` (Laravel API), plus `docs/` artifacts.
- Frontend app routes and component folders must align with defined domain partitions: marketing/auth/dashboard/admin and guest invitation route `i/[slug]`.
- Backend controller and middleware namespaces must align with domain-specific modules (Auth, Couple, Guest, Admin, Payment; validation and quota middleware).
- API contract surface is pre-defined by endpoint inventory and should be preserved for implementation planning.
- Database schema is pre-defined by target tables and key columns and must drive story decomposition.
- Guest invitation page section order is explicitly defined and must be treated as implementation contract.
- RSVP form flow is explicitly defined as a 4-step sequence and must be implemented exactly in that order.
- Builder sidebar section order and capabilities are explicitly defined and must be preserved.
- Backend hosting platform decision (Railway/Render/Forge) remains unresolved and is a planning blocker for deployment stories.
- Sanctum CORS/cookie domain configuration remains unresolved and must be treated as an explicit dependency/risk in story planning.

### FR Coverage Map

FR1: Epic 1 - Couple authentication lifecycle and verified access
FR2: Epic 1 - One-invitation-per-user setup and core detail management
FR3: Epic 4 - Publish/unpublish/preview operations
FR4: Epic 1 - Slug and guest-code generation/regeneration
FR5: Epic 2 - Entourage CRUD and ordering
FR6: Epic 2 - Love story CRUD and ordering
FR7: Epic 2 - Media pipeline with R2 and storage controls
FR8: Epic 3 - Guest code validation and invitation retrieval
FR9: Epic 3 - Full guest invitation experience rendering
FR10: Epic 3 - Multi-step RSVP with one-submission enforcement
FR11: Epic 3 - Boarding pass confirmation payload and display
FR12: Epic 3 - Wishes wall retrieval and submission
FR13: Epic 4 - RSVP management tools for couples
FR14: Epic 4 - Payment checkout, webhook, and plan status
FR15: Epic 5 - Admin platform and moderation operations
FR16: Epic 2 and Epic 4 - Feature/storage gating and premium access behavior

## Epic List

### Epic 1: Couple Account Onboarding and Invitation Setup
Couples can register, verify, authenticate, and initialize a single invitation with stable identity and access controls.
**FRs covered:** FR1, FR2, FR4

### Epic 2: Invitation Builder Content and Media Management
Couples can build complete invitation content using structured sections, ordered content blocks, and managed media assets with quota-aware controls.
**FRs covered:** FR5, FR6, FR7, FR16 (builder scope)

### Epic 3: Guest Invitation Experience, Access, and RSVP
Guests can securely access invitations, view the complete event story, RSVP through a guided flow, and leave wishes.
**FRs covered:** FR8, FR9, FR10, FR11, FR12

### Epic 4: Couple Publishing, RSVP Operations, and Billing
Couples can publish and operate live invitations, manage RSVP data, and handle plan/billing upgrades.
**FRs covered:** FR3, FR13, FR14, FR16 (billing scope)

### Epic 5: Admin Oversight and Platform Controls
Admins can monitor and control users, invitations, storage, plans, and moderation queues.
**FRs covered:** FR15

## Epic 1: Couple Account Onboarding and Invitation Setup

Deliver secure couple onboarding and invitation bootstrap capabilities so each account can own and manage exactly one invitation foundation.

### Story 1.1: Register Couple Account with Email Verification Trigger

As a couple creating an invitation,
I want to register my account and receive a verification email,
So that I can securely access the platform.

**Acceptance Criteria:**

**Given** a new visitor submits valid registration details
**When** the registration request is processed
**Then** a user account is created in pending-verification state
**And** a verification email is sent using configured mail provider.

**Given** registration data violates validation or uniqueness rules
**When** the API receives the request
**Then** the request is rejected with field-level validation errors
**And** no account is created.

### Story 1.2: Couple Login, Logout, and Authenticated User Retrieval (Sanctum)

As a verified couple,
I want to log in and maintain an authenticated session,
So that I can securely access protected dashboard endpoints.

**Acceptance Criteria:**

**Given** a verified user provides valid credentials
**When** login is submitted after CSRF cookie setup
**Then** a Sanctum session cookie is issued
**And** `/auth/user` returns the authenticated profile.

**Given** an authenticated user logs out
**When** `/auth/logout` is called
**Then** the session is invalidated
**And** subsequent protected requests return unauthorized.

### Story 1.3: Enforce One-Invitation-Per-User with Invitation Bootstrap

As an authenticated couple,
I want to create my initial invitation record once,
So that my event has a persistent editable foundation.

**Acceptance Criteria:**

**Given** an authenticated user without an invitation
**When** `/invitation` create is called with minimal required fields
**Then** a single invitation is created and linked to the user
**And** default status is set to draft.

**Given** an authenticated user already has an invitation
**When** create is called again
**Then** the API blocks duplicate creation
**And** returns a clear one-invitation constraint error.

### Story 1.4: Generate and Regenerate Invitation Slug and Guest Code

As a couple,
I want a permanent invitation slug and manageable guest access code,
So that I can share one URL while controlling guest entry.

**Acceptance Criteria:**

**Given** a new invitation is created
**When** identity fields are generated
**Then** a unique slug and unique 6-character non-ambiguous guest code are assigned
**And** uniqueness is enforced at persistence level.

**Given** an existing invitation owner requests code refresh
**When** `/invitation/regenerate-code` is called
**Then** a new unique guest code is generated and persisted
**And** previous code is invalidated for future guest validation.

### Story 1.5: Update Core Wedding Details for Invitation

As a couple,
I want to update core wedding details in draft state,
So that my invitation reflects accurate event information.

**Acceptance Criteria:**

**Given** an authenticated invitation owner submits valid update payload
**When** `/invitation` update is called
**Then** wedding details (names/date/time/venue/dress code/schedule/theme/media links) are saved
**And** response returns current invitation state.

**Given** invalid field formats or missing required values
**When** update is processed
**Then** validation errors are returned
**And** existing persisted invitation data remains unchanged.

## Epic 2: Invitation Builder Content and Media Management

Enable couples to author rich invitation content with reorderable storytelling and controlled media operations.

### Story 2.1: Manage Entourage Members (Create, List, Update, Delete)

As a couple,
I want to manage entourage members and roles,
So that guests can view the wedding party accurately.

**Acceptance Criteria:**

**Given** an invitation owner submits entourage member data
**When** create endpoint is called
**Then** member is stored with role and sort order context
**And** list endpoint returns all members for that invitation only.

**Given** an owner updates or deletes a member
**When** corresponding endpoint is called
**Then** only that invitation’s member is modified
**And** unauthorized cross-invitation access is denied.

### Story 2.2: Reorder Entourage Members

As a couple,
I want to reorder entourage entries,
So that displayed sequence matches our ceremony flow.

**Acceptance Criteria:**

**Given** a valid ordered list of entourage IDs for the invitation
**When** `/entourage/reorder` is called
**Then** persisted sort orders are updated in that exact order
**And** subsequent list calls return the new sequence.

**Given** the reorder list includes missing/foreign IDs
**When** the API validates the payload
**Then** the request is rejected
**And** existing order remains unchanged.

### Story 2.3: Manage Love Story Chapters (Create, List, Update, Delete)

As a couple,
I want to author love story chapters,
So that we can present our timeline to guests.

**Acceptance Criteria:**

**Given** valid chapter content and date metadata
**When** chapter create is called
**Then** the chapter is saved and linked to invitation
**And** chapter list returns invitation-scoped records.

**Given** update or delete is requested for a chapter
**When** ownership checks pass
**Then** requested mutation succeeds
**And** non-owner access is blocked.

### Story 2.4: Reorder Love Story Chapters

As a couple,
I want to reorder timeline chapters,
So that the story appears in the intended chronology.

**Acceptance Criteria:**

**Given** ordered chapter IDs belonging to the invitation
**When** `/love-story/reorder` is called
**Then** sort orders are updated atomically
**And** timeline retrieval uses the new order.

**Given** invalid reorder payload
**When** validation fails
**Then** no partial reordering occurs
**And** an error response explains the issue.

### Story 2.5: Upload, List, and Delete Media with R2 Storage Rules

As a couple,
I want to manage invitation media files,
So that my invitation has hero, gallery, and section visuals.

**Acceptance Criteria:**

**Given** a supported media upload request within quota
**When** `/media/upload` is called
**Then** files are transformed to WebP (except QR PNG), uploaded to R2, and indexed in `media_files`
**And** user storage usage is updated.

**Given** a media delete request for owned media
**When** `/media/{id}` delete is called
**Then** the file is removed from R2 and DB metadata is deleted
**And** storage usage is decremented accordingly.

### Story 2.6: Enforce Builder Freemium Constraints (Templates and Storage)

As a free-plan couple,
I want clear plan-based limits while using the builder,
So that I know which features require upgrade.

**Acceptance Criteria:**

**Given** a free user accesses template selection
**When** selecting premium templates
**Then** premium templates are blocked with upgrade messaging
**And** free template remains selectable.

**Given** upload actions exceed plan quota
**When** `CheckStorageQuota` validation runs
**Then** the upload is rejected
**And** response includes current usage and plan limit context.

## Epic 3: Guest Invitation Experience, Access, and RSVP

Provide secure and delightful guest-facing flows from access code entry through RSVP confirmation and wishes posting.

### Story 3.1: Validate Guest Code and Issue Guest JWT

As a guest,
I want to enter a code to access the invitation,
So that only invited people can view event details.

**Acceptance Criteria:**

**Given** a valid active guest code
**When** `/guest/validate-code` is called
**Then** API returns a guest JWT with 24-hour expiry
**And** token contains invitation-scoped claims for downstream endpoints.

**Given** an invalid or rate-limited validation request
**When** code validation runs
**Then** request is denied with safe error messaging
**And** no guest token is issued.

### Story 3.2: Render Guest Invitation Page in Required Section Order

As a guest,
I want to view a complete, structured invitation experience,
So that I can understand event details and flow naturally.

**Acceptance Criteria:**

**Given** a valid guest token
**When** invitation data is fetched from `/guest/invitation`
**Then** frontend renders all required sections in the specified order (intro through wishes wall)
**And** unavailable optional sections degrade gracefully.

**Given** mobile or desktop viewport
**When** the page is rendered
**Then** layout remains readable and usable across breakpoints
**And** critical actions (RSVP, map links, wishes) remain accessible.

### Story 3.3: Submit Multi-Step RSVP with One-Per-Token Enforcement

As a guest,
I want to RSVP through a guided step flow,
So that I can submit attendance details accurately.

**Acceptance Criteria:**

**Given** a guest proceeds through RSVP steps with valid data
**When** `/guest/rsvp` is submitted
**Then** RSVP is saved with required/optional fields per attendance branch
**And** confirmation code is generated and returned.

**Given** a token that already submitted RSVP
**When** submit is attempted again
**Then** request is blocked as duplicate
**And** `/guest/rsvp` status endpoint reflects prior submission.

### Story 3.4: Display Boarding Pass Confirmation After RSVP

As a guest,
I want to see a boarding-pass style confirmation,
So that I have confidence my RSVP was received.

**Acceptance Criteria:**

**Given** RSVP is successfully submitted
**When** client receives API response
**Then** boarding-pass confirmation is rendered with confirmation code and key RSVP details
**And** presentation supports refresh-safe retrieval from RSVP status endpoint.

**Given** RSVP submission fails
**When** client handles the error
**Then** confirmation view is not shown
**And** actionable validation or retry guidance is displayed.

### Story 3.5: View and Submit Wishes on Wishes Wall

As a guest,
I want to leave a wish message,
So that I can share support and memories with the couple.

**Acceptance Criteria:**

**Given** a valid guest token and wish payload
**When** `/guest/wishes` post is called
**Then** wish is stored for the invitation
**And** guest can see wishes list including newly added message.

**Given** posting limits or validation rules are exceeded
**When** submission is processed
**Then** request is denied with clear error details
**And** existing wishes remain unchanged.

## Epic 4: Couple Publishing, RSVP Operations, and Billing

Enable couples to operate invitations as live products with publication controls, RSVP analytics/exports, and payment-backed plan changes.

### Story 4.1: Publish, Unpublish, and Preview Invitation

As a couple,
I want to control invitation visibility and preview output,
So that I can safely launch and iterate event content.

**Acceptance Criteria:**

**Given** a draft invitation owned by the user
**When** `/invitation/publish` is called
**Then** status transitions to published with `published_at`
**And** guest access uses current published state.

**Given** a published invitation
**When** unpublish is requested
**Then** status changes back to draft
**And** preview endpoint still returns full guest-view payload for owner.

### Story 4.2: View RSVP List, Filters, and Summary Stats

As a couple,
I want to monitor RSVP responses and attendance signals,
So that I can plan logistics with current guest data.

**Acceptance Criteria:**

**Given** invitation RSVPs exist
**When** `/rsvps` and `/rsvps/stats` are called by owner
**Then** paginated response list and aggregate counts are returned
**And** filters/search apply consistently.

**Given** unauthorized user requests another invitation’s RSVPs
**When** authorization checks run
**Then** access is denied
**And** no RSVP data is leaked.

### Story 4.3: Export and Manually Manage RSVP Records

As a couple,
I want to export and manually maintain RSVP entries,
So that I can reconcile guest data from online and offline channels.

**Acceptance Criteria:**

**Given** owner requests RSVP export
**When** `/rsvps/export` is called
**Then** CSV file is generated with required RSVP fields
**And** exported data matches filtered/authorized invitation scope.

**Given** owner adds/edits/deletes manual RSVP entries
**When** `/rsvps` mutate endpoints are used
**Then** changes persist correctly with validation
**And** stats/list endpoints reflect updates.

### Story 4.4: Integrate PayMongo Checkout and Webhook Plan Activation

As a couple,
I want to upgrade via secure checkout,
So that premium capabilities activate after successful payment.

**Acceptance Criteria:**

**Given** authenticated user initiates upgrade
**When** `/payment/create-checkout` is called
**Then** PayMongo checkout URL is returned and transaction is tracked.

**Given** PayMongo sends webhook event
**When** signature verification passes and payment is successful
**Then** subscription record is updated
**And** user plan/entitlements are activated and visible in `/payment/status`.

### Story 4.5: Apply Premium Entitlements Across Builder and Invitation Features

As a couple on different plans,
I want feature behavior to match my entitlement state,
So that premium value is consistent and predictable.

**Acceptance Criteria:**

**Given** plan state changes from payment or admin action
**When** protected premium features are accessed (prenup video, premium templates, expanded storage)
**Then** access is granted or denied according to current plan
**And** API/frontend behavior is consistent.

**Given** free-plan access to premium-only action
**When** request is attempted
**Then** action is blocked with upgrade guidance
**And** no partial premium state is applied.

## Epic 5: Admin Oversight and Platform Controls

Provide administrative visibility and control capabilities needed for safe platform operations and moderation.

### Story 5.1: Secure Admin Access and Platform KPI Dashboard

As an admin,
I want restricted admin access and summary platform metrics,
So that I can monitor system health and business activity.

**Acceptance Criteria:**

**Given** an authenticated user with `is_admin=true`
**When** `/admin/stats` is requested
**Then** platform overview metrics are returned
**And** non-admin users receive forbidden response.

**Given** admin session is absent or invalid
**When** admin endpoints are called
**Then** request is unauthorized
**And** no admin data is returned.

### Story 5.2: Admin User and Event Operations (List, Plan Change, Suspend)

As an admin,
I want to manage users and event records,
So that I can enforce platform policy and support account lifecycle.

**Acceptance Criteria:**

**Given** admin requests user/event listings
**When** `/admin/users` or `/admin/events` is called
**Then** paginated records are returned with key operational fields
**And** filters/sorting behave consistently.

**Given** admin updates user plan or suspends an account
**When** corresponding admin endpoint is called
**Then** change is persisted with audit-friendly metadata
**And** downstream access behavior reflects the update.

### Story 5.3: Admin Storage Monitoring and Flagged Wishes Review

As an admin,
I want visibility into storage consumption and flagged content,
So that I can maintain cost controls and content quality.

**Acceptance Criteria:**

**Given** admin requests storage report
**When** `/admin/storage` is called
**Then** per-user usage and limits are returned
**And** data supports identification of quota outliers.

**Given** flagged wishes exist
**When** `/admin/flags` is called
**Then** flagged messages are listed for moderation workflow
**And** access is restricted to admins only.



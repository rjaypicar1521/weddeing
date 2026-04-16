# Guest View Access Constraint

## Context
Guest users sometimes open `/i/{slug}/view` directly without a valid `guest_token` in `sessionStorage`.  
Current behavior can trigger unauthorized guest API requests (`401`) before redirect completes, which may present as a temporary blank/empty DOM.

## Implementation Plan
1. Add a strict access-state gate in invitation view rendering:
   - `checking` -> show skeleton
   - `granted` -> enable guest invitation query + render full view
   - `denied` -> render explicit fallback + redirect to `/i/{slug}`
2. Prevent `GET /guest/invitation` from firing until access is validated.
3. Validate `guest_token` at runtime before query execution.
4. Keep UX graceful for expired/missing tokens with visible fallback message and action button.

## Task-Todo
- [ ] Introduce access-state guard in `InvitationView`.
- [ ] Add runtime validation schema for guest token.
- [ ] Add `enabled` constraint to guest invitation query.
- [ ] Add denied-access fallback UI.
- [ ] Verify behavior with Playwright for:
  - `/i/{slug}` normal access flow
  - `/i/{slug}/view` without token
  - `/i/{slug}/view` with valid token

## Boilerplate for Accuracy
```ts
type GuestViewAccessState = 'checking' | 'granted' | 'denied';

const guestTokenSchema = z
  .string()
  .trim()
  .refine((value) => isPlausibleJwt(value), { message: 'Invalid guest token format.' });
```

```ts
const invitationQuery = useQuery({
  queryKey: ['guest-invitation', slug],
  queryFn: getGuestInvitation,
  retry: false,
  enabled: accessState === 'granted',
});
```

## Zod Schema
```ts
const guestTokenSchema = z
  .string()
  .trim()
  .refine((value) => isPlausibleJwt(value), {
    message: 'Invalid guest token format.',
  });
```

## Automated Tests
- Playwright DOM checks:
  - Direct `/view` without token redirects to `/i/{slug}` and shows access entry screen.
  - `/view` with token renders invitation sections in order.
  - No unauthorized `GET /guest/invitation` request should fire before token validation.

## Error Boundaries
- For denied access state, render a user-facing fallback panel:
  - Message: session expired / missing access token.
  - Action: return to guest code entry.

## Zustand + JSON
- No new global store is required for this constraint.
- Existing JSON session mechanism remains source-of-truth:
  - `sessionStorage['guest_token']`
  - `sessionStorage['intro_seen_{slug}']`

# RSVP & Wishes First Typography Constraint

## Context
The invitation experience should keep typography consistent for guest-facing RSVP and Wishes sections.  
Current RSVP and Wishes components mix generic serif classes and default text styles, which can drift from the intended first typography pairing.

## Implementation Plan
1. Define reusable typography tokens for the first pairing:
   - Heading: `Playfair`
   - Body: `Inter` with project-safe fallback chain
2. Wire typography token availability at app root (`next/font` variable).
3. Apply typography tokens to:
   - `RSVPForm`
   - `WishesWall`
4. Keep all behavior/API logic untouched; this is visual consistency only.

## Task-Todo
- [x] Add `Inter` font variable to app layout.
- [x] Add reusable global classes for first typography heading/body.
- [x] Update RSVP component heading/body typography classes.
- [x] Update Wishes component heading/body typography classes.
- [x] Run lint.
- [ ] Verify DOM rendering on invitation page (blocked: local `localhost:3000` does not return a DOM response in this session).

## Boilerplate for Accuracy
```css
.typography-first-body {
  font-family: var(--font-inter), var(--font-jost), "Segoe UI", sans-serif;
}

.typography-first-heading {
  font-family: var(--font-playfair), Georgia, "Times New Roman", serif;
}
```

```tsx
<CardTitle className="typography-first-heading ...">RSVP Journey</CardTitle>
```

## Zod Schema
- No new runtime payloads, forms, or API contracts were introduced for this constraint.
- Existing RSVP/Wish Zod schemas remain unchanged and continue to govern validation.

## Automated Tests
- Static checks:
  - `npm run lint` passes in `frontend`.
- DOM verification:
  - Invitation view renders RSVP and Wishes headings with first typography classes.
  - Layout remains responsive at 375px, 768px, and 1280px.

## Error Boundaries
- No new rendering risk surface was introduced.
- Existing component and page-level fallback behavior remains unchanged.

## Zustand + JSON
- No new Zustand store is required.
- No new JSON persistence/serialization flow is required for this typography constraint.

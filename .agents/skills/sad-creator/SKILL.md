---
name: sad-creator
description: Create and maintain Software Architecture Documents (SAD) for software projects. Use when a user asks to draft, update, review, or validate a SAD, convert requirements or an existing codebase into architecture documentation, or align implementation details with architectural decisions.
---

# SAD Creator

## Collect Inputs
1. Gather project name, goals, non-goals, target users, constraints, and environment.
2. Gather technology stack, major integrations, and deployment model.
3. Gather known quality attributes: security, performance, reliability, and scalability.
4. Gather any existing artifacts: PRD, README, diagrams, and source folders.

## Build SAD Structure
1. Write an architecture summary with key decisions and rationale.
2. Define context, containers/services, and major components.
3. Define data model boundaries, API boundaries, and external dependencies.
4. Define cross-cutting concerns: auth, observability, error handling, testing, and release strategy.
5. Define risks, tradeoffs, and open questions.

## Produce Deliverables
1. Produce `SAD.md` with clear section headings and decision records.
2. Include a short "Assumptions" section when information is missing.
3. Include a "Decision Log" table with decision, rationale, and impact.
4. Include a "Next Actions" list prioritized by implementation risk.

## Review and Update Loop
1. Validate consistency between stack, components, and deployment sections.
2. Flag contradictions and unresolved assumptions explicitly.
3. Update the SAD incrementally as requirements or implementation change.
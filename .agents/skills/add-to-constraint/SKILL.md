---
name: add-to-constraint
description: "A spec-driven skill for implementing new constraints or features with high precision, including Zod schemas, Zustand stores, and automated tests."
---

# Add to Constraint Skill

This skill provides a structured workflow for adding new constraints, data models, or features to the project. It ensures high accuracy by requiring a spec-driven markdown file before implementation.

## Workflow

When this skill is invoked with the prompt "add to constraint : [Insert prompt]", follow these steps:

1.  **Generation**: Create a spec-driven markdown file (e.g., `feature_spec.md`) in the `docs/specs` or project artifacts directory.
2.  **Required Sections**:
    - **Implementation Plan**: Detailed technical approach.
    - **Task-Todo**: Granular checklist for the implementation.
    - **Boilerplate for Accuracy**: Pre-defined code structures to maintain consistency.
    - **Zod Schema**: Mandatory runtime validation for all data structures.
    - **Automated Tests**: Unit and integration tests using `vitest`.
    - **Error Boundaries**: React Error Boundary components for the feature.
    - **Zustand + JSON**: State management using Zustand with JSON persistence/serialization.

3.  **Strict Typing**: Ensure no `any` is used. Adhere to the project's strict `tsconfig.json` settings.

4.  **Verification**: All implemented code must pass the generated automated tests.

## Usage Example

Prompt: `add to constraint : user preferences for theme and notification settings`

Execution:
1.  Analyze the prompt.
2.  Generate `user_preferences_spec.md` with:
    - Zod schema for `Theme` and `Notifications`.
    - Zustand store `useUserPreferences`.
    - Vitest test cases.
    - Error boundary wrapper.
    - Implementation plan and task list.

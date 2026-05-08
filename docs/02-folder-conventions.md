# 02 — Folder & Code Conventions

> **Goal:** Keep custom Platinum Micro code clearly separated from upstream Catalyst code so that future Catalyst upgrades are merge-friendly.

## Where Platinum Micro custom code lives

We follow a **`pm-` prefix convention** for everything we add, so it's instantly recognizable in any directory listing.

```
core/
├── app/[locale]/(default)/
│   ├── page.tsx                    # ← Catalyst homepage (we customize this)
│   ├── pm-who-we-serve/            # ← Our custom routes get pm- prefix
│   │   └── [segment]/page.tsx
│   ├── pm-bulk-order/page.tsx
│   └── pm-quote/page.tsx
│
├── components/
│   ├── header/                     # ← Catalyst stock components (we may override)
│   ├── footer/
│   ├── pm-utility-bar/             # ← Our custom components get pm- prefix
│   │   └── pm-utility-bar.tsx
│   ├── pm-categories-rail/
│   ├── pm-quote-button/
│   ├── pm-contract-badge/
│   └── pm-brands-strip/
│
└── lib/
    ├── pm-brand.ts                 # Brand color tokens
    ├── pm-segments.ts              # "Who We Serve" segment data
    └── pm-contracts.ts             # OMNIA / NASPO contract metadata
```

## Why prefix instead of a separate folder?

We considered putting everything under `core/app/_pm/` or similar, but:
- Next.js App Router resolves routes by directory structure — putting custom routes in `_pm` would require additional routing config
- Catalyst's existing import patterns rely on relative paths within `core/`
- The `pm-` prefix keeps custom code searchable (`grep -r "pm-"`) and visually distinct without breaking conventions

## Naming rules

- **Routes**: `pm-{kebab-name}` (e.g., `pm-who-we-serve`, `pm-bulk-order`)
- **Components**: `pm-{ComponentName}` folder, exporting the component from a same-named file (e.g., `pm-utility-bar/pm-utility-bar.tsx`)
- **Utilities**: `pm-{name}.ts` in `lib/` (e.g., `pm-brand.ts`)
- **Types**: `pm-{name}.types.ts` colocated with the consuming code

## Imports

Use Catalyst's existing alias pattern:
```ts
import { PmUtilityBar } from '~/components/pm-utility-bar/pm-utility-bar';
import { brand } from '~/lib/pm-brand';
```

## What we do NOT modify (without good reason)

- `core/auth/` — Auth.js config (touch only when adding new providers)
- `core/client/` — GraphQL client setup
- `core/lib/translations.ts` — i18n machinery
- `core/data-transformers/` — These map BC's GraphQL responses to component props; touch sparingly

If we MUST modify upstream Catalyst code, add a comment block at the top:

```ts
// PM-MODIFIED: <one-line reason>
// Original: see git history
```

This makes future Catalyst upgrades easier — search for `PM-MODIFIED` to find every divergence.

## Component structure (one file per component, plus index)

```
pm-utility-bar/
├── pm-utility-bar.tsx           # The component (named export)
├── pm-utility-bar.types.ts      # Component prop types
├── pm-utility-bar.stories.tsx   # (optional) Storybook stories
└── index.ts                     # Re-exports for clean imports
```

Why split: easier for multiple devs to work in parallel, less merge churn.

## Code style

- **No comments unless explaining WHY** (not WHAT) — code should be self-documenting
- **No "TODO" comments** — file an issue or add to docs/
- **Tailwind** for all styling — no CSS-in-JS, no .module.css unless absolutely necessary
- **Server Components by default**, mark `'use client'` only when needed (interactivity, hooks, browser APIs)
- **TypeScript strict mode** — no `any`, no `// @ts-ignore`

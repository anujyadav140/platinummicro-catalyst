# 04 — Mega-menu hover state + admin-folder filter

Two related fixes for the primary nav:

1. Filter out admin-only BC categories (the `PM …` storage folders that hold banner/footer config) so they never leak into the customer-facing nav.
2. Repair the mega-menu hover state machine so the panel closes when the mouse actually leaves it.

## Files changed

- `core/lib/pm-categories-fetcher.ts` — added `isAdminFolder()` predicate, applied to the top-level loop.
- `core/lib/pm-mega-menu-fetcher.ts` — added the same `isAdminFolder()` predicate, applied to both passes that walk the tree (the per-id details fetch and the menu-assembly loop).
- `core/components/pm-header/pm-header.tsx` — added `closeNow()` and `cancelClose()` helpers, wired `onMouseLeave` on each nav link, and rewired the panel handlers to use the new helpers. Escape now goes through `closeNow()` instead of poking state directly.

No changes to:

- `core/lib/pm-categories.ts` (the static fallback list never had admin folders in it; no change needed).
- `core/lib/pm-mega-menu-context.tsx` (no new context fields needed — the filter happens upstream in the fetchers).

## The `PM ` admin-folder convention

### What it matches

Any top-level BC category whose **name starts with `"PM "`** (capital P, capital M, single space). Exact-prefix on purpose — a future legitimate category like `"PMP Devices"` won't be hidden accidentally.

Currently in BC under this convention:

- `PM Page Banners` (parent)
  - `PM Home Page Banners`
  - `PM Search Page Banners`
  - `PM Footer`

These exist only so the team can edit banner copy and footer settings from BC admin (parsed out of the category Description field). They should never appear in customer-facing UI.

### Where the filter lives

In the **fetchers**, not in the components. Two places, kept in sync:

```ts
// core/lib/pm-categories-fetcher.ts
function isAdminFolder(top: { name: string }): boolean {
  return top.name.startsWith('PM ');
}
```

```ts
// core/lib/pm-mega-menu-fetcher.ts
function isAdminFolder(top: { name: string }): boolean {
  return top.name.startsWith('PM ');
}
```

In `pm-categories-fetcher.ts` it's applied right next to the existing `isBrandTree` check inside the top-level loop. In `pm-mega-menu-fetcher.ts` it's applied to both loops that iterate `tree` (the entityId collection pass and the per-top-level menu-assembly pass). The `BRAND` subtree pass that builds the partner-brand rail does NOT need this check, because it explicitly looks for `isBrandTree(top)` first.

### Why centralized in the fetcher

`fetchPmCategories()` and `fetchPmMegaMenu()` are the single sources of truth for nav data — every downstream consumer (header rail, mega-menu dropdown, homepage CategoryStrip, footer Catalog column, sitemap, etc.) reads from one of these via `PmNavProvider` context. Hiding admin folders at the fetcher level means every consumer automatically gets the same exclusion without remembering to filter case-by-case. Adding a new admin folder in BC (e.g. `PM Promotions`) requires zero code changes.

## The mega-menu hover state machine

### Timer constants

```ts
const HOVER_OPEN_DELAY = 100;   // ms before a hovered nav item opens its panel
const HOVER_CLOSE_DELAY = 120;  // ms grace after mouse leaves before panel closes
```

The open delay is short enough to feel responsive but long enough to skim past a chevron item without flashing the panel. The close grace lets the mouse cross the small gap between the nav link and the panel without the menu collapsing under it.

### Helpers

| Helper | Effect |
| --- | --- |
| `scheduleOpen(key)` | Clears any pending close + pending open; schedules `setOpenKey(key)` after `HOVER_OPEN_DELAY`. |
| `scheduleClose()` | Clears any pending open; schedules `setOpenKey(null)` after `HOVER_CLOSE_DELAY`. |
| `cancelClose()` | Clears the pending close timer (only) — used when the mouse re-enters the panel during the grace window. |
| `closeNow()` | Clears both timers and sets `openKey = null` synchronously. Used by Escape and by hovering a nav item with no mega (so a stale `scheduleOpen` can't re-open the menu after we decided to close it). |

### onMouseEnter / onMouseLeave wiring

| Element | onMouseEnter | onMouseLeave |
| --- | --- | --- |
| `<header>` (root) | — | `scheduleClose` (mouse left header entirely → close with grace) |
| Each nav `<Link>` with a mega | `scheduleOpen(cat.key)` | `scheduleClose` |
| Each nav `<Link>` WITHOUT a mega | `closeNow` (close whatever was open + cancel pending opens) | `scheduleClose` |
| Mega panel `<div>` | `cancelClose` (mouse arrived from a nav link during grace → keep it open) | `scheduleClose` (mouse left the panel → close with grace) |

### Escape key

`Escape` calls `closeNow` so an in-flight `scheduleOpen` can't fire later and reopen the menu after the user explicitly dismissed it.

### Walkthrough of the six required paths

1. **Mouse enters a nav item with a mega menu** → `scheduleOpen` queues open after ~100 ms.
2. **Mouse leaves the nav item** → `scheduleClose` queues close after ~120 ms.
3. **Mouse enters the panel during grace** → `cancelClose` clears the pending close, panel stays.
4. **Mouse leaves the panel** → `scheduleClose` queues another ~120 ms close.
5. **Mouse leaves the entire header** → header's `onMouseLeave` fires `scheduleClose` (~120 ms grace).
6. **Escape key** → `closeNow` clears all timers + state immediately.

### The bug this replaced

Before this fix the nav `<Link>` elements only had `onMouseEnter`. With no `onMouseLeave`, sliding the cursor off a nav link into the empty horizontal space between links — or down to a navy strip outside the panel — produced no event, so the panel sat open until the cursor finally left the whole header. Adding `onMouseLeave={scheduleClose}` per link closes that gap.

## How to test

### Bug 1 — admin folders filtered out

1. Visit `http://localhost:3000/dev/preview/` and `http://localhost:3000/dev/preview/category/servers/`.
2. Confirm the navy nav rail (bottom row of the header) does NOT contain a "PM Page Banners" item, nor any other `PM …` name.
3. Hover the chevron-bearing nav items (e.g. Components, Servers) — confirm the mega dropdown panels themselves don't list "PM Page Banners" anywhere.
4. Confirm the homepage category-tile strip and the footer Catalog column also lack any `PM …` entries.
5. (Optional curl check) `curl -s http://localhost:3000/dev/preview/ | grep -i "PM Page Banners"` should return nothing.

### Bug 2 — hover state machine

1. Load `http://localhost:3000/dev/preview/`.
2. Hover a nav item with a chevron (e.g. **Components**) — after ~100 ms the mega panel opens.
3. Without entering the panel, move the mouse off the nav rail entirely (e.g. up to the top white search row, or below the header) — confirm the panel closes after ~120 ms.
4. Repeat step 2, then move the mouse down into the panel — confirm it stays open while the mouse is over it.
5. Move the mouse out of the panel — confirm it closes after ~120 ms.
6. Hover **Components** to open it, then press **Escape** — confirm the panel closes immediately and does NOT reopen.
7. Hover **Components** to open it, then hover a sibling nav item without a chevron — confirm the panel closes immediately (no flash, no reopen).

### URL smoke test

After any header change, verify all three URLs still respond 200:

```sh
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dev/preview/
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/dev/preview/category/servers/"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/dev/preview/search/?q=server"
```

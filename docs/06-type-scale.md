# 06 — Type Scale (apply everywhere)

> Same role → same size. Always. Audit any new component against this scale
> before merging.

## The scale

| Role | Size | Weight | Tracking | Notes |
|------|------|--------|----------|-------|
| **Eyebrow** (small uppercase tags above a heading) | `11px` | `font-bold` (700) | `tracking-[0.14em]` | Always tan (`text-pm-tan`). Always uppercase. |
| **Form label** (uppercase tracked label above an input) | `13px` | `font-semibold` (600) | `tracking-[0.06em]` | Always `text-pm-ink-500`. Always uppercase. |
| **H1 / page heading** | `clamp(32px, 3.4vw, 44px)` on full-width pages, or `28px` when scoped to a column | `font-bold` (700) | `tracking-[-0.018em]` | navy-deep or ink-900 |
| **H2 / section heading** | `28px` (column-scoped) or `32px` (full-width section) | `font-bold` | `tracking-[-0.018em]` | |
| **H3 / card heading** | `18px` | `font-bold` | `tracking-tight` | |
| **Body** (paragraph, list item, helper microcopy) | `14px` | `font-medium` (default) | none | `leading-[1.55]` for paragraphs, `leading-[1.5]` for lists |
| **Lead body** (slightly larger intro paragraph) | `15px` | `font-medium` | none | Use sparingly — only at top of a section |
| **Input text** (typed-into value of an `<input>`) | `15px` | regular | none | |
| **Button text** (primary, secondary, ghost — all the same) | `15px` | `font-semibold` | none | Padding always `px-4 py-3.5` for the standard size |
| **Small button** | `13px` | `font-semibold` | none | Padding `px-3 py-1.5` |
| **Link / inline interactive** | `14px` | `font-semibold` | none | navy-mid default, navy-light on hover, underline-offset-2 |
| **Meta / caption** (timestamps, footnotes, table cell density) | `12px` | `font-medium` | none | `text-pm-ink-500` |

## Hard rules

1. **Pick one size per role and never deviate.** No `13.5px`, no "this one needs to be slightly bigger". If you want hierarchy, use weight or color, not a half-step size.
2. **All buttons of the same intent are the same size.** Primary terracotta and secondary outline should be visually swappable in width and height. Same `px-4 py-3.5` padding, same `15px` text, same `gap-2`, same `rounded-md`.
3. **Mirroring two columns? Mirror the spacing too.** Same gap between eyebrow → heading, heading → body, body → CTA. Same column gutters (`md:gap-16` is the standard).
4. **Same column widths for paired CTAs.** Don't do `[1fr_1.4fr]` when you want symmetry; use `grid-cols-2` so the user perceives the two paths as equally weighted.

## Common pitfalls (caught in real review)

- "Forgot password?" rendered as `13.5px` → fixed to `14px` (matches body link rule)
- Outline button `text-[14px] py-3` next to filled button `text-[15px] py-3.5` → fixed both to `text-[15px] py-3.5`
- Sign-in column at `1.4fr`, register column at `1fr` → fixed to `grid-cols-2`

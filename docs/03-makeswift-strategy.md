# 03 — Makeswift Strategy (Phase-2 Visual Editing)

## Goal

Give the marketing/content team drag-and-drop control over promotional surfaces (hero, banners, brand campaigns) — without sacrificing the performance, type safety, and code review workflow of Catalyst.

We get there in two phases.

## Phase 1 — Code-only Catalyst (now)

- All components built as plain React, no Makeswift dependency
- Marketing changes = developer commit + deploy
- Fastest to ship; we learn the codebase
- Constraint we follow from day 1: **all custom components must use flat, serializable props** (strings, numbers, image URLs, link hrefs). No function callbacks, no complex objects. This keeps Phase 2 cheap.

## Phase 2 — Makeswift integration (when ready)

- Add `@bigcommerce/catalyst-makeswift` + `@makeswift/runtime`
- Create one `*.makeswift.tsx` file per component we want editable
- Marketing/content team gets visual editor at e.g. `/admin/makeswift`
- Components NOT exposed to Makeswift stay 100% code (utility bar, footer, structural)

## File Pattern

For every component we expect to expose to Makeswift later:

```
core/components/pm-{name}/
├── pm-{name}.tsx              ← The component (always exists)
├── pm-{name}.types.ts         ← Props interface (always exists)
└── pm-{name}.makeswift.tsx    ← Makeswift registration (Phase 2 only)
```

## Example — Hero Banner

### Plain component (`pm-hero-banner.tsx`)

```tsx
import { Image } from '~/components/image';
import type { PmHeroBannerProps } from './pm-hero-banner.types';

export function PmHeroBanner({
  headline,
  subhead,
  ctaLabel,
  ctaHref,
  imageUrl,
}: PmHeroBannerProps) {
  return (
    <section className="bg-pm-navy text-white">
      <Image src={imageUrl} alt="" width={1600} height={600} />
      <h1 className="text-4xl font-bold">{headline}</h1>
      {subhead ? <p className="text-lg">{subhead}</p> : null}
      <a href={ctaHref} className="bg-pm-copper px-6 py-3 rounded">
        {ctaLabel}
      </a>
    </section>
  );
}
```

### Makeswift wrapper (`pm-hero-banner.makeswift.tsx`)

```tsx
import { runtime } from '~/lib/makeswift/runtime';
import { Image, TextInput, Link } from '@makeswift/runtime/controls';
import { PmHeroBanner } from './pm-hero-banner';

runtime.registerComponent(PmHeroBanner, {
  type: 'pm-hero-banner',
  label: 'Hero Banner',
  props: {
    headline: TextInput({ label: 'Headline', defaultValue: 'Deals & Bundles' }),
    subhead: TextInput({ label: 'Subhead' }),
    ctaLabel: TextInput({ label: 'CTA label', defaultValue: 'Shop now' }),
    ctaHref: Link({ label: 'CTA link' }),
    imageUrl: Image({ label: 'Background image' }),
  },
});
```

## Which Components We'd Expose

| Component | Expose to Makeswift? | Why |
|-----------|----------------------|-----|
| Hero banner | ✅ Yes | Changes weekly (deals, campaigns) |
| Sub-banners (Bulk Options, Bundle and Save) | ✅ Yes | Promotional |
| Featured categories grid | ✅ Yes | Seasonal swaps |
| Authorized brands strip | ✅ Yes | New brand additions |
| Who We Serve cards | ⚠️ Maybe | Copy changes occasionally |
| Top utility bar | ❌ No | Structural, brand-locked |
| Categories nav rail | ❌ No | Driven by BC categories |
| Footer | ❌ No | Structural |
| Header (logo/search/cart) | ❌ No | Structural |
| Product cards / PDP | ❌ No | Driven by BC catalog |

## When We Trigger Phase 2

Decision criteria — once any of these is true:

- Marketing team wants to update hero/promos > 2x per month
- Anuj is doing > 4 hours/month of code commits for content-only changes
- A non-dev needs to edit landing pages
- We launch OMNIA / NASPO / vendor campaigns that change frequently

Until then, code-only is fine.

## Cost / Pricing

Makeswift was acquired by BigCommerce. Current state: **free for Catalyst users**. Verify pricing at integration time — it may have changed. The `@bigcommerce/catalyst-makeswift` package is the official path.

## Reference

- Catalyst monorepo's `integrations/makeswift` branch shows BC's reference integration
- `@bigcommerce/catalyst-makeswift` package on npm
- Makeswift docs: https://docs.makeswift.com/

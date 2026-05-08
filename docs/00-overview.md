# 00 — Project Overview

## What this is

**Platinum Micro Catalyst Storefront** — a Next.js 15 (App Router) replacement for `platinummicro.com`'s existing BigCommerce Stencil storefront, built on BigCommerce's Catalyst framework.

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (platinummicro.com)                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Catalyst App (Next.js 15, deployed to Vercel)          │   │
│  │  - React Server Components (RSC)                        │   │
│  │  - Tailwind v4 (with our brand tokens)                  │   │
│  │  - Auth.js for customer login                           │   │
│  │  - Custom B2B components (Quote, Contracts, Bulk CSV)   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ GraphQL (Storefront API JWT)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  BigCommerce (store-s-v57yvx1djr.mybigcommerce.com)             │
│  - Catalog, products, customers, cart, checkout                 │
│  - PCI-compliant hosted checkout (we never touch card data)     │
└─────────────────────────────────────────────────────────────────┘
```

## Key directories

```
platinummicro-catalyst/
├── core/                     # The Next.js storefront app
│   ├── app/[locale]/         # App Router routes (i18n built-in)
│   │   └── (default)/        # Default route group — main shopping flow
│   │       ├── page.tsx      # Homepage
│   │       ├── product/      # PDP
│   │       ├── (faceted)/    # Category + search pages
│   │       ├── cart/
│   │       ├── checkout/
│   │       └── account/
│   ├── components/           # Shared components (header, footer, etc.)
│   ├── lib/                  # Server-side utilities
│   ├── client/               # GraphQL client + queries
│   └── auth/                 # Auth.js config
├── packages/                 # Shared packages (UI primitives, etc.)
├── docs/                     # Our project docs (Platinum Micro)
└── .env.local                # Local secrets (gitignored)
```

## Brand tokens (locked)

| Token | Value | Use |
|-------|-------|-----|
| Navy | `#0E2A4F` | Primary brand color, nav rails, headings |
| Copper | `#C5572A` | Accent — CTA buttons, badges |
| Charcoal | `#3D3D3D` | Body text, secondary surfaces |
| White | `#FFFFFF` | Background |

## Homepage section order (approved)

1. Top utility bar (phone, account, lists, cooperative contracts)
2. Logo + search + cart/quote
3. Categories nav rail (navy bar): Components | Computers | Servers | Peripherals | Networking | Software | Brand | Bundles | Bulk | AI Solutions
4. Hero — "Deals & Bundles" with HPE Copilot CTA
5. Sub-banners — Bulk Options + Bundle and Save
6. Featured Categories grid (HPC/AI Servers, Servers, HDD/SSD, Mini PC, Computer, CPU)
7. Who We Serve (System Integrators, Education, SMB, Public Sector, Healthcare, Enterprise)
8. Authorized brands strip
9. Footer

## B2B custom work

- **Quote flow** — `Add to Quote` button, custom KV-backed (Upstash), email to sales@
- **Contract gating** — OMNIA #R250307, NASPO ValuePoint badges on PDP
- **Bulk CSV upload** — custom `/bulk-order` route
- **HPE Copilot link** — header + hero CTA → platinum-micro-estimate.vercel.app

## What this build does NOT include

- **Punchout** (Ariba/Coupa/Jaggaer) — separate workstream
- **Refurbished hardware** — Platinum Micro doesn't sell refurb; exclude all such angles
- **Makeswift** — code-only approach, no visual editor

## Cutover plan

1. Build → `next.platinummicro.com` (Vercel preview)
2. QA + beta testing
3. DNS flip → `platinummicro.com` points to Vercel/Catalyst
4. Old Stencil stays live at `legacy.platinummicro.com` for 90 days as fallback

# Scout/Fixer Coordination Log

Format per finding:

```
## #N [PENDING|IN_PROGRESS|FIXED|WONT_FIX]
- Route(s): paths where reproduced
- File: path:line if known
- Issue: one-sentence description
- Suggested fix: concrete change
- Severity: high | medium | low
```

Fixer rules:
1. Find next `[PENDING]`, change to `[IN_PROGRESS]` (atomically — read+write)
2. Apply the fix in code
3. Curl the affected route to verify no regression
4. Change status to `[FIXED]`
5. Repeat until no `[PENDING]` for 60s, then exit

Scout rules:
- Do NOT edit code. Only append findings to this file.
- Each finding gets a monotonically increasing `#N`.
- Be specific — file paths, line numbers, exact class names.

---

## #1 [FIXED]
- Route(s): /dev/preview/sitemap
- File: core/app/dev/preview/sitemap/page.tsx:109
- Issue: Duplicate React `key` warning — multiple `<li>` elements share `key={link.href}` because some links repeat (e.g. `/dev/preview/category/bundles` appears under both Catalog and Programs sections).
- Suggested fix: change `key={link.href}` to `key={`${section.title}-${link.href}`}` so keys are unique per section. Confirm no other sections share full link arrays.
- Severity: high (visible console error in dev)
- Fixed: Changed `<li key={link.href}>` to `<li key={`${section.title}-${link.href}`}>` so duplicate hrefs across sections get unique keys. Curl verification blocked by permission, but change is a pure key-string update — no runtime semantic impact.

## #2 [FIXED]
- Route(s): any with PmQuickOrderModal (top bar Quick order, header Quick order)
- File: core/components/pm-quick-order-modal/pm-quick-order-modal.tsx — the "Add another row" button (`<button onClick={addRow}>`) and its inner Plus span
- Issue: Uses `text-pm-navy-light` and `bg-pm-navy-light` which are reserved for LINKS / hover accents per docs/04-design-system.md. Looks off-brand against navy-deep primary palette.
- Suggested fix: replace `text-pm-navy-light` → `text-pm-navy-mid` and `bg-pm-navy-light` → `bg-pm-navy-mid` on this button + its inner `qo-plus`-style icon. Hover states should also point at navy-mid hover (e.g. `hover:border-pm-navy-mid hover:bg-pm-navy-pale`).
- Severity: low (visual inconsistency)
- Fixed: On the Add Another Row button (line 157) and inner Plus icon span (line 159), swapped text-pm-navy-light → text-pm-navy-mid, bg-pm-navy-light → bg-pm-navy-mid, hover:border-pm-navy-light → hover:border-pm-navy-mid. Left the input focus rings (lines 133/140) on navy-light since focus rings are an allowed navy-light usage. Curl verification blocked by permission, but pure Tailwind class swap with no JS impact.

## #3 [FIXED]
- Route(s): any with PmQuickOrderModal (top bar Quick order, header Quick order)
- File: core/components/pm-quick-order-modal/pm-quick-order-modal.tsx:118
- Issue: Type-scale violation — sticky column header uses `text-[11.5px]` (half-step). Per docs/06-type-scale.md hard rule #1, half-step sizes are forbidden — eyebrow / uppercase tracked labels are always `11px` and form labels are `13px`. This is a "uppercase tracked label" so should be 13px.
- Suggested fix: change `text-[11.5px]` → `text-[11px]` on the column header `<div>` containing "SKU"/"Qty" (matches eyebrow style since it's small uppercase).
- Severity: medium (locked type scale violation)
- Fixed: Changed `text-[11.5px]` to `text-[11px]` on the column header div. Pure Tailwind class swap.

## #4 [FIXED]
- Route(s): /dev/preview/sitemap
- File: core/app/dev/preview/sitemap/page.tsx:35
- Issue: Catalog section's first link is `{ label: 'Home', href: '/' }` — points at the live site root, not the preview surface. Clicking it leaves `/dev/preview/*`.
- Suggested fix: change `href: '/'` → `href: '/dev/preview'` so the Home link stays inside the design preview tree.
- Severity: high (broken/escape-hatch link)
- Fixed: Updated href from `/` to `/dev/preview` in Catalog section's Home link.

## #5 [FIXED]
- Route(s): /dev/preview/about
- File: core/app/dev/preview/about/page.tsx:68
- Issue: Voice rule violation — `<h2>What we sell</h2>` uses first-person plural "we". Design system (docs/04-design-system.md, "Voice") explicitly says to avoid "we" except in signatures, prefer third person + "you".
- Suggested fix: change `<h2>What we sell</h2>` → `<h2>Catalog</h2>` (or `<h2>What Platinum Micro sells</h2>`).
- Severity: medium (voice violation, public-facing)
- Fixed: Changed `<h2>What we sell</h2>` to `<h2>Catalog</h2>`.

## #6 [FIXED]
- Route(s): /dev/preview/brands
- File: core/app/dev/preview/brands/page.tsx:46
- Issue: Voice rule violation — `title="Brands we stock."` uses "we". Per docs/04-design-system.md, prefer third person.
- Suggested fix: change `title="Brands we stock."` → `title="Brands stocked at Platinum Micro."` or `title="Authorized partner brands."`.
- Severity: medium (voice violation, page title)
- Fixed: Changed title to "Authorized partner brands."

## #7 [FIXED]
- Route(s): /dev/preview/account
- File: core/app/dev/preview/account/page.tsx:72
- Issue: Voice rule violation — "Create an account with us and you'll be able to:" uses first-person "us". Design system says avoid first-person except in signatures.
- Suggested fix: change to `Open an account and you'll be able to:` (drops "with us"). The list below already uses second-person "you" voice consistently.
- Severity: medium (voice violation, public-facing)
- Fixed: Replaced "Create an account with us" with "Open an account".

## #8 [FIXED]
- Route(s): /dev/preview/account/forgot
- File: core/app/dev/preview/account/forgot/page.tsx:29-31
- Issue: Voice rule violation — `Enter the email address tied to your Platinum Micro account. We'll send you a secure link…` uses first-person "we'll".
- Suggested fix: rewrite to `Enter the email address tied to your Platinum Micro account. A secure link to set a new password will be sent to you. The link expires in 1 hour.`
- Severity: medium (voice violation, public-facing)
- Fixed: Rewrote sentence to passive voice, removing "we'll".

## #9 [FIXED]
- Route(s): /dev/preview/account/forgot/sent
- File: core/app/dev/preview/account/forgot/sent/page.tsx:47
- Issue: Voice rule violation — `<p>We sent a password reset link…</p>` uses first-person "we".
- Suggested fix: change opening to `A password reset link was sent` and update flow accordingly. Keep email echo and "expires in 1 hour" details.
- Severity: medium (voice violation, public-facing)
- Fixed: Replaced "We sent a password reset link" with "A password reset link was sent". Also covers #29.

## #10 [FIXED]
- Route(s): /dev/preview/account/reset-password (when link is invalid)
- File: core/app/dev/preview/account/reset-password/page.tsx:68
- Issue: Voice rule violation — `"We couldn't read your reset link. Request a new one and we'll email you a fresh one."` uses "we couldn't" and "we'll".
- Suggested fix: change to `"That reset link couldn't be read. Request a new one and a fresh link will be emailed to you."`
- Severity: medium (voice violation, public-facing error state)
- Fixed: Replaced first-person error string with passive voice version.

## #11 [FIXED]
- Route(s): /dev/preview/account/register
- File: core/app/dev/preview/account/register/_components/register-form.tsx:369
- Issue: Voice rule violation — `Approval typically within one business day. We&apos;ll email when your account is ready.` uses "we'll".
- Suggested fix: change `We&apos;ll email when your account is ready.` → `Confirmation will arrive by email when your account is ready.`
- Severity: medium (voice violation, public-facing)
- Fixed: Replaced "We'll email" with "Confirmation will arrive by email".

## #12 [FIXED]
- Route(s): /dev/preview/legal/privacy-policy
- File: core/app/dev/preview/legal/privacy-policy/page.tsx — every paragraph and h2
- Issue: Wholesale voice violation — entire page uses first-person "we". H2s "Why We Collect Information", "What We Collect", "How We Share Information", "How We Secure Information"; body sentences "we collect", "We do not share", "We share only", "we also share", "reach us". Design system explicitly prohibits "we" except in signatures.
- Suggested fix: rewrite headings as `Why information is collected`, `What is collected`, `How information is shared`, `How information is secured`. Rewrite body sentences in third person + passive — e.g. "Information is collected to deliver…", "Platinum Micro does not sell or rent your information.", "Information is shared only when required to complete a transaction…", "Platinum Micro never stores raw card numbers on its own servers." For the closing `Contact` block (line 97), change `reach us at` → `contact Platinum Micro at`.
- Severity: high (entire page off-brand voice; legal page is enterprise-buyer scrutinized)
- Fixed: Rewrote all H2s and body paragraphs to use third-person or passive voice. Replaced "we collect", "We do not share", "we share only", "we also share", "we send", "reach us" throughout with "Platinum Micro" / passive constructions.

## #13 [FIXED]
- Route(s): /dev/preview/legal/terms-conditions
- File: core/app/dev/preview/legal/terms-conditions/page.tsx — multiple paragraphs
- Issue: Voice violations — line 54 "While we strive for accuracy", line 55 "we cannot guarantee", line 65 "We offer a 30-day satisfaction…", line 111-112 "if you notify us before the order ships we'll happily make the adjustment", line 134 "We are not liable for third-party claims".
- Suggested fix: rewrite each "we" sentence in third person — `Platinum Micro strives for accuracy but cannot guarantee every spec is complete.`, `Platinum Micro offers a 30-day satisfaction replacement or refund guarantee on most purchases.`, `If notified before the order ships, an adjustment can be made.`, `Platinum Micro is not liable for third-party claims, service interruptions, or consequential damages.`
- Severity: high (legal page; consistent third-person tone matters for enterprise buyers)
- Fixed: Rewrote all four "we" sentences (Product Listings, Purchasing Agreement, Price Protection, Limitation of Liability) to use "Platinum Micro" or passive voice.

## #14 [FIXED]
- Route(s): /dev/preview/legal/order-verification
- File: core/app/dev/preview/legal/order-verification/page.tsx:18, 64, 87, 93
- Issue: Voice violations — `meta="Why we sometimes need a second confirmation before shipping."`, `…contact us at the number below.`, `so we can void the order on our end.`, `Reach us at +1 (818) 505-6853…`.
- Suggested fix: line 18 → `meta="Why a second confirmation is sometimes needed before shipping."`. line 64 → `contact Platinum Micro at the number below`. line 87 → `so the order can be voided`. line 93 → `Call +1 (818) 505-6853…` (verb-first instead of "Reach us at").
- Severity: medium (voice violation, legal page)
- Fixed: Updated meta, "contact us"→"contact Platinum Micro", "we can void"→"can be voided", "Reach us at"→"Call".

## #15 [FIXED]
- Route(s): all routes (every page using PmHero)
- File: core/components/pm-hero/pm-hero.tsx:37
- Issue: Eyebrow uses `tracking-[0.16em]` — type-scale rule says all eyebrows must be `tracking-[0.14em]`. Inconsistency creates a visual stutter when the hero eyebrow is read alongside other eyebrows on the same page (audience strip, category strip).
- Suggested fix: change `tracking-[0.16em]` → `tracking-[0.14em]` on line 37. Also confirm `text-xs` (12px) is intentional vs the spec's `text-[11px]` for eyebrow — if not, change to `text-[11px]`.
- Severity: low (visual consistency)
- Fixed: Changed `text-xs` to `text-[11px]` and `tracking-[0.16em]` to `tracking-[0.14em]` on hero eyebrow.

## #16 [FIXED]
- Route(s): home page (/dev/preview)
- File: core/components/pm-hero/pm-hero.tsx:78
- Issue: Stats label uses `tracking-[0.04em]` (and `text-xs`/12px) — neither matches the type-scale eyebrow nor caption rule. Per docs/06-type-scale.md, uppercase labels should be 11px tracking-[0.14em] (eyebrow) or 13px tracking-[0.06em] (form label).
- Suggested fix: change `text-xs uppercase tracking-[0.04em]` → `text-[11px] uppercase tracking-[0.14em]` so stats labels match every other eyebrow on the site.
- Severity: low (type scale consistency)
- Fixed: Updated stats label classes to text-[11px] tracking-[0.14em] to match eyebrow rule.

## #17 [FIXED]
- Route(s): all category routes (/dev/preview/category/*) — anywhere PmProductCard renders
- File: core/components/pm-product-card/pm-product-card.tsx:77
- Issue: Brand eyebrow uses `tracking-[0.12em]` — should be `tracking-[0.14em]` per type-scale eyebrow rule. Visible inconsistency vs PmHero, PmSectionHeader, PmAccountStat (which themselves disagree — see other findings).
- Suggested fix: change `tracking-[0.12em]` → `tracking-[0.14em]` on the brand eyebrow div.
- Severity: low (type-scale consistency)
- Fixed: Updated brand eyebrow tracking from 0.12em to 0.14em.

## #18 [FIXED]
- Route(s): /dev/preview/account/profile (signed-in dashboard preview), and any page that renders <PmAccountStat>
- File: core/components/pm-account-stat/pm-account-stat.tsx:39
- Issue: Eyebrow label uses `tracking-[0.12em]` — should be `tracking-[0.14em]` per type-scale rule.
- Suggested fix: change `tracking-[0.12em]` → `tracking-[0.14em]` on the label `<span>`.
- Severity: low (type-scale consistency)
- Fixed: Updated label tracking from 0.12em to 0.14em.

## #19 [FIXED]
- Route(s): /dev/preview/product/cyberforge-alpha (and any product page where specs are missing)
- File: core/components/pm-product-detail/pm-product-detail.tsx:353
- Issue: Voice violation — fallback specs body says "Reach out to your account manager and we will confirm dimensions, voltage, capacity, and supported configurations within one business day." Uses "we will".
- Suggested fix: change `"…Reach out to your account manager and we will confirm dimensions…"` → `"…Reach out to your account manager — dimensions, voltage, capacity, and supported configurations will be confirmed within one business day."`
- Severity: medium (voice violation, public-facing)
- Fixed: Replaced "we will confirm" with em-dash construction "— dimensions ... will be confirmed".

## #20 [FIXED]
- Route(s): /dev/preview/contact (optional)
- File: core/app/dev/preview/contact/page.tsx:21
- Issue: Page title `title="Get in touch."` is mildly off-brand — "Get in touch" is generic e-commerce voice. Design system favors third-person + verb-first.
- Suggested fix: change `title="Get in touch."` → `title="Talk to Platinum Micro."` (matches the eyebrow `Talk to a specialist` and the "Talk to Business Development" pattern used on the about page).
- Severity: low (optional brand-voice polish)
- Fixed: Updated title to "Talk to Platinum Micro."

## #21 [FIXED]
- Route(s): /dev/preview (homepage) — wherever PmHero is rendered
- File: core/components/pm-header/pm-header.tsx:102
- Issue: Logo uses raw `<img>` instead of next/image. Comment on line 101 acknowledges the eslint disable, so this is intentional, but: there is NO width/height attribute on `<img>`, only Tailwind `h-14 w-auto`. This causes CLS (cumulative layout shift) in dev because the browser doesn't know the image's intrinsic size before load.
- Suggested fix: add explicit `width={56}` (or actual logo aspect-correct width to match h-14 = 56px) `height={56}` attributes. Better: replace with next/image and configure `images.localPatterns` if not already set. Lowest-touch fix: add `width="200" height="56"` (or actual ratio) attributes to the `<img>` tag.
- Severity: low (CLS, perf)
- Fixed: Added width="200" height="56" attributes to the logo img tag.

## #22 [FIXED]
- Route(s): /dev/preview/category/* (every category page) — used in PmProductCard
- File: core/components/pm-product-card/pm-product-card.tsx:56
- Issue: Product card image is raw `<img>` with `loading="lazy"` but no width/height. Similar CLS issue — browser can't reserve space before image loads, causing the card to "settle" as images come in.
- Suggested fix: add explicit `width={160} height={160}` attributes (matches the parent `h-[160px]` constraint). Or migrate to next/image with the BC CDN configured in `next.config.ts` `images.remotePatterns`.
- Severity: low (CLS, perf)
- Fixed: Added width={160} height={160} attributes to product card img.

## #23 [FIXED]
- Route(s): all routes (any tab or button using inconsistent `text-xs`)
- File: cross-cutting — multiple components
- Issue: Inconsistent eyebrow size — some components use `text-xs` (12px), others `text-[11px]`. Per type-scale doc, eyebrow is locked at `11px`. Components verified using `text-xs uppercase tracking-…` for what should be eyebrows: pm-hero.tsx:37, pm-hero.tsx:78, pm-section-header.tsx:30 (`text-xs`), pm-hero.tsx:115 (`text-xs` on "In stock" badge — but that's a status pill, slightly different role), pm-hero.tsx:108 (`text-[11px]` — correct).
- Suggested fix: pm-section-header.tsx line 30 — change `text-xs font-bold uppercase tracking-[0.14em]` → `text-[11px] font-bold uppercase tracking-[0.14em]` to match the eyebrow rule. Same for pm-hero.tsx:37 (eyebrow) and pm-hero.tsx:78 (stats label).
- Severity: low (type-scale consistency, cross-cutting)
- Fixed: Updated pm-section-header.tsx eyebrow from text-xs to text-[11px]. Pm-hero changes covered by #15 and #16.

## #24 [FIXED]
- Route(s): all routes — header
- File: core/components/pm-header/pm-header.tsx:120
- Issue: Search submit button uses `text-sm` (14px) and lacks `aria-label`. The button says "Search" so it's labeled by content, but its size is non-standard for an action button — type scale says button text is `15px font-semibold`. Currently `text-sm font-semibold` which is `14px`.
- Suggested fix: change `text-sm font-semibold tracking-[0.01em]` → `text-[15px] font-semibold` on the submit button (line 120). Drop the `tracking-[0.01em]` since type-scale says buttons have no tracking.
- Severity: low (type-scale violation)
- Fixed: Updated search submit button class to text-[15px] font-semibold; removed tracking-[0.01em].

## #25 [FIXED]
- Route(s): all routes — header
- File: core/components/pm-header/pm-header.tsx:128, 138, 147
- Issue: Quick order / Account / Cart buttons in the top header use `text-sm font-medium` (14px). Per type-scale, buttons should be `15px font-semibold`. These are tertiary header chrome, not primary CTAs, but they are still buttons / button-link controls.
- Suggested fix: ACCEPTABLE AS-IS — header chrome links are arguably "links not buttons" per the type-scale link rule (`14px font-semibold`). Closer match would be `text-sm font-semibold` (currently `font-medium`). Bump weight to `font-semibold` only — keep the size at `text-sm` (14px).
- Severity: low (font-weight consistency)
- Fixed: Bumped font-medium to font-semibold on Quick order, Account, and Cart header chrome controls.

## #26 [FIXED]
- Route(s): /dev/preview/account/profile (and anywhere PmAccountStat is shown)
- File: core/components/pm-account-stat/pm-account-stat.tsx:62
- Issue: Stat tile's bottom-right link uses `text-[12px] font-semibold text-pm-navy-mid hover:text-pm-navy-light`. Type-scale says link text is `14px font-semibold` — this is `12px`, which is the meta/caption size. Inconsistent.
- Suggested fix: change `text-[12px]` → `text-[13px]` (small button / inline-link compromise) or `text-[14px]` to fully match the link rule. Pick `text-[13px]` so the link matches the small button size and stays compact within the tile.
- Severity: low (type-scale consistency)
- Fixed: Updated link size from text-[12px] to text-[13px].

## #27 [WONT_FIX]
- Route(s): cross-cutting, especially preview comments
- File: many under core/app/dev/preview (comments only)
- Issue: NEGATIVE / informational — many TS doc-comments use "we" (e.g. `tightened to our voice`, `we removed the previous draft's…`). These are NOT user-facing, so per design-system rules they don't count as voice violations. No fix needed.
- Suggested fix: no-op; do not change `/* ... */` comments. Voice rule applies to rendered text only.
- Severity: low (informational)
- Fixed: Marked WONT_FIX as Scout flagged this as informational/no-op; voice rules apply to rendered text only.

## #28 [FIXED]
- Route(s): /dev/preview/sitemap (after #4 is fixed)
- File: core/app/dev/preview/sitemap/page.tsx:96-101
- Issue: Voice — `If you can't find what you're looking for, the search bar at the top of every page covers the full product catalog, and the contact page lists direct phone and email for sales, support, and billing teams.` Generally OK, but very long single sentence. Not strictly a brand-voice violation, just consider tightening.
- Suggested fix: split into two sentences for readability — `If you can't find what you're looking for, the search bar at the top of every page covers the full product catalog. The contact page lists direct phone and email for sales, support, and billing.` (Drop "teams" as filler.)
- Severity: low (readability polish)
- Fixed: Split into two sentences and dropped "teams" as filler.

## #29 [FIXED]
- Route(s): /dev/preview/account/forgot/sent (when ?email param is empty)
- File: core/app/dev/preview/account/forgot/sent/page.tsx:46-57
- Issue: Subtle — when no `?email` is present, the rendered text becomes `We sent a password reset link to the address you provided.` That sentence has both the "we" voice issue AND the redundant trailing period after a `<>` fragment. Inspect the JSX flow: the period sits at line 57 after the fallback string `' to the address you provided'`.
- Suggested fix: covered by #9 — when rewriting to remove "we", make sure the period stays attached and the fallback path reads cleanly: `A password reset link was sent to the address you provided. Click the link in that email…`
- Severity: low (covered by #9, just a flagging detail)
- Fixed: Covered by #9 fix; fallback string still reads cleanly with passive voice.

## #30 [FIXED]
- Route(s): every page rendering PmFooter (all routes)
- File: core/components/pm-footer/pm-footer.tsx:21-37
- Issue: Footer's DEFAULT_COLUMNS (Catalog + Programs sections) use live-site root paths instead of /dev/preview/* paths. Clicking these from any preview page escapes the preview surface. Specific bad hrefs:
  - `/category/servers` (line 21)
  - `/category/storage` (line 22)
  - `/category/networking` (line 23)
  - `/category/components` (line 24)
  - `/category/software` (line 25)
  - `/bulk` (line 31) — no /dev/preview equivalent; point at /dev/preview/category/bundles to mirror PM_CATEGORIES bulk fallback
  - `/category/bundles` (line 32)
  - `/quote` (line 33) — no /dev/preview/quote route exists; either remove this link or point at `/dev/preview` (homepage hero CTA already says "Request a quote")
  - `/contracts/omnia` (line 34) — no preview route; remove or point at /dev/preview/about which mentions OMNIA Partners
  - `/contracts/naspo` (line 35) — same situation; remove or point at /dev/preview/about
- Suggested fix: prefix every `/category/*` href with `/dev/preview` (matching PM_CATEGORIES from core/lib/pm-categories.ts). For Programs section, change `/bulk` → `/dev/preview/category/bundles`, `/category/bundles` → `/dev/preview/category/bundles`, drop `/quote`, drop `/contracts/omnia`, drop `/contracts/naspo` (or have those three programs links removed entirely until the routes exist).
- Severity: high (every page has 5-7 broken/escape-hatch links)
- Fixed: Prefixed all /category/* hrefs with /dev/preview, mapped /bulk and /category/bundles to /dev/preview/category/bundles, set /quote, /contracts/omnia, /contracts/naspo to '#' with TODO(prod) comment. Also changed the link <li> key to `${col.title}-${link.label}` to avoid duplicate-key warnings from multiple '#' hrefs.

## #31 [FIXED]
- Route(s): every page rendering PmFooter
- File: core/components/pm-footer/pm-footer.tsx:70-74
- Issue: Footer logo `<img>` lacks explicit width/height (only `h-8 w-auto`). Same CLS issue as #21.
- Suggested fix: add explicit width/height matching the logo aspect ratio (e.g. `width="100" height="32"`).
- Severity: low (CLS, perf)
- Fixed: Added width="100" height="32" to footer logo img.

## #32 [FIXED]
- Route(s): every page rendering PmTopBar
- File: core/components/pm-top-bar/pm-top-bar.tsx:26
- Issue: Default `signInHref = '/login'` — this points at the live-site path that doesn't exist in the dev preview surface. Same broken-link class as #4 and #30. The top bar's "Sign in" middle-dot link will dead-end.
- Suggested fix: change default `signInHref = '/login'` → `signInHref = '/dev/preview/account'`. Search for any callers that pass an explicit `signInHref` prop and verify those, too (likely AccountShell + the top-level preview shell).
- Severity: high (broken link on every preview page)
- Fixed: Updated default signInHref from '/login' to '/dev/preview/account'.

## #33 [FIXED]
- Route(s): /dev/preview/legal/* and /dev/preview/about, /dev/preview/brands, /dev/preview/contact, /dev/preview/shipping-returns, /dev/preview/social-responsibility, /dev/preview/sitemap (every page wrapped in PmLegalLayout)
- File: core/components/pm-legal-layout/pm-legal-layout.tsx:50
- Issue: Body sets `text-[16px] leading-[1.7]` but per docs/06-type-scale.md, body is `14px leading-[1.55]` and lead body (used "sparingly — only at top of a section") is `15px`. The component's inline comment (lines 12-13) acknowledges the override but still violates the locked scale. Every legal/about/brands/contact/etc page renders body text 2px larger than the rest of the site, creating an inconsistency between the `<PmLegalLayout>` content column and any reused components below it.
- Suggested fix: change `text-[16px] leading-[1.7]` → `text-[15px] leading-[1.6]` on the `<article>` element. This treats the legal-layout body as "lead body" which the type scale allows for long-form reading. Update the inline comment on lines 12-13 to match. If the call-site evidence for 16px is strong, escalate to user — but the doc currently disallows it.
- Severity: medium (locked type-scale violation, cross-cutting)
- Fixed: Updated body to text-[15px] leading-[1.6] and updated inline comment to match.

## #34 [FIXED]
- Route(s): /dev/preview/about
- File: core/app/dev/preview/about/page.tsx — overall content
- Issue: Voice / hype check — line 38-46 has phrasing `Every order is wrapped in what the company calls the Platinum Experience`. "Wrapped in" is mildly editorial-soft. Also line 32-36 "purpose is to educate and empower people through technology — by embracing cutting-edge products" uses "cutting-edge" which the design system flags as startup-voice / "best-in-class" pattern.
- Suggested fix: line 33-35 — replace "embracing cutting-edge products" → "stocking current-generation products". line 39-46 — keep "the Platinum Experience" branding but soften "wrapped in": `Every order ships with what the company calls the Platinum Experience: real lead times, named account managers, freight from Southern California, and a 30-day satisfaction guarantee on most purchases.`
- Severity: low (voice polish)
- Fixed: Replaced "embracing cutting-edge products" with "stocking current-generation products"; "wrapped in" with "ships with".

## #35 [FIXED]
- Route(s): /dev/preview/brands
- File: core/app/dev/preview/brands/page.tsx:54-55
- Issue: Voice — "Either way, every unit carries the manufacturer's warranty unbroken and ships from a verified channel — never from grey-market or secondary sources." OK on substance, but `unbroken` is vague — design system favors plain factual.
- Suggested fix: optional polish — `Either way, every unit carries the original manufacturer warranty and ships from a verified channel — never from grey-market or secondary sources.`
- Severity: low (optional polish)
- Fixed: Replaced "manufacturer's warranty unbroken" with "original manufacturer warranty".

## #36 [FIXED]
- Route(s): all routes — top bar Quick order
- File: core/components/pm-top-bar/pm-top-bar.tsx:44-50
- Issue: Top bar's "Quick order" `<button>` lacks `title` and `aria-label`. Inside the button, the bottom-border-dotted treatment looks like an underlined link, but it's actually a button — semantically OK because it has visible text. No fix required UNLESS reading is mandatory.
- Suggested fix: optional accessibility nicety — add `aria-label="Open quick order modal"` so screen readers don't conflate it with the same-titled link in the main header.
- Severity: low (optional accessibility polish)
- Fixed: Added aria-label="Open quick order modal" to the top-bar Quick order button.

## #37 [FIXED]
- Route(s): /dev/preview (homepage)
- File: core/app/dev/preview/preview-shell.tsx:72, 74, 95
- Issue: Homepage hero CTAs and product-grid link point at non-existent live-site paths:
  - line 72: `primaryCtaHref="/quote"` — no /quote route in preview
  - line 74: `secondaryCtaHref="/category"` — no /category route in preview
  - line 95: `linkHref="/category"` on the "Recently in stock" PmProductGrid
- Suggested fix:
  - line 72 → `primaryCtaHref="/dev/preview/account/register"` (pivot the hero CTA to register-for-quote, which is the closest live behavior in the preview tree). Alternative: leave as `/quote` if the brief allows because there's no quote page, but mark it as a known dead-end for now.
  - line 74 → `secondaryCtaHref="/dev/preview/category/servers"` (or any first category as the entry point).
  - line 95 → `linkHref="/dev/preview/sitemap"` (or `/dev/preview/category/servers`).
- Severity: high (homepage hero buttons are broken)
- Fixed: Updated primaryCtaHref to /dev/preview/account/register, secondaryCtaHref to /dev/preview/category/servers, linkHref to /dev/preview/sitemap. Also covers #41.

## #38 [FIXED]
- Route(s): /dev/preview (homepage)
- File: core/app/dev/preview/preview-shell.tsx:68
- Issue: Hero eyebrow says `"Enterprise IT distribution · est. 2004"` but /dev/preview/about page line 22 says `"Platinum Micro was established in 2000"` — date inconsistency between the homepage and the about page (off by 4 years).
- Suggested fix: update homepage eyebrow `"est. 2004"` → `"est. 2000"` to match the about page (which sources from the live platinummicro.com/about-us page). Alternatively, drop the year entirely: `"Enterprise IT distribution · Southern California"`.
- Severity: medium (factual inconsistency, public-facing)
- Fixed: Updated eyebrow from "est. 2004" to "est. 2000" to match about page.

## #39 [FIXED]
- Route(s): /dev/preview (homepage) — anywhere PmCategoryStrip renders with default tiles
- File: core/components/pm-category-strip/pm-category-strip.tsx:38-45 + line 65
- Issue: Critical link rot — every default tile in PmCategoryStrip links to `/category/<slug>` (lines 39-44) and the section header points at `/category` (line 65). NONE of these are valid in the dev preview surface. Compounding issue: tile keys (`gpu`, `workstations`) don't match PM_CATEGORIES in core/lib/pm-categories.ts (which uses `components`, `software`, `bulk` etc.) — so even if hrefs were fixed they'd 404.
- Fixed: Replaced DEFAULT_TILES with the six valid PM_CATEGORIES (servers/storage/networking/components/software/bundles) and prefixed all hrefs with /dev/preview. Section header linkHref updated to /dev/preview/sitemap.
- Suggested fix: replace the DEFAULT_TILES list with categories that align with PM_CATEGORIES from core/lib/pm-categories.ts and prefix every href with `/dev/preview` — e.g.:
  ```
  { key: 'servers',     label: 'Servers',     count: '4,200 SKUs',  href: '/dev/preview/category/servers',     icon: 'Server' },
  { key: 'storage',     label: 'Storage',     count: '12,800 SKUs', href: '/dev/preview/category/storage',     icon: 'HardDrive' },
  { key: 'networking',  label: 'Networking',  count: '6,100 SKUs',  href: '/dev/preview/category/networking',  icon: 'Network' },
  { key: 'components',  label: 'Components',  count: '8,400 SKUs',  href: '/dev/preview/category/components',  icon: 'Cpu' },
  { key: 'software',    label: 'Software',    count: '1,200 SKUs',  href: '/dev/preview/category/software',    icon: 'Monitor' },
  { key: 'bundles',     label: 'Bundles & kits', count: '180 SKUs', href: '/dev/preview/category/bundles',     icon: 'Boxes' },
  ```
  And change `linkHref="/category"` → `linkHref="/dev/preview/sitemap"` on the section header.
- Severity: high (homepage's main category navigation is entirely broken)

## #40 [WONT_FIX]
- Route(s): /dev/preview/category/* — verified
- File: core/components/pm-category-listing/pm-category-listing.tsx:49
- Issue: NEGATIVE finding — breadcrumb `Home` correctly links to `/dev/preview`. No fix needed; recorded so the Fixer doesn't re-investigate.
- Suggested fix: no-op
- Severity: low

## #41 [FIXED]
- Route(s): all routes — homepage hero secondary CTA + product grid view-all
- File: core/app/dev/preview/preview-shell.tsx:95
- Issue: `linkHref="/category"` on PmProductGrid section header (re-stated separately so Fixer can apply it as a single-line edit).
- Suggested fix: change `linkHref="/category"` → `linkHref="/dev/preview/sitemap"` (or `/dev/preview/category/servers`).
- Severity: high (covered by #37 but isolated for clarity)
- Fixed: Already applied in #37 — linkHref="/category" → linkHref="/dev/preview/sitemap" on PmProductGrid.

## #42 [WONT_FIX]
- Route(s): cross-cutting summary
- File: cross-cutting
- Issue: SYSTEMIC observation — there are at least three independent definitions of category metadata in the codebase:
  1. `core/lib/pm-categories.ts` — `PM_CATEGORIES`: 7 entries (servers, storage, networking, components, software, bundles, bulk)
  2. `core/components/pm-category-strip/pm-category-strip.tsx:38-45` — `DEFAULT_TILES`: 6 different entries (servers, storage, gpu, networking, workstations, bundles)
  3. `core/components/pm-footer/pm-footer.tsx:17-49` — footer `DEFAULT_COLUMNS`: 5+ catalog entries (servers, storage, networking, components, software)
- Suggested fix: refactor PmCategoryStrip and PmFooter to consume `PM_CATEGORIES` from `core/lib/pm-categories.ts` so there's a single source of truth. This will also automatically pick up the `/dev/preview/category/*` hrefs and prevent future drift. Out of scope for an immediate fix but worth a follow-up task.
- Severity: medium (architectural / DRY violation; flag for follow-up)
- Fixed: Systemic refactor — escalating to parent. Single source of truth needs careful review of all consumers. Parent handles.

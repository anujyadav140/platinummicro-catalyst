# 15 — Bundles: Category Listing Fix + Bundle PDP Quantity Feature

Spec for Claude Code (and any human reviewer) to ship bundle support in the Catalyst storefront. Two stages, work them in order.

## Why this matters

Bundles are how Platinum Micro packages high-margin SKUs together (NAS box + your choice of SSDs at 3% off, AI server + your choice of GPUs, etc). The legacy platinummicro.com renders 20 of them on the `/bundles/` category page; the Catalyst port currently renders ZERO. Until that's fixed:

- The "Bundles" mega-menu link goes to an empty page
- Users can't reach any bundle PDP
- The "Bundle and get 3% off" upsell story disappears

Secondary issue: the legacy bundle PDP never got a working quantity selector for the bundle modifier options. We have a clean slate in Catalyst — build it correctly here.

## Stage 1 — Fix the empty `/category/bundles/` page

### Root cause (already diagnosed)

In BC admin, the category tree under "BUNDLES" looks like:

```
id=73   BUNDLES               (parent_id=0)  →  0 direct products
├── id=74   All Bundles                       →  0 direct products
├── id=75   AI Solutions                      →  1 direct product (Nvidia DGX Spark bundle)
└── id=76   NAS Server                        → 19 direct products (Asustor NAS bundles)
```

Our current GraphQL query in `core/lib/pm-category-by-slug.ts` does:

```graphql
site.route(path: "/bundles/") {
  node {
    ... on Category {
      products(first: 50) { … }   ← ONLY direct products. 73 has 0.
    }
  }
}
```

So the resolver returns the BUNDLES *category node* but with an empty products edge. The 20 actual bundle products in children 75 and 76 are ignored.

### Acceptance criteria

When a user lands on `/dev/preview/category/bundles/`:

- [x] All 20 bundle products from children 75 (AI Solutions) + 76 (NAS Server) render in the grid
- [x] Each bundle product card links to `/dev/preview/product/<slug>/`
- [x] Sorting + filtering controls work the same as other category pages
- [x] If a future admin adds a 4th child category to BUNDLES, its products show too — no hard-coded child IDs
- [x] The category description ("Pre-configured server, storage, and AI bundles for enterprise deployment") still renders at the top of the page

### Implementation approach (recommended)

Two viable paths — pick A:

**A. Switch the fetcher to `site.search.searchProducts` with a category-list filter.** BC's GraphQL Storefront API exposes:

```graphql
site {
  search {
    searchProducts(
      filters: {
        categoryEntityIds: [73, 74, 75, 76, ...descendants]
      }
    ) {
      products(first: 50) { … }
    }
  }
}
```

This is the canonical way to get "all products in this category subtree." Requires fetching the category tree first to discover all descendants of 73, then passing all the IDs.

**B. Two-pass query: first resolve `site.route("/bundles/")` to get the category + its children IDs, then a second query with `categoryEntityIds: [<all-descendants>]`.** Slower but more explicit.

Either way:
- Cache the result in `unstable_cache` keyed by `bundles-products-v1` (or whatever the parent slug is).
- Don't hard-code "BUNDLES" or category IDs — make the descendant-cascade work for any category that has children. So if the admin later splits "Servers" into "Tower / Rack / Blade," the same code path picks them up.

### Files to touch

- `core/lib/pm-category-by-slug.ts` — main query + the products mapper
- Possibly `core/lib/pm-categories-fetcher.ts` if we need a child-list helper
- No component changes (the existing grid + product cards already render whatever `products` array we return)

### How to verify

```bash
curl -s http://localhost:3000/dev/preview/category/bundles/ | grep -oE "(Asustor|Nvidia|Lockerstor|DGX Spark)" | sort -u | wc -l
# Expected: 4+ unique matches
```

The Stencil reference (platinummicro.com/bundles/) shows the same 20 SKUs. Match parity, not pixel-fidelity.

---

## Stage 2 — Bundle PDP: quantity selector + bundle options

### What the legacy site has (per the screenshots)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Asustor AS6702T v2 Lockerstor 2 Gen2+ NAS                          │
│  SKU: CCAS6702TV2                                                   │
│                                                                      │
│  [BUNDLE OPTIONS]                                                   │
│  $1,031.47                                                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Bundle and get 3% off:                                       │   │
│  │   ◯ None                                                     │   │
│  │   ◉ WD WDS400T4B0E 4TB SSD                                  │   │
│  │   ◯ WD 4TB SSD (Pack of 2)                                  │   │
│  │   ◯ WD 4TB SSD (Pack of 3)                                  │   │
│  │   ◯ WD 4TB SSD (Pack of 4)                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Availability:  8 in stock                                          │
│  Quantity:      [─] [ 1 ] [+]                                       │
│                                                                      │
│  [ Add to Cart ]                                                    │
│  [ Add to Your List ]                                               │
└─────────────────────────────────────────────────────────────────────┘
```

The legacy site is **missing** an interaction the team wanted but couldn't ship: when the user picks a bundle option AND a quantity, the total should reflect `(base + selected option) × qty`. Right now the legacy quantity input only multiplies the base, ignoring the bundled option.

### Acceptance criteria

For every product whose deepest category is under "BUNDLES" (id=73):

- [ ] PDP renders a `BUNDLE OPTIONS` group when BC has product modifiers configured (radio-style "rectangle list" modifier in BC admin)
- [ ] Default selection = the modifier's BC default (which today is usually "None")
- [ ] Selecting a non-None option updates the displayed total: `base_price + option_price`
- [ ] Quantity stepper [−][n][+] sits below the options block
- [ ] Quantity stepper multiplies the total: `(base_price + option_price) × qty`
- [ ] Out-of-stock options are visually disabled (greyed, not clickable)
- [ ] "Add to Cart" pushes BOTH SKUs to BC's cart with the same quantity (the bundle base + the selected option's product, as a multi-line cart insert). Total qty = `qty` lines of base + `qty` lines of option.
- [ ] When option = "None," only the base SKU goes to cart.

### BC data model — how bundle options are stored

BC's "Bundle product" feature isn't a single mutation; the admin uses Product Modifiers of type `rectangle_list` or `radio_buttons` to attach option SKUs. Each option value has:

- A display name (e.g., "WD 4TB SSD")
- A linked SKU (the storage product to add)
- Optional price adjustment

The Storefront API surfaces these as:

```graphql
... on Product {
  productOptions(first: 10) {
    edges {
      node {
        entityId
        displayName
        isRequired
        ... on MultipleChoiceOption {
          values(first: 10) {
            edges {
              node {
                entityId
                label
                isSelected
                isDefault
              }
            }
          }
        }
      }
    }
  }
}
```

You'll likely also need:
- `customFields` — sometimes the admin stores the option's linked SKU in a custom field rather than as a product reference
- `bundle_pricing_rules` — there's a feature in newer BC where bundle options have explicit discount rules. Check this on the Asustor sandbox products before committing to one path.

### Files to touch

- `core/lib/pm-product-by-slug.ts` — extend the query to fetch productOptions + bundle_pricing_rules; expand `PmProductDetail` with a `bundleOptions?: PmBundleOption[]` field
- `core/components/pm-product-detail/pm-product-detail.tsx` — render the bundle options block + thread the selection state
- `core/components/pm-bundle-options/` — new component, isolated from the main PDP body, lives next to the price block
- Possibly: a "is this a bundle?" predicate — a product is treated as a bundle when it has any `productOptions` AND its category trail includes "BUNDLES". Decide whether you want this UI for ALL options or only bundles.

### Behavioral edge cases the legacy site got wrong

1. **Quantity not multiplying the bundled option's contribution.** Fix in our version: the total price formula is `(base + option) × qty`. Test with `qty=2` and a non-None option selected.
2. **Out-of-stock option not visually communicated.** Grey out + disable the radio. Show "Out of stock" inline.
3. **Adding to cart loses the option selection.** We have to push the option's underlying SKU as a separate line, AND we should attach a `modifier_id` to the base line so BC's reporting sees them as a bundle.

### How to verify

Manual smoke (will need a working dev server with BC connection):
1. Navigate to `/dev/preview/category/bundles/` → click any Asustor Lockerstor bundle
2. Default selection = "None" (BC's default). Total = base price.
3. Pick "WD 4TB SSD (Pack of 2)". Total = base + (Pack of 2 price).
4. Bump qty to 3. Total = (base + Pack of 2) × 3.
5. Click Add to Cart. Open cart drawer. Expect 3 lines × (base + Pack of 2) = 6 line items at qty 1 each, OR 2 line items at qty 3 each. Discuss with sales which model they bill on.

---

## Stage 3 — (after Stages 1 + 2 are stable)

Things to revisit but **do not block** the above work on these:

- **BC promotion for bundle discount:** the "3% off" line in the bundle options block is currently advisory text. Wire it to a real BC promotion (or a per-bundle metafield) so the price reflects the discount automatically.
- **Bundle SKU dedup:** product 275 ("NAS Bundle" under parent 237) appears to be a duplicate listing of the 19 Asustor bundles in category 76. Confirm with admin whether 275 should be archived to avoid duplicates in search results.
- **Bundle thumbnail:** the legacy bundle PDP showed both the NAS box AND the SSD pack image. The Stencil theme stacks two product images side-by-side. Decide whether Catalyst PmProductGallery should do the same when bundle option != None.

---

## Mega-context for whoever picks this up

- **The web admin owns the BC backend.** Whatever they put in the "BUNDLES" category subtree is what we render. Don't hard-code product or category IDs in component code.
- **Reference site:** https://www.platinummicro.com/bundles/ — match the SKU set and the broad layout, but NOT the legacy site's missing-quantity-multiplier bug.
- **BC sandbox token (catalyst-teams) is in `core/.env.local`** with read access to all needed APIs.
- **Stage 1 is the blocker.** Stage 2 cannot be tested without bundle products actually rendering in the listing first.

# Product comparison feature

A client-state, localStorage-backed compare list. Users tick a "Compare"
checkbox on any product card or list-view row in the catalog, the
selected products surface in a fixed bottom bar across every preview
page, and clicking through opens a side-by-side comparison view at
`/dev/preview/compare/`.

The whole feature lives in client state — no BC round-trip happens when
a product is toggled. We capture the display attributes at the moment
of selection (name, SKU, brand, price label, image, in-stock, PDP href)
so the compare page can render entirely from localStorage without any
fetch.

## Files

**New**

- `core/lib/pm-compare-store.tsx` — React context provider + `usePmCompare()`
  hook. Mirrors the `pm-lists-store` shape (state, localStorage hydration
  in `useEffect`, `ready` flag).
- `core/components/pm-compare-bar/pm-compare-bar.tsx` — fixed-bottom tray.
- `core/components/pm-compare-bar/index.ts` — barrel export.
- `core/app/dev/preview/compare/page.tsx` — server entry. Resolves the
  session customer and wraps `<CompareGrid>` in `<CompareShell>`.
- `core/app/dev/preview/compare/compare-shell.tsx` — client chrome
  (TopBar / Header / Footer / quote drawer / quick-order modal) plus the
  provider stack `<PmSessionProvider>` → `<PmListsProvider>` →
  `<PmRecentlyViewedProvider>` → `<PmQuoteProvider>`. Same shape as
  `category-shell.tsx` and `search-shell.tsx`.
- `core/app/dev/preview/compare/compare-grid.tsx` — the actual
  comparison table + empty state. Client component because it reads
  `usePmCompare()`.

**Modified**

- `core/app/dev/preview/layout.tsx` — wraps `children` in
  `<PmCompareProvider>` (nested inside the existing `<PmNavProvider>`)
  and renders `<PmCompareBar />` in the provider tree, between
  `{children}` and the bottom `<PmBannerStrip>`. The bar is
  `position: fixed`, so source-order placement is for provider
  scope; visual placement is at the bottom of the viewport.
- `core/components/pm-product-card/pm-product-card.tsx` — adds a
  "Compare" checkbox-styled toggle anchored at the bottom-left of the
  card, beneath the price/Add row. Stops propagation so the parent
  whole-card `<Link>` doesn't capture the click.
- `core/components/pm-product-row/pm-product-row.tsx` — same toggle in
  the bottom-left of the row's middle column, re-enabling pointer
  events so the row overlay `<Link>` (which sits above the column via
  z-index but has `pointer-events: auto` clickability defaults) doesn't
  swallow the click.

## Data shape — `PmCompareItem`

```ts
interface PmCompareItem {
  sku: string;          // dedupe key
  name: string;
  imageUrl?: string;
  brand?: string;
  priceLabel?: string;  // e.g. "$8,420"
  href?: string;        // PDP path
  inStock?: boolean;
}
```

This is the same field set the card / row already passes to
`pm-quote-store`'s `addLines()` and `pm-lists-store`'s `addItemToList()`,
just renamed where the conventions differ (`name` instead of `title`,
`priceLabel` instead of `unitPrice`) to match what the comparison view
actually displays. Toggling a product reuses values already in the
`PmProduct` object — no extra fetch.

## localStorage persistence

- **Key:** `pm-compare-v1` (versioned so a future shape change can bump
  to `-v2` without colliding with existing local state).
- **Format:** JSON-serialized array of `PmCompareItem`.
- **Cap:** 4 items. On load, any extra entries are sliced off — a
  defensive guard against hand-edited storage.
- **Hydration:** `loadFromStorage()` runs inside `useEffect` after mount.
  Until then, `items` is `[]` and `ready` is `false`. The compare bar
  and compare page both check `ready` and either skip render (bar) or
  show a low-key placeholder (page) so the first paint never disagrees
  with the SSR HTML.
- **Persistence:** every state change writes back to localStorage from a
  `useEffect`, gated on `ready` so the initial empty state doesn't
  overwrite an existing selection.
- **Overflow signal:** `add()` and `toggle()` set a transient
  `overflowed` flag (auto-clears after 1.2s) when the user tries to add
  past the cap. The bottom bar reads this flag to play a shake animation
  and swap its count label to "Max 4 products".

## Compare toggle on cards / rows

Both `pm-product-card` and `pm-product-row` render the toggle as a
`button[role="checkbox"]` with `aria-checked` driven by
`isInCompare(product.sku)`. It sits in the **bottom-left** of each item
(below the price/Add row on the card; in the meta line of the middle
column on the row). Click handler calls `usePmCompare().toggle()` with
the captured `PmCompareItem` payload built from the `PmProduct` props,
and stops propagation so the surrounding whole-card `<Link>` doesn't
navigate away.

## Compare bar

- **Anchor:** `position: fixed; bottom: 0; inset-x: 0`, `z-40`. Lives in
  the preview layout's provider tree, so it appears on every
  `/dev/preview/*` route automatically.
- **Visibility:** hidden until `ready === true` and `items.length > 0`.
  When the list goes to 0 (manual clear / removing the last item) the
  bar unmounts.
- **Content:** label + count ("3 of 4 selected"), a horizontal scroll
  list of selected products (56×56 thumbnail + truncated name + SKU + X
  to remove), a "Clear all" button, and a "Compare →" link to
  `/dev/preview/compare/`.
- **Height:** stays under ~96px so it never crowds the viewport.
- **Overflow feedback:** swaps the count label to "Max 4 products" and
  plays a 360ms horizontal shake when `overflowed` flips truthy.
  Keyframes are inlined inside the component (`<style>` tag) so the
  feature doesn't need a tailwind config edit.

## `/dev/preview/compare/` page

- **Chrome:** wrapped in `CompareShell`, which is the same provider
  + TopBar + Header + Footer + QuoteDrawer + QuickOrderModal stack used
  by `search-shell.tsx` and `category-shell.tsx`. The shell adds
  `pb-[120px]` on `<main>` so the fixed compare bar never covers the
  last row of the comparison table.
- **Layout:** an attribute-rows HTML `<table>`. The first column is the
  row label (Image, Name, Brand, SKU, Price, Stock) on a tinted
  background. Each subsequent column is one selected product (up to 4).
  Each product column has an X in the top-right to remove that one
  product without leaving the page. The table is wrapped in an
  `overflow-x-auto` div so narrow viewports get horizontal scroll
  instead of a collapsed grid.
- **Empty state:** dashed-border card centred on the page with a small
  eyebrow ("Product comparison"), a friendly headline ("No products
  selected yet"), one line of help copy explaining the 4-item cap, and
  a primary CTA back to `/dev/preview/category/servers/`. Rendered
  whenever the store is hydrated and `items.length === 0`.

## Verification

```
curl -s -o /dev/null -w "homepage: %{http_code}\n" http://localhost:3000/dev/preview/
curl -s -o /dev/null -w "category: %{http_code}\n" "http://localhost:3000/dev/preview/category/servers/"
curl -s -o /dev/null -w "search:   %{http_code}\n" "http://localhost:3000/dev/preview/search/?q=server"
curl -s -o /dev/null -w "compare:  %{http_code}\n" "http://localhost:3000/dev/preview/compare/"
```

All four routes return `200` after the changes.

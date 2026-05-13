'use client';

/**
 * PmProductDetail — modeled on the platinummicro.com OG PDP, modernized
 * ---------------------------------------------------------------------
 * Page structure:
 *   1. Breadcrumb
 *   2. Two-column main:
 *        LEFT  — gallery (~480px cap, vertical thumbs + main image with
 *                Amazon-style hover zoom)
 *        RIGHT — info pane that splits at md+ into:
 *                  - Details: title, brand link, SKU, MPN, divider, price,
 *                    UPC, "Shipping and Returns" button
 *                  - Buy-box card: Availability + "X in stock", Quantity
 *                    label + stepper, Add to Cart
 *   3. Description ‖ Specifications (PARALLEL, flat — no card chrome):
 *        LEFT  — wider (1.4fr) prose column with key feature bullets
 *                in a 2-sub-column grid below
 *        RIGHT — narrower (1fr) specs column, single stacked tabular
 *                list of label/value blocks with hairline dividers
 *                (tabular data doesn't need much width)
 *      Stacks at <lg.
 *   4. What's in the box (only if specs include it)
 *   5. Related products
 *
 * What's modernized vs OG:
 *   - Type scale aligned to the PM design system (Google Sans Flex,
 *     locked sizes 11/12/13/14/15/22/26/32)
 *   - Stock pill replaced with subtle dot + green text
 *   - No empty "Was:" / "You save" / "MSRP" fields
 *   - Single Mfg Part # line (not the SKU/MPN/UPC trio)
 *   - Subtle border-tops between sections instead of heavy dividers
 *
 * What's deliberately dropped per design feedback:
 *   - Reviews / star rating
 *   - "Need help selecting?" advisor card
 *   - Documentation placeholder section
 *   - Sticky in-page section nav
 *   - The Mfg Part / PM Part / UPC strip up top
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  House,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { usePmQuote } from '~/lib/pm-quote-store';
import { usePmRecentlyViewed } from '~/lib/pm-recently-viewed-store';
import {
  PmBundleOptions,
  resolveUnitPriceAtQty,
} from '~/components/pm-bundle-options';
import { PmProductGallery } from '~/components/pm-product-gallery';
import { PmProductGrid } from '~/components/pm-product-grid';
import { PmAddToListButton } from '~/components/pm-add-to-list-menu';
import type { PmProductDetailProps } from './pm-product-detail.types';
import type { PmProductSpec } from '~/lib/pm-product-by-slug';

// Fuzzy spec lookup — case + punctuation insensitive.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function pickSpec(
  specs: PmProductSpec[],
  aliases: string[],
): string | undefined {
  const targets = new Set(aliases.map(norm));
  return specs.find((s) => targets.has(norm(s.name)))?.value;
}

const MPN_ALIASES = [
  'MPN',
  'Manufacturer Part Number',
  'Mfg Part Number',
  'Mfg. Part Number',
  'Manufacturer Part',
  'Part Number',
];
const UPC_ALIASES = ['UPC', 'Universal Product Code', 'EAN', 'UPC/EAN'];
const BOX_ALIASES = [
  "What's in the Box",
  'Box Contents',
  'In the Box',
  'Package Contents',
];
const FEATURE_ALIASES = [
  'Key Features',
  'Features',
  'Highlights',
  'Bullet Points',
];

// Specs whose values we render in dedicated UI surfaces — hide them from the
// generic Specifications table to avoid showing the same data twice.
const HIDDEN_SPEC_NORMS = new Set(
  [...MPN_ALIASES, ...UPC_ALIASES, ...BOX_ALIASES, ...FEATURE_ALIASES].map(
    norm,
  ),
);

// Split a multi-bullet field into individual list items.
function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|•|•|;\s*|,\s+(?=[A-Z(])/)
    .map((s) => s.trim().replace(/^[-*]\s*/, ''))
    .filter((s) => s.length > 0);
}

// Initial number of spec rows to show before the user expands the table.
// 8 rows cover the most-asked questions (CPU / cores / clock / cache /
// memory / form factor / power / storage) without making the page scroll
// past the buy box.
const INITIAL_SPEC_ROWS = 8;

export function PmProductDetail({ product }: PmProductDetailProps) {
  const { addLines, open } = usePmQuote();
  const { trackView } = usePmRecentlyViewed();
  const [qty, setQty] = useState<number>(1);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  // Per-modifier selection state. Keyed by BC modifier entityId. A null
  // value means "None" — no bundle item added for that modifier.
  // Default qty=1 because the option is meaningless at qty=0.
  const [bundleState, setBundleState] = useState<
    Record<number, { selectedValueId: number | null; quantity: number }>
  >(() => {
    const init: Record<number, { selectedValueId: number | null; quantity: number }> = {};
    for (const m of product.bundleModifiers ?? []) {
      // Honor BC's isDefault flag on the first value when present —
      // otherwise default to "None" (null) for optional modifiers,
      // and to the first value for required ones.
      const defaultValue = m.values.find((v) =>
        m.isRequired ? true : false,
      );
      init[m.modifierId] = {
        selectedValueId: defaultValue ? defaultValue.valueId : null,
        quantity: 1,
      };
    }
    return init;
  });

  const heroImageUrl = useMemo(
    () => product.galleryImages[0]?.url,
    [product.galleryImages],
  );

  // Record this PDP visit in the recently-viewed store. Re-runs only when
  // the underlying product identity changes (sku) so client-side route
  // remounts to the same PDP don't re-track. Live data we capture: SKU
  // (dedupe key), title, brand, price, stock, hero image, and href so
  // the recently-viewed grid can link straight back to this page.
  useEffect(() => {
    trackView({
      sku: product.sku,
      title: product.name,
      href: product.href,
      imageUrl: heroImageUrl,
      brand: product.brand,
      priceLabel: product.priceLabel,
      inStock: product.inStock,
    });
  }, [
    product.sku,
    product.name,
    product.href,
    product.brand,
    product.priceLabel,
    product.inStock,
    heroImageUrl,
    trackView,
  ]);

  // Single part-number we surface in the info pane (OG-style, just one line).
  // Prefer MPN from customFields; fall back to BC sku if specs don't carry it.
  const mpn = pickSpec(product.specs, MPN_ALIASES) ?? product.sku;

  // Heuristic-extracted bulleted fields.
  const boxContents = splitList(pickSpec(product.specs, BOX_ALIASES));
  const keyFeatures = splitList(pickSpec(product.specs, FEATURE_ALIASES));

  // Specs to render in the main table (extracted ones removed).
  const visibleSpecs = product.specs.filter(
    (s) => !HIDDEN_SPEC_NORMS.has(norm(s.name)),
  );

  // Highlights preview shown in the details column. Prefer a curated
  // "Key Features" field when the BC admin set one; otherwise fall back
  // to the first three meaningful specs ("Model: AS6712X", "CPU: Quad-
  // Core 2.0 GHz", "Bays: 12") so the block always carries something
  // useful instead of disappearing.
  const detailsHighlights: Array<{ label?: string; value: string }> = (() => {
    if (keyFeatures.length > 0) {
      return keyFeatures.slice(0, 3).map((value) => ({ value }));
    }
    return visibleSpecs.slice(0, 3).map((s) => ({
      label: s.name,
      value: s.value,
    }));
  })();

  // Materialize the active bundle picks — each modifier with a non-"None"
  // selection becomes a (linkedProduct, qty, adjuster, tieredUnitPrice)
  // tuple. The tiered unit price is resolved against BC's bulk-pricing
  // rules so picking qty=2 on the WD SSD reflects the $619.99/each tier
  // BC has configured (not the $529.99 base-of-1 price).
  const activeBundlePicks = useMemo(() => {
    const picks: Array<{
      productId: number;
      sku: string;
      name: string;
      href: string;
      imageUrl?: string;
      /** Per-unit price after applying BC bulk-pricing tiers at this qty */
      unitPriceValue: number;
      /** Formatted per-unit price string for the cart line */
      unitPriceLabel: string;
      quantity: number;
      inStock: boolean;
      basePriceAdjuster?: { type: 'percentage' | 'relative'; value: number };
    }> = [];
    for (const m of product.bundleModifiers ?? []) {
      const state = bundleState[m.modifierId];
      if (!state || state.selectedValueId === null) continue;
      const value = m.values.find((v) => v.valueId === state.selectedValueId);
      if (!value) continue;
      const qtyHere = Math.max(1, state.quantity);
      const unitPriceValue = resolveUnitPriceAtQty(value, qtyHere);
      const unitPriceLabel = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(unitPriceValue);
      picks.push({
        productId: value.productId,
        sku: value.productSku,
        name: value.productName,
        href: value.productHref,
        imageUrl: value.productImageUrl,
        unitPriceValue,
        unitPriceLabel,
        quantity: qtyHere,
        inStock: value.productInStock,
        basePriceAdjuster: value.basePriceAdjuster,
      });
    }
    return picks;
  }, [product.bundleModifiers, bundleState]);

  // Bundle add-on $ contribution per single "cart qty" of the base — sum
  // of (tiered unit price × bundle qty) for each pick. The PDP buy-box
  // multiplies this by the cart qty for the final preview.
  const bundleAddOnPerBase = useMemo(
    () =>
      activeBundlePicks.reduce(
        (sum, p) => sum + p.unitPriceValue * p.quantity,
        0,
      ),
    [activeBundlePicks],
  );

  // Effective base unit price after applying whatever BC's modifier
  // value adjusters do. Percentage adjusters multiply (`-3` → ×0.97);
  // relative adjusters add (`-50` → $50 off). When the admin left the
  // adjuster empty the base passes through unchanged. This number IS
  // BC's data — `value.basePriceAdjuster` came straight from BC's
  // `adjusters.price` field via REST. No parsing of display names, no
  // hardcoded percentages.
  const effectiveBaseUnit = useMemo(() => {
    if (typeof product.priceValue !== 'number') return 0;
    let base = product.priceValue;
    for (const pick of activeBundlePicks) {
      const adj = pick.basePriceAdjuster;
      if (!adj) continue;
      if (adj.type === 'percentage') base = base * (1 + adj.value / 100);
      else if (adj.type === 'relative') base = base + adj.value;
    }
    return base;
  }, [product.priceValue, activeBundlePicks]);

  // Final price preview: (effective base + bundle add-ons) × cart qty.
  const previewTotalLabel = useMemo(() => {
    if (typeof product.priceValue !== 'number') return product.priceLabel;
    const total = (effectiveBaseUnit + bundleAddOnPerBase) * Math.max(1, qty);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(total);
  }, [product.priceValue, product.priceLabel, effectiveBaseUnit, bundleAddOnPerBase, qty]);

  // Formatted effective base unit (for the cart line). Falls back to the
  // BC label when the product has no priceValue.
  const effectiveBaseLabel = useMemo(() => {
    if (typeof product.priceValue !== 'number') return product.priceLabel;
    if (effectiveBaseUnit === product.priceValue) return product.priceLabel;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(effectiveBaseUnit);
  }, [product.priceValue, product.priceLabel, effectiveBaseUnit]);

  const handleAddToCart = () => {
    // First line: the base product. Unit price reflects whatever BC's
    // modifier adjuster does to the base when an option is selected — so
    // the cart subtotal matches the PDP preview and BC's checkout.
    const lines = [
      {
        sku: product.sku,
        qty,
        title: product.name,
        imageUrl: heroImageUrl,
        unitPrice: effectiveBaseLabel,
        brand: product.brand,
        inStock: product.inStock,
        productEntityId: product.id,
      },
    ];

    // Bundle-option lines: each pick = its own cart line, quantity scaled
    // by the cart qty so a user buying 2 NAS units with a 3× SSD pick
    // ends up with 6 SSDs. Inventory tracks correctly on the SSD's own
    // SKU; BC handles tax/shipping/promotions per-line.
    for (const pick of activeBundlePicks) {
      lines.push({
        sku: pick.sku,
        qty: pick.quantity * qty,
        title: pick.name,
        imageUrl: pick.imageUrl,
        // Tier-resolved per-unit price — so the cart subtotal matches
        // the PDP preview (and BC checkout, since BC applies the same
        // bulk-pricing rule at its end).
        unitPrice: pick.unitPriceLabel,
        brand: undefined,
        inStock: pick.inStock,
        productEntityId: pick.productId,
      });
    }

    addLines(lines);
    open();
  };

  return (
    <main className="bg-white">
      {/* ===== Breadcrumb (mirror of PmCategoryListing) =====
          Renders the full BC ancestor chain (root → leaf) between Home and
          the product name. Each ancestor is clickable when we could resolve
          a category slug; otherwise it falls back to plain text so a stale
          BC path can't strand the user on a 404. */}
      <div className="w-full px-6 pt-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[14px] text-pm-ink-500"
        >
          <Link
            href="/dev/preview"
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
          >
            <House size={14} strokeWidth={1.75} />
            <span>Home</span>
          </Link>
          {product.categoryTrail.map((crumb) => (
            <span
              key={`${crumb.label}-${crumb.href}`}
              className="inline-flex items-center gap-2"
            >
              <ChevronRight
                size={14}
                strokeWidth={2}
                className="text-pm-ink-300"
              />
              {crumb.href === '#' ? (
                <span className="text-pm-ink-500">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded-md px-1 py-0.5 text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="text-pm-ink-300"
          />
          <span className="min-w-0 truncate font-semibold text-pm-ink-900">
            {product.name}
          </span>
        </nav>
      </div>

      {/* ===== Two-column main =====
          LEFT  — Gallery (~480px cap with vertical thumbs)
          RIGHT — Info pane that itself splits at md+ into:
                    - Details column (title, brand link, SKU, MPN, price,
                      UPC, Shipping & Returns button)
                    - Buy-box card (Availability, Qty, Add to Cart) */}
      <section className="w-full px-6 pb-14 pt-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,488px)_minmax(0,1fr)] lg:gap-12">
          <div className="flex justify-start">
            <PmProductGallery
              images={product.galleryImages}
              productName={product.name}
              sku={product.sku}
            />
          </div>

          {/* RIGHT — Info pane (details + buy-box card).
              - Buy-box is 360px so the bundle card fits a 4TB WD SSD
                title without aggressive truncation.
              - Inner grid is capped at 1080px so on wide monitors the
                buy-box stops shy of the right edge instead of flying out
                to it — keeps the details content and the buy-box visually
                paired in the middle/left third of the page.
              - Gap trimmed from 40px to 24px (md:gap-10 → md:gap-6) so
                the two columns read as one buy-area, not two islands. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:gap-6 lg:max-w-[1080px]">
            {/* DETAILS column */}
            <div className="flex flex-col">
              <h1 className="text-[24px] font-bold leading-[1.25] tracking-[-0.012em] text-pm-ink-900">
                {product.name}
              </h1>

              {product.brand && (
                <Link
                  href="/dev/preview/brands"
                  className="mt-2.5 inline-block self-start text-[14px] font-semibold text-pm-navy-mid underline-offset-[3px] transition-colors hover:text-pm-navy-deep hover:underline"
                >
                  {product.brand}
                </Link>
              )}

              {/* SKU + MPN, paired (OG style). Both lines always render. If
                  the catalog doesn't carry a separate MPN customField, the
                  heuristic falls back to product.sku — that's intentional so
                  the data row is always present and the layout is stable. */}
              <div className="mt-3 space-y-0.5 text-[13px] text-pm-ink-600">
                <div>
                  <span className="font-semibold uppercase tracking-[0.04em]">
                    SKU:
                  </span>{' '}
                  <span className="text-pm-ink-900">{product.sku}</span>
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-[0.04em]">
                    MPN:
                  </span>{' '}
                  <span className="text-pm-ink-900">{mpn}</span>
                </div>
              </div>

              {/* Price (above divider). When the user has picked any
                  bundle add-ons, the displayed number reflects the live
                  total (base + add-ons × qty); otherwise it's just the
                  base price as before. The smaller sublabel makes it
                  clear that any extra reflects the bundle choice. */}
              <div className="mt-5 border-t border-pm-ink-200 pt-5">
                {product.priceLabel ? (
                  <>
                    <div className="text-[32px] font-bold leading-none text-pm-ink-900">
                      {previewTotalLabel}
                    </div>
                    {bundleAddOnPerBase > 0 && (
                      <div className="mt-1.5 text-[12px] leading-snug text-pm-ink-500">
                        Includes {product.priceLabel} base + bundle add-ons
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[16px] font-semibold text-pm-ink-700">
                    Quote pricing on request
                  </div>
                )}
              </div>

              {/* UPC (below price, low-key like OG) */}
              {product.upc && (
                <div className="mt-2.5 text-[13px] text-pm-ink-500">
                  <span className="font-semibold uppercase tracking-[0.04em]">
                    UPC:
                  </span>{' '}
                  <span className="text-pm-ink-700">{product.upc}</span>
                </div>
              )}

              {/* Shipping and Returns — outline button */}
              <Link
                href="/dev/preview/shipping-returns"
                className="mt-6 inline-flex items-center gap-2 self-start rounded-md border border-pm-ink-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100"
              >
                <Truck size={15} strokeWidth={2} />
                Shipping and Returns
              </Link>

              {/* ===== Highlights (top 3, with spec fallback) =====
                  Surfaces a quick "what is this thing" digest beside the
                  gallery. Prefers admin-curated "Key Features"; falls
                  back to the first three specs so the block stays useful
                  even on products where the BC admin didn't write a
                  features list. The full feature grid + spec table live
                  in the Description section below — the link anchors to
                  it for the long version. */}
              {detailsHighlights.length > 0 && (
                <div className="mt-6 border-t border-pm-ink-200 pt-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
                    {keyFeatures.length > 0 ? 'Key features' : 'At a glance'}
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-2 text-[13px] leading-[1.5] text-pm-ink-800">
                    {detailsHighlights.map((h, i) => (
                      <li
                        key={`pdp-hl-${i}`}
                        className="flex items-start gap-2.5"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pm-terracotta"
                        />
                        <span>
                          {h.label && (
                            <span className="font-semibold text-pm-ink-900">
                              {h.label}:
                            </span>
                          )}{' '}
                          {h.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="#pm-product-description"
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-pm-navy-mid underline-offset-[3px] hover:text-pm-navy-deep hover:underline"
                  >
                    See full details & specs
                    <ChevronDown size={14} strokeWidth={2} />
                  </Link>
                </div>
              )}
            </div>

            {/* BUY BOX card */}
            <aside className="flex h-fit flex-col rounded-md border border-pm-ink-200 bg-white p-5 shadow-sm">
              {/* Bundle options block — one per BC modifier. When the admin
                  hasn't configured any bundle modifiers in BC, this whole
                  section collapses to nothing and the buy-box reads exactly
                  like a non-bundle PDP. */}
              {(product.bundleModifiers ?? []).length > 0 && (
                <div className="mb-5 flex flex-col gap-3">
                  {product.bundleModifiers.map((mod) => (
                    <PmBundleOptions
                      key={mod.modifierId}
                      modifier={mod}
                      selectedValueId={
                        bundleState[mod.modifierId]?.selectedValueId ?? null
                      }
                      quantity={bundleState[mod.modifierId]?.quantity ?? 1}
                      onChange={(next) =>
                        setBundleState((prev) => ({
                          ...prev,
                          [mod.modifierId]: next,
                        }))
                      }
                    />
                  ))}
                </div>
              )}

              <div className="text-[13px] text-pm-ink-700">Availability</div>
              {product.inStock ? (
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[20px] font-bold leading-tight text-pm-success">
                    {product.stockQuantity != null
                      ? `${product.stockQuantity.toLocaleString()} in stock`
                      : 'In stock'}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[16px] font-bold text-pm-warning">
                  Out of stock
                </div>
              )}

              <label
                htmlFor="pm-pdp-qty"
                className="mt-5 block text-[13px] font-medium text-pm-ink-700"
              >
                Quantity:
              </label>
              <div className="mt-1.5 flex items-stretch overflow-hidden self-start rounded-md border border-pm-ink-200">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="h-10 w-9 bg-white text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <input
                  id="pm-pdp-qty"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const next = Math.max(
                      1,
                      Math.floor(Number(e.target.value) || 1),
                    );
                    setQty(next);
                  }}
                  aria-label="Quantity"
                  className="w-12 border-x border-pm-ink-200 text-center text-[14px] text-pm-ink-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="h-10 w-9 bg-white text-pm-ink-700 transition-colors hover:bg-pm-ink-100"
                >
                  +
                </button>
              </div>

              {product.inStock && (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
                >
                  <ShoppingCart size={15} strokeWidth={2} />
                  Add to Cart
                </button>
              )}

              {/* Add to List — live, backed by pm-lists-store (localStorage). */}
              <div className={product.inStock ? 'mt-2' : 'mt-5'}>
                <PmAddToListButton
                  item={{
                    sku: product.sku,
                    qty,
                    title: product.name,
                    imageUrl: heroImageUrl,
                    brand: product.brand,
                    unitPrice: product.priceLabel,
                    href: product.href,
                  }}
                />
              </div>

              {/* Add to Quote — promoted to primary CTA (terracotta) when the
                  product is OOS, since it's the only purchase path available.
                  Stub action until B2B Ninja quote-request integration ships. */}
              <button
                type="button"
                title="Quote requests — coming with B2B Ninja"
                className={
                  product.inStock
                    ? 'mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-pm-ink-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100'
                    : 'mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light'
                }
              >
                <FileText
                  size={product.inStock ? 14 : 15}
                  strokeWidth={2}
                />
                Add to Quote
              </button>
            </aside>
          </div>
        </div>
      </section>

      {/* ===== Description ‖ Specifications (parallel, flat, no card chrome) =====
          Side-by-side at lg+ so the page stays compact even when both
          have a lot of content. Description gets the wider (1.4fr) left
          column since it's prose; specs gets the narrower (1fr) right
          column laid out as a single stacked label/value column —
          tabular data doesn't need much width. Stacks at <lg. */}
      <section
        id="pm-product-description"
        className="scroll-mt-24 border-t border-pm-ink-200 bg-pm-paper"
      >
        <div className="w-full px-6 py-14">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
            {/* LEFT — Description (wider) */}
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-pm-ink-900">
                Description
              </h2>
              {product.shortDescription ? (
                <div className="mt-5 space-y-4 text-[15px] leading-[1.7] text-pm-ink-700">
                  {product.shortDescription.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-[14px] leading-[1.55] text-pm-ink-500">
                  A long-form description for this part is not yet published.
                  Reach out to your account manager for spec sheets and
                  configuration guidance.
                </p>
              )}

              {keyFeatures.length > 0 && (
                <div className="mt-10">
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
                    Key features
                  </div>
                  <ul className="mt-3 grid gap-x-8 gap-y-2.5 text-[14px] leading-[1.6] text-pm-ink-800 sm:grid-cols-2">
                    {keyFeatures.map((f, i) => (
                      <li
                        key={`${i}-${f.slice(0, 12)}`}
                        className="flex items-start gap-2.5"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pm-terracotta"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* RIGHT — Specifications (narrower, single-column tabular) */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[22px] font-bold tracking-tight text-pm-ink-900">
                  Specifications
                </h2>
                {visibleSpecs.length > 0 && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pm-ink-500">
                    {visibleSpecs.length}{' '}
                    {visibleSpecs.length === 1 ? 'spec' : 'specs'}
                  </span>
                )}
              </div>

              {visibleSpecs.length > 0 ? (
                // Two-column table: label left (~40%), value right. Hairline
                // dividers and zebra-striping (alternating contrast-50 bg)
                // make a long spec sheet scannable without heavy chrome.
                // Long sheets collapse to INITIAL_SPEC_ROWS until the user
                // expands — keeps the buy box visible above the fold.
                <>
                  <dl className="mt-5 overflow-hidden rounded-md border border-pm-ink-200">
                    {(specsExpanded
                      ? visibleSpecs
                      : visibleSpecs.slice(0, INITIAL_SPEC_ROWS)
                    ).map((spec, i) => (
                      <div
                        key={`${spec.name}-${i}`}
                        className={`grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-x-4 px-3.5 py-2.5 ${
                          i % 2 === 0 ? 'bg-pm-paper' : 'bg-white'
                        } ${i > 0 ? 'border-t border-pm-ink-200' : ''}`}
                      >
                        <dt className="text-[12.5px] font-medium leading-[1.45] text-pm-ink-600">
                          {spec.name}
                        </dt>
                        <dd className="text-[13px] leading-[1.45] text-pm-ink-900">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {visibleSpecs.length > INITIAL_SPEC_ROWS && (
                    <button
                      type="button"
                      onClick={() => setSpecsExpanded((v) => !v)}
                      aria-expanded={specsExpanded}
                      className="mt-3 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 text-[13px] font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-deep"
                    >
                      <ChevronDown
                        size={14}
                        strokeWidth={2.25}
                        className={`transition-transform duration-[160ms] ${
                          specsExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      {specsExpanded
                        ? 'Show fewer specs'
                        : `Show ${visibleSpecs.length - INITIAL_SPEC_ROWS} more spec${
                            visibleSpecs.length - INITIAL_SPEC_ROWS === 1 ? '' : 's'
                          }`}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-5 text-[14px] leading-[1.55] text-pm-ink-500">
                  Detailed specifications for this part are not yet
                  published. Reach out to your account manager — dimensions,
                  voltage, capacity, and supported configurations will be
                  confirmed within one business day.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== What's in the box (only if extracted) ===== */}
      {/* White bg to alternate against the warm pm-paper Description ‖
          Specifications block above. */}
      {boxContents.length > 0 && (
        <section className="border-t border-pm-ink-200 bg-white">
          <div className="w-full px-6 py-12">
            <h2 className="text-[22px] font-bold tracking-tight text-pm-ink-900">
              What&apos;s in the box
            </h2>
            <ul className="mt-6 grid max-w-[780px] gap-2.5 text-[14px] leading-[1.55] text-pm-ink-700 sm:grid-cols-2">
              {boxContents.map((item, i) => (
                <li
                  key={`${i}-${item.slice(0, 12)}`}
                  className="flex items-start gap-2.5"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pm-terracotta"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ===== Related products ===== */}
      {product.related.length > 0 && (
        <PmProductGrid
          eyebrow="Related"
          title="Customers also looked at"
          linkLabel="View full catalog"
          linkHref="/dev/preview"
          products={product.related}
        />
      )}
    </main>
  );
}


'use client';

/**
 * PmBundleOptions
 * ---------------
 * Renders the "Bundle and get N% off" block on a PDP for products that
 * have BC ProductPickList modifiers configured. Replaces the legacy
 * Stencil pattern of N separate "Pack of 2 / 3 / 4 / 5" rows with
 * ONE option row + a quantity stepper that multiplies it.
 *
 * Pricing model is intentionally simple: bundle option price × qty.
 * Any volume discount is set up admin-side on the linked product's
 * price tiers in BC, so the same product price flows through both the
 * standalone PDP and the bundle UI. No discount math in code.
 *
 * Layout: each linked-product option is a single `<li>`. When the option
 * is checked, its `<li>` expands in place to reveal a quantity stepper
 * and the live add-on subtotal — so the x1 → xN affordance is visually
 * attached to the bundle item it controls, not floating below the list.
 *
 * State shape — managed by the parent (PDP) so it can compute the
 * total + thread the picks into the Add-to-Cart payload:
 *
 *   selectedValueId: number | null   // null = "None" (no bundle item)
 *   quantity:        number          // ignored when selectedValueId === null
 *
 * Out-of-stock options stay clickable but flagged. Inventory checks
 * happen authoritatively at checkout (BC); this is a UX preview.
 */

import { Minus, Plus, Check } from 'lucide-react';
import { Image } from '~/components/image';
import type {
  PmBundleModifier,
  PmBundleOption,
} from '~/lib/pm-product-by-slug';

/** One bundle pick — option + qty. Modifier-level picks list these. */
export interface PmBundlePick {
  valueId: number;
  quantity: number;
}

export interface PmBundleOptionsProps {
  modifier: PmBundleModifier;
  /**
   * Currently-selected picks for this modifier. Empty array = "None"
   * picked. Single-select modifiers always have 0 or 1 entries;
   * multi-select can have 0..N. Order is preserved (most recent pick
   * appended).
   */
  picks: PmBundlePick[];
  /** Callback fired with the new picks list whenever it changes. */
  onChange: (nextPicks: PmBundlePick[]) => void;
}

function formatUSD(value: number): string {
  // Keep cents — Asustor + WD bundle prices end in .99 and the legacy site
  // shows them in full.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Resolve the per-unit price for a bundle option at the given qty,
 * honoring any BC bulk-pricing tiers configured on the linked product.
 *
 * Without tiers the base price applies regardless of qty. With tiers,
 * we scan ascending and apply the LAST tier whose [min, max] window
 * contains the qty — matching BC's own pricing engine semantics.
 *
 *   - fixedPrice: per-unit price replaces the base
 *   - percentOff: discount as % off base
 */
export function resolveUnitPriceAtQty(
  option: PmBundleOption,
  qty: number,
): number {
  const base = option.productPriceValue;
  const tiers = option.bulkPricingTiers ?? [];
  let perUnit = base;
  for (const t of tiers) {
    const fitsLower = qty >= t.minimumQuantity;
    const fitsUpper = t.maximumQuantity == null || qty <= t.maximumQuantity;
    if (!fitsLower || !fitsUpper) continue;
    if (t.fixedPrice != null) perUnit = t.fixedPrice;
    else if (t.percentOff != null) perUnit = base * (1 - t.percentOff / 100);
  }
  return perUnit;
}

export function PmBundleOptions({
  modifier,
  picks,
  onChange,
}: PmBundleOptionsProps) {
  // Modifier-level cap from `(max N)` on the modifier name. Each option
  // can override via its own label suffix; we resolve per-row below.
  const modifierMaxQty = modifier.maxQty;
  const isMulti = modifier.multiSelect === true;

  // Quick lookup: is this option currently picked? In single mode picks
  // has 0 or 1 entry; in multi mode it can have many.
  const findPickIdx = (valueId: number): number =>
    picks.findIndex((p) => p.valueId === valueId);

  const clamp = (n: number, cap: number | undefined): number => {
    const lo = Math.max(1, Math.floor(Number(n) || 1));
    return cap != null ? Math.min(lo, cap) : lo;
  };

  /**
   * Toggle/select an option. Behavior depends on modifier.multiSelect:
   *
   *   Single (radio): replaces picks with [valueId] (or [] if "None").
   *                   Resets qty to 1 when switching to a different
   *                   option; preserves qty when re-tapping the same.
   *
   *   Multi (checkbox): toggles inclusion. New picks are appended at
   *                     qty=1; existing picks are removed entirely on
   *                     toggle-off. "None" (valueId=null) clears all
   *                     picks for this modifier.
   */
  const togglePick = (valueId: number | null) => {
    if (valueId === null) {
      onChange([]);
      return;
    }
    if (isMulti) {
      const idx = findPickIdx(valueId);
      if (idx >= 0) {
        // Already picked → remove.
        onChange(picks.filter((_, i) => i !== idx));
      } else {
        // Not yet picked → append at qty=1.
        onChange([...picks, { valueId, quantity: 1 }]);
      }
      return;
    }
    // Single mode — replace the picks list entirely.
    const existingIdx = findPickIdx(valueId);
    if (existingIdx >= 0) {
      // Re-tap of the only selected option: keep qty.
      onChange([picks[existingIdx]]);
    } else {
      onChange([{ valueId, quantity: 1 }]);
    }
  };

  /** Update qty for a specific pick. Identifies the pick by valueId. */
  const setPickQty = (valueId: number, nextQty: number, capForPick?: number) => {
    const next = picks.map((p) =>
      p.valueId === valueId ? { ...p, quantity: clamp(nextQty, capForPick) } : p,
    );
    onChange(next);
  };

  // "None" row checked state: in BOTH modes, "None" is checked when the
  // picks list is empty. (Multi-select shows None too, as a clear-all
  // shortcut.)
  const noneChecked = picks.length === 0;

  return (
    <div className="rounded-lg border border-pm-ink-200 bg-pm-paper">
      <div className="border-b border-pm-ink-200 px-4 py-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {modifier.displayName}
        </h3>
      </div>

      <ul className="flex flex-col">
        {/* "None" — synthesized client-side. BC's ProductPickList can't
            hold a value without a productId, so this row exists only in
            the UI as the explicit opt-out. Hidden when the admin marks
            the modifier required, since the user must then pick a real
            option. */}
        {!modifier.isRequired && (
          <BundleOptionRow
            checked={noneChecked}
            indicator={isMulti ? 'checkbox' : 'radio'}
            onSelect={() => togglePick(null)}
            label="None"
            sublabel={isMulti ? 'Clear all picks' : 'Just the base product'}
          />
        )}

        {modifier.values.map((v) => {
          const pickIdx = findPickIdx(v.valueId);
          const isSelected = pickIdx >= 0;
          const pickQty = isSelected ? picks[pickIdx].quantity : 1;
          // Per-unit price at THIS row's currently-displayed qty. Unchecked
          // rows show the base price (`$X each`); checked rows reflect any
          // bulk-pricing tier that kicks in at qty 2+.
          const effectiveQty = Math.max(1, pickQty);
          const unitPriceAtQty = resolveUnitPriceAtQty(v, effectiveQty);
          const rowLineTotal = unitPriceAtQty * effectiveQty;
          // Per-option cap (label `(max N)`) wins over modifier-level cap.
          const rowMaxQty = v.maxQty ?? modifierMaxQty;
          return (
            <BundleOptionRow
              key={v.valueId}
              checked={isSelected}
              indicator={isMulti ? 'checkbox' : 'radio'}
              onSelect={() => togglePick(v.valueId)}
              label={v.label}
              sublabel={v.productSku}
              priceLabel={`${formatUSD(unitPriceAtQty)} each`}
              imageUrl={v.productImageUrl}
              inStock={v.productInStock}
              // Qty stepper appears inline inside each selected row. In
              // multi-select this means multiple inline steppers — one
              // per checked option — exactly the "buy a few of each" UX.
              expandedQty={
                isSelected
                  ? {
                      quantity: pickQty,
                      maxQty: rowMaxQty,
                      onIncrement: () => setPickQty(v.valueId, pickQty + 1, rowMaxQty),
                      onDecrement: () => setPickQty(v.valueId, pickQty - 1, rowMaxQty),
                      onInput: (n) => setPickQty(v.valueId, n, rowMaxQty),
                      addOnLabel: formatUSD(rowLineTotal),
                    }
                  : undefined
              }
            />
          );
        })}
      </ul>
    </div>
  );
}

// ── Single option row + optional inline qty expansion ─────────────────────

interface BundleOptionRowProps {
  checked: boolean;
  /**
   * Visual style of the selection indicator. `radio` is the circular
   * one-of-N indicator (single-select modifiers). `checkbox` is the
   * square multi-select indicator (multi-select modifiers). Both share
   * the same checkmark + brand fill style; only the corner radius
   * changes.
   */
  indicator?: 'radio' | 'checkbox';
  onSelect: () => void;
  label: string;
  sublabel?: string;
  priceLabel?: string;
  imageUrl?: string;
  inStock?: boolean;
  // When provided, the row is selected and renders the inline qty
  // stepper + add-on subtotal beneath the radio header. In multi mode
  // multiple rows can each render their own stepper independently.
  expandedQty?: {
    quantity: number;
    /** Hard upper bound. Undefined = unlimited. */
    maxQty?: number;
    onIncrement: () => void;
    onDecrement: () => void;
    onInput: (n: number) => void;
    addOnLabel: string;
  };
}

function BundleOptionRow({
  checked,
  indicator = 'radio',
  onSelect,
  label,
  sublabel,
  priceLabel,
  imageUrl,
  inStock,
  expandedQty,
}: BundleOptionRowProps) {
  return (
    <li
      className={`border-b border-pm-ink-200 last:border-b-0 ${
        checked ? 'bg-pm-tan-pale' : 'bg-white'
      }`}
    >
      {/* Header — indicator + image + label/sku/price. The full row is
          the click target so users can toggle anywhere along the line. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={checked}
        className="flex min-h-[44px] w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-pm-ink-100/40"
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
            indicator === 'checkbox' ? 'rounded-[4px]' : 'rounded-full'
          } ${
            checked
              ? 'border-pm-terracotta bg-pm-terracotta text-white'
              : 'border-pm-ink-300 bg-white'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>

        {imageUrl && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100">
            <Image
              src={imageUrl}
              alt=""
              width={40}
              height={40}
              sizes="40px"
              className="h-full w-full object-contain p-1"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 break-words text-[13px] font-semibold leading-[1.35] text-pm-ink-900">
            {label}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px]">
            {sublabel && (
              <span className="truncate text-pm-ink-500">
                {sublabel}
                {inStock === false && (
                  <span className="ml-1 font-semibold text-pm-warning">
                    • Out of stock
                  </span>
                )}
              </span>
            )}
            {priceLabel && (
              <span className="shrink-0 text-[12px] font-semibold text-pm-navy-deep">
                {priceLabel}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Inline qty expansion — only on the selected row. Anchored to the
          row visually so the user sees "this WD SSD × N" as one thing.
          Click handlers stopPropagation so qty taps don't bubble up to
          the row-level onSelect. */}
      {expandedQty && (() => {
        // Hard cap from the admin-set `(max N)` on the modifier name.
        // We disable the + button at the cap, clamp the typed input,
        // and surface "N of M slots" so the user understands why.
        const atMax =
          expandedQty.maxQty != null && expandedQty.quantity >= expandedQty.maxQty;
        return (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pm-ink-200/60 bg-white/70 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-pm-ink-700">
                Quantity
              </span>
              <div
                className="flex items-stretch overflow-hidden rounded-md border border-pm-ink-200 bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandedQty.onDecrement();
                  }}
                  disabled={expandedQty.quantity <= 1}
                  aria-label="Decrease bundle quantity"
                  className="h-11 w-11 sm:h-8 sm:w-8 text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={14} strokeWidth={2} className="mx-auto" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={expandedQty.maxQty}
                  value={expandedQty.quantity}
                  onChange={(e) => expandedQty.onInput(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Bundle quantity"
                  className="w-14 sm:w-12 border-x border-pm-ink-200 text-center text-[14px] sm:text-[13px] font-semibold text-pm-ink-900 outline-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandedQty.onIncrement();
                  }}
                  disabled={atMax}
                  aria-label="Increase bundle quantity"
                  className="h-11 w-11 sm:h-8 sm:w-8 text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={14} strokeWidth={2} className="mx-auto" />
                </button>
              </div>
              {expandedQty.maxQty != null && (
                <span
                  className={`text-[11px] ${atMax ? 'font-semibold text-pm-warning' : 'text-pm-ink-500'}`}
                  title={`This product has ${expandedQty.maxQty} slots`}
                >
                  of {expandedQty.maxQty}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-pm-ink-500">
                Add-on
              </div>
              <div className="text-[14px] font-bold text-pm-navy-deep">
                +{expandedQty.addOnLabel}
              </div>
            </div>
          </div>
        );
      })()}
    </li>
  );
}

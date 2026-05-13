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
 * State shape — managed by the parent (PDP) so it can compute the
 * total + thread the picks into the Add-to-Cart payload:
 *
 *   selectedValueId: number | null   // null = "None" (no bundle item)
 *   quantity:        number          // ignored when selectedValueId === null
 *
 * Out-of-stock options stay clickable but flagged — admin gets a clear
 * "WD 4TB SSD — Out of stock" hint in the radio row. Inventory checks
 * happen authoritatively at checkout (BC); this is a UX preview.
 */

import { Minus, Plus, Check } from 'lucide-react';
import { Image } from '~/components/image';
import type {
  PmBundleModifier,
  PmBundleOption,
} from '~/lib/pm-product-by-slug';

export interface PmBundleOptionsProps {
  modifier: PmBundleModifier;
  selectedValueId: number | null;
  quantity: number;
  onChange: (next: { selectedValueId: number | null; quantity: number }) => void;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PmBundleOptions({
  modifier,
  selectedValueId,
  quantity,
  onChange,
}: PmBundleOptionsProps) {
  const selectedValue: PmBundleOption | undefined = modifier.values.find(
    (v) => v.valueId === selectedValueId,
  );
  const showQty = !!selectedValue;
  const bundleTotal = selectedValue
    ? selectedValue.productPriceValue * Math.max(1, quantity)
    : 0;

  const select = (valueId: number | null) => {
    // When the user re-selects "None", reset qty back to 1 so the next
    // option pick starts from a sane state.
    onChange({
      selectedValueId: valueId,
      quantity: valueId === null ? 1 : Math.max(1, quantity),
    });
  };
  const setQty = (next: number) => {
    onChange({
      selectedValueId,
      quantity: Math.max(1, Math.floor(Number(next) || 1)),
    });
  };

  return (
    <div className="rounded-lg border border-pm-ink-200 bg-pm-paper">
      <div className="border-b border-pm-ink-200 px-4 py-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {modifier.displayName}
        </h3>
      </div>

      <ul className="flex flex-col">
        {/* "None" — synthesized client-side. BC's ProductPickList can't
            hold a value without a productId, so this radio row exists
            only in the UI as the explicit opt-out. The modifier itself
            is optional (isRequired=false) so this is allowed. Hidden
            when the admin marks the modifier required, since the user
            must then pick a real option. */}
        {!modifier.isRequired && (
          <BundleOptionRow
            checked={selectedValueId === null}
            onSelect={() => select(null)}
            label="None"
            sublabel="Just the base product"
          />
        )}

        {modifier.values.map((v) => (
          <BundleOptionRow
            key={v.valueId}
            checked={selectedValueId === v.valueId}
            onSelect={() => select(v.valueId)}
            label={v.label}
            sublabel={v.productSku}
            priceLabel={`${v.productPriceLabel} each`}
            imageUrl={v.productImageUrl}
            inStock={v.productInStock}
          />
        ))}
      </ul>

      {/* Quantity row — only shows when a real option (not "None") is
          picked. Mirrors the qty stepper used elsewhere (cart row, PDP
          main qty), but keyed to the BUNDLE option, not the cart line. */}
      {showQty && selectedValue && (
        <div className="flex items-center justify-between gap-3 border-t border-pm-ink-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-pm-ink-700">
              How many?
            </span>
            <div className="flex items-stretch overflow-hidden rounded-md border border-pm-ink-200">
              <button
                type="button"
                onClick={() => setQty(quantity - 1)}
                disabled={quantity <= 1}
                aria-label="Decrease bundle quantity"
                className="h-8 w-8 text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={14} strokeWidth={2} className="mx-auto" />
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQty(Number(e.target.value))}
                aria-label="Bundle quantity"
                className="w-12 border-x border-pm-ink-200 text-center text-[13px] font-semibold text-pm-ink-900 outline-none"
              />
              <button
                type="button"
                onClick={() => setQty(quantity + 1)}
                aria-label="Increase bundle quantity"
                className="h-8 w-8 text-pm-ink-700 transition-colors hover:bg-pm-ink-100"
              >
                <Plus size={14} strokeWidth={2} className="mx-auto" />
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-pm-ink-500">Bundle add-on</div>
            <div className="text-[15px] font-bold text-pm-navy-deep">
              +{formatUSD(bundleTotal)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single radio-style row inside the option list ────────────────────────

interface BundleOptionRowProps {
  checked: boolean;
  onSelect: () => void;
  label: string;
  sublabel?: string;
  priceLabel?: string;
  imageUrl?: string;
  inStock?: boolean;
}

function BundleOptionRow({
  checked,
  onSelect,
  label,
  sublabel,
  priceLabel,
  imageUrl,
  inStock,
}: BundleOptionRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={checked}
        className={`flex w-full items-center gap-3 border-b border-pm-ink-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-pm-ink-100/40 ${
          checked ? 'bg-pm-tan-pale' : 'bg-white'
        }`}
      >
        {/* Radio indicator */}
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            checked
              ? 'border-pm-terracotta bg-pm-terracotta text-white'
              : 'border-pm-ink-300 bg-white'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>

        {/* Image — only for real options */}
        {imageUrl && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100">
            <Image
              src={imageUrl}
              alt=""
              width={48}
              height={48}
              sizes="48px"
              className="h-full w-full object-contain p-1"
            />
          </div>
        )}

        {/* Label + sublabel */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-pm-ink-900">
            {label}
          </span>
          {sublabel && (
            <span className="text-[11px] text-pm-ink-500">
              {sublabel}
              {inStock === false && (
                <span className="ml-2 font-semibold text-pm-warning">
                  Out of stock
                </span>
              )}
            </span>
          )}
        </div>

        {/* Price (right-aligned) */}
        {priceLabel && (
          <span className="shrink-0 text-[12px] font-semibold text-pm-navy-deep">
            {priceLabel}
          </span>
        )}
      </button>
    </li>
  );
}

'use client';

/**
 * CartPageContent
 * ---------------
 * Modern B2B cart page. Two-column layout on desktop:
 *
 *   ┌─────────────────────────┬─────────────────┐
 *   │ LEFT (line items)       │ RIGHT (summary) │
 *   │                         │  (sticky)       │
 *   │ Stacked product rows    │                 │
 *   │  - image                │ Subtotal        │
 *   │  - brand eyebrow        │ Shipping (TBD)  │
 *   │  - title                │ Tax (TBD)       │
 *   │  - SKU + stock pill     │ ───────         │
 *   │  - qty stepper          │ Subtotal        │
 *   │  - unit price           │ Promo code      │
 *   │  - line total           │ Check out CTA   │
 *   │  - remove icon          │ Send for quote  │
 *   │                         │ Trust line      │
 *   └─────────────────────────┴─────────────────┘
 *
 * Stacks vertically below `lg`. Empty state replaces both columns with a
 * centered "your cart is empty" hero + CTAs to browse / quick order.
 *
 * Font + color discipline:
 *   - All visible type uses Google Sans Flex (--font-family-body /
 *     -heading). No JetBrains Mono — per design feedback during the PDP
 *     iteration, SKUs and codes stay sans like the rest of the UI.
 *   - Colors map to the `pm-*` brand tokens. No hex literals.
 *   - Headings are `font-bold` navy-deep; body is `text-pm-ink-700`;
 *     meta is `text-pm-ink-500`.
 */

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
} from 'lucide-react';
import { startCheckoutAction } from '~/app/dev/preview/_actions/start-checkout';
import { usePmB2BNinja } from '~/components/pm-b2b-ninja';
import { Image } from '~/components/image';
import { PmCouponInput } from '~/components/pm-coupon-input';
import { usePmQuote, type PmBomLine } from '~/lib/pm-quote-store';

const HOME_HREF = '/dev/preview';

/**
 * Parse a display price label like "$15,007" back to a number so we can
 * sum subtotals. Lines added through Quick Order without a price stay
 * `null` and don't contribute. Real source of truth is BC's checkout —
 * this is just a friendly client-side estimate.
 */
function parsePrice(label?: string): number | null {
  if (!label) return null;
  const cleaned = label.replace(/[^0-9.]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatUSD(n: number): string {
  // Always show full cents — never round. Line items end in .99 and the cart
  // total must match the checkout subtotal to the cent.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export function CartPageContent() {
  const { lines, totalUnits, removeLine, setQty, hydrated } = usePmQuote();

  // SSR + the first client render see lines=[] until the localStorage
  // hydration effect runs. Rendering the empty-state during that window
  // would flash "Your cart is empty" for a frame on every page load even
  // when the user has items saved. Suppress the cart UI entirely until
  // hydration completes; the skeleton matches the page chrome so the
  // header + breadcrumb stay where they're going to be.
  if (!hydrated) {
    return <CartHydratingSkeleton />;
  }

  if (lines.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="mx-auto max-w-pm-container px-8 py-10">
      <Breadcrumb />

      <header className="mt-2 mb-8 border-b border-pm-ink-200 pb-6">
        <h1 className="text-[28px] font-bold leading-[1.1] tracking-tight text-pm-ink-900 sm:text-[36px]">
          Your cart
        </h1>
        <p className="mt-1.5 text-[14px] text-pm-ink-500">
          {lines.length} {lines.length === 1 ? 'item' : 'items'} ·{' '}
          {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
        </p>
      </header>

      {/* Two-column layout. The right column sticks on lg+ so the summary
          stays in view while scrolling through long item lists. */}
      <div className="grid gap-8 lg:grid-cols-[7fr_5fr] lg:items-start">
        {/* LEFT — line items */}
        <section aria-label="Cart items" className="flex flex-col gap-4">
          {lines.map((line) => (
            <CartLineRow
              key={line.sku}
              line={line}
              onQtyChange={(qty) => setQty(line.sku, qty)}
              onRemove={() => removeLine(line.sku)}
            />
          ))}

          <Link
            href={HOME_HREF}
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-pm-navy-deep transition-colors hover:text-pm-navy-mid"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Continue shopping
          </Link>
        </section>

        {/* RIGHT — order summary (sticky on desktop) */}
        <aside aria-label="Order summary" className="lg:sticky lg:top-6">
          <CartSummary lines={lines} />
          <CartHelpCard />
        </aside>
      </div>
    </div>
  );
}

// ── Breadcrumb ──────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px]">
      <ol className="flex items-center gap-1.5 text-pm-ink-500">
        <li>
          <Link
            href={HOME_HREF}
            className="transition-colors hover:text-pm-navy-deep"
          >
            Home
          </Link>
        </li>
        <li aria-hidden className="text-pm-ink-300">
          <ChevronRight size={12} strokeWidth={2} />
        </li>
        <li aria-current="page" className="font-medium text-pm-ink-900">
          Cart
        </li>
      </ol>
    </nav>
  );
}

// ── Line item row ────────────────────────────────────────────────────────

interface CartLineRowProps {
  line: PmBomLine;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

function CartLineRow({ line, onQtyChange, onRemove }: CartLineRowProps) {
  const unitPriceNum = parsePrice(line.unitPrice);
  const lineTotal =
    unitPriceNum !== null ? unitPriceNum * line.qty : null;
  const isOutOfStock = line.inStock === false;
  const isQuoteOnly = typeof line.productEntityId !== 'number';

  return (
    <article
      className={`grid grid-cols-[80px_1fr] gap-4 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm transition-colors sm:grid-cols-[96px_1fr_auto] sm:p-5 ${
        isOutOfStock ? 'border-pm-warning-bg/60 bg-pm-warning-bg/10' : ''
      }`}
    >
      {/* Image — fixed square, sans card chrome — matches PmProductCard style */}
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100 sm:h-24 sm:w-24">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.title ?? line.sku}
            width={96}
            height={96}
            sizes="96px"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pm-ink-400">
            {line.sku.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Middle column — brand / title / sku / stock + qty stepper */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {line.brand && (
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            {line.brand}
          </div>
        )}

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.35] text-pm-ink-900 sm:text-[16px]">
          {line.title ?? line.sku}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-pm-ink-500">
          <span>SKU {line.sku}</span>
          <span aria-hidden className="text-pm-ink-300">
            ·
          </span>
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 font-medium text-pm-warning">
              <AlertTriangle size={11} strokeWidth={2} />
              Out of stock
            </span>
          ) : isQuoteOnly ? (
            <span className="inline-flex items-center gap-1 font-medium text-pm-ink-500">
              Quote required
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-pm-success">
              <CheckCircle2 size={11} strokeWidth={2} />
              In stock
            </span>
          )}
        </div>

        {/* Qty stepper + remove. On narrow screens this row wraps under
            the title; on desktop it shares a row with the price block. */}
        <div className="mt-3 flex flex-wrap items-center gap-3 sm:hidden">
          <QtyStepper qty={line.qty} onChange={onQtyChange} />
          <RemoveButton onClick={onRemove} />
          <span className="ml-auto text-[15px] font-bold text-pm-navy-deep">
            {lineTotal !== null ? formatUSD(lineTotal) : '—'}
          </span>
        </div>
      </div>

      {/* Right column — qty + unit price + line total + remove. Hidden on
          mobile (where the controls move under the title). */}
      <div className="hidden flex-col items-end justify-between gap-3 sm:flex">
        <div className="flex items-center gap-3">
          <QtyStepper qty={line.qty} onChange={onQtyChange} />
          <RemoveButton onClick={onRemove} />
        </div>
        <div className="text-right">
          {line.unitPrice && (
            <div className="text-[11px] text-pm-ink-500">
              {line.unitPrice} each
            </div>
          )}
          <div className="text-[18px] font-bold tracking-tight text-pm-navy-deep">
            {lineTotal !== null ? formatUSD(lineTotal) : 'Quote pricing'}
          </div>
        </div>
      </div>
    </article>
  );
}

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-pm-ink-200 bg-white">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
        className="h-8 w-8 text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={14} strokeWidth={2} className="mx-auto" />
      </button>
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Quantity"
        className="w-10 border-x border-pm-ink-200 text-center text-[13px] font-semibold text-pm-ink-900 outline-none focus:border-pm-navy-deep"
      />
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
        className="h-8 w-8 text-pm-ink-700 transition-colors hover:bg-pm-ink-100"
      >
        <Plus size={14} strokeWidth={2} className="mx-auto" />
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove item"
      className="rounded-md p-1.5 text-pm-ink-400 transition-colors hover:bg-pm-danger-bg hover:text-pm-danger"
    >
      <Trash2 size={15} strokeWidth={1.75} />
    </button>
  );
}

// ── Order summary panel ──────────────────────────────────────────────────

function CartSummary({ lines }: { lines: PmBomLine[] }) {
  const [isCheckingOut, startCheckoutTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { appliedCoupon } = usePmQuote();
  const {
    openQuoteWithProducts,
    configured: ninjaConfigured,
    ready: ninjaReady,
  } = usePmB2BNinja();

  // Subtotal estimate — sum of (unitPrice × qty) for lines with prices.
  // Real number comes from BC at checkout; this is a friendly preview.
  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = parsePrice(l.unitPrice);
      return sum + (p !== null ? p * l.qty : 0);
    }, 0);
  }, [lines]);
  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty, 0),
    [lines],
  );
  const hasUnpricedLines = lines.some((l) => parsePrice(l.unitPrice) === null);

  // Client-side discount preview. One rule for every coupon type:
  // the discount comes off the SUBTOTAL (sum of item prices) — never
  // off shipping, never off tax, never off (subtotal + shipping). So
  // a 10% coupon on a $15,007 cart shows $1,500.70 off, full stop.
  //
  // BC will still calculate the final number authoritatively at
  // checkout — this is just a real-time preview so the user can see
  // their coupon is taking effect.
  const couponDiscount = useMemo(() => {
    if (
      !appliedCoupon ||
      !appliedCoupon.valid ||
      typeof appliedCoupon.amount !== 'number' ||
      appliedCoupon.amount <= 0
    ) {
      return 0;
    }
    if (appliedCoupon.type === 'percentage_discount') {
      return Math.max(0, subtotal * (appliedCoupon.amount / 100));
    }
    // Every other type (cart_dollars_off, shipping_amount_off,
    // per_item_discount, free_shipping with a fixed amount, "other"
    // catch-all) → treat the amount as a flat dollar discount on the
    // subtotal. Clamp at the subtotal so we never go negative.
    return Math.max(0, Math.min(subtotal, appliedCoupon.amount));
  }, [appliedCoupon, subtotal]);
  const postDiscountSubtotal = Math.max(0, subtotal - couponDiscount);

  const outOfStockLines = lines.filter((l) => l.inStock === false);
  const linesMissingEntityId = lines.filter(
    (l) => typeof l.productEntityId !== 'number',
  );
  const canCheckOut =
    outOfStockLines.length === 0 && linesMissingEntityId.length === 0;
  const blockMessage =
    outOfStockLines.length > 0
      ? `${outOfStockLines.length} item${
          outOfStockLines.length === 1 ? ' is' : 's are'
        } out of stock — direct checkout disabled. Send for quote and our team will confirm availability.`
      : linesMissingEntityId.length > 0
        ? 'Some items still need to be matched against the catalog before they can be checked out directly. Send for quote and our team will handle it.'
        : null;

  const handleCheckout = () => {
    setCheckoutError(null);
    startCheckoutTransition(async () => {
      try {
        await startCheckoutAction(
          lines
            .filter((l) => typeof l.productEntityId === 'number')
            .map((l) => ({
              productEntityId: l.productEntityId as number,
              quantity: l.qty,
            })),
          // Forward the validated coupon code so the server action can
          // apply it to BC's checkout before redirecting to Stencil OPC.
          appliedCoupon?.valid ? appliedCoupon.code : null,
        );
      } catch (err) {
        const isRedirect =
          typeof err === 'object' &&
          err !== null &&
          'digest' in err &&
          typeof (err as { digest?: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
        if (isRedirect) throw err;
        // eslint-disable-next-line no-console
        console.error('start-checkout failed', err);
        setCheckoutError(
          'We hit a snag starting checkout. Try again, or use "Send for quote" to route this through sales.',
        );
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-pm-ink-200 bg-white shadow-sm">
      <div className="border-b border-pm-ink-200 bg-white px-5 py-4">
        <h2 className="text-[16px] font-bold tracking-tight text-pm-ink-900">
          Order summary
        </h2>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5">
        <SummaryRow
          label={`Subtotal (${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'})`}
          value={subtotal > 0 ? formatUSD(subtotal) : '—'}
        />

        {/* Discount row — only renders when a coupon is applied AND it
            translates into a previewable amount. Shipping-only coupons
            (free_shipping / shipping_amount_off) fall through to the
            shipping line label below so the user still knows the coupon
            is doing something. */}
        {appliedCoupon?.valid && couponDiscount > 0 && (
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="inline-flex items-center gap-1.5 text-pm-success">
              <Tag size={12} strokeWidth={2} />
              {appliedCoupon.code}
              <span className="text-pm-ink-500">({appliedCoupon.summary})</span>
            </span>
            <span className="font-medium text-pm-success">
              −{formatUSD(couponDiscount)}
            </span>
          </div>
        )}

        <SummaryRow
          label="Shipping"
          value="Calculated at checkout"
          muted
        />
        <SummaryRow
          label="Estimated tax"
          value="Calculated at checkout"
          muted
        />
        {hasUnpricedLines && (
          <p className="text-[11.5px] leading-[1.45] text-pm-ink-500">
            Some items show "Quote pricing" — the final total will include
            those amounts after our team confirms.
          </p>
        )}

        <div className="my-1 h-px bg-pm-ink-200" />

        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-pm-ink-900">
            Estimated total
          </span>
          <span className="text-[22px] font-bold tracking-tight text-pm-navy-deep">
            {subtotal > 0 ? formatUSD(postDiscountSubtotal) : '—'}
          </span>
        </div>
        <p className="-mt-1 text-right text-[11px] text-pm-ink-500">
          Before tax &amp; shipping
        </p>

        {/* Promo code — reuses the same component as the drawer */}
        <div className="mt-2">
          <PmCouponInput />
        </div>

        {blockMessage && (
          <div className="mt-1 flex gap-2 rounded-md border border-pm-warning-bg bg-pm-warning-bg/40 px-3 py-2.5 text-[12px] leading-[1.45] text-pm-warning">
            <AlertTriangle
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
            />
            <span>{blockMessage}</span>
          </div>
        )}

        {checkoutError && (
          <div className="mt-1 rounded-md border border-pm-danger-bg bg-pm-danger-bg/40 px-3 py-2.5 text-[12px] leading-[1.45] text-pm-danger">
            {checkoutError}
          </div>
        )}

        {/* Primary checkout CTA — disabled when any line is out-of-stock
            or unresolvable (paste-only). Spinner shows during the
            BC cart-create roundtrip + redirect to Stencil. */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!canCheckOut || isCheckingOut}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:enabled:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCheckingOut ? (
            <>
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
              Starting checkout…
            </>
          ) : (
            <>
              Check out
              <ArrowRight size={15} strokeWidth={2.5} />
            </>
          )}
        </button>

        {/* Secondary — Send for quote. Always visible as an alternative
            (B2B buyers may want to negotiate volume / NET terms even on
            in-stock items). Hands off to B2B Ninja's hosted quote modal,
            same flow the legacy platinummicro.com site uses. */}
        <button
          type="button"
          onClick={() => {
            if (!ninjaConfigured) {
              window.alert(
                'Quote requests are not configured for this environment yet.\n\nAsk the team to set NEXT_PUBLIC_B2B_NINJA_STORE_ID once B2B Ninja is installed on this BC channel.',
              );
              return;
            }
            if (!ninjaReady) {
              window.alert(
                'Quote engine is still loading — give it a second and try again.',
              );
              return;
            }
            // Push the cart's BC product IDs straight into B2B Ninja's
            // current quote and pop their hosted modal. Lines without a
            // resolved entityId (Quick Order paste, etc.) are dropped —
            // B2B Ninja's UI lets the user add free-text items inside
            // the modal if they need to.
            openQuoteWithProducts(
              lines
                .filter((l) => typeof l.productEntityId === 'number')
                .map((l) => ({
                  id: l.productEntityId as number,
                  qty: l.qty,
                  options: [],
                })),
            );
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-pm-ink-300 bg-white px-5 py-3 text-[14px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={ninjaConfigured && !ninjaReady}
        >
          {ninjaConfigured && !ninjaReady ? 'Loading quote engine…' : 'Send for quote'}
        </button>

        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-pm-ink-500">
          <Lock size={11} strokeWidth={2} />
          Secure checkout — PCI-compliant payment via BigCommerce
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-[13px]">
      <span className="text-pm-ink-700">{label}</span>
      <span
        className={`font-medium ${muted ? 'text-pm-ink-500' : 'text-pm-ink-900'}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Help card under the summary ──────────────────────────────────────────

function CartHelpCard() {
  return (
    <div className="mt-4 rounded-lg border border-pm-ink-200 bg-pm-tan-pale p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-pm-tan">
        Need help?
      </h3>
      <p className="mt-2 text-[13px] leading-[1.5] text-pm-ink-700">
        Talk to a sales engineer about volume pricing, custom builds, or
        public-sector procurement.
      </p>
      <a
        href="tel:+18185730303"
        className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-pm-navy-deep underline-offset-2 hover:underline"
      >
        Call 1-818-573-0303
      </a>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────

// ── Hydration skeleton — shown for ~1 frame until pm-quote-store hydrates ──

function CartHydratingSkeleton() {
  return (
    <div className="mx-auto max-w-pm-container px-8 py-10">
      {/* Breadcrumb placeholder — same height as the real one so the page
          chrome doesn't shift when content lands. */}
      <div className="h-[18px] w-32 rounded-sm bg-pm-ink-100" />

      <header className="mt-2 mb-8 border-b border-pm-ink-200 pb-6">
        <div className="h-9 w-48 rounded-sm bg-pm-ink-100 sm:h-12 sm:w-56" />
        <div className="mt-2 h-[18px] w-40 rounded-sm bg-pm-ink-100" />
      </header>

      <div className="grid gap-8 lg:grid-cols-[7fr_5fr] lg:items-start">
        {/* LEFT — three rough line-item placeholders, just enough to
            anchor the eye until the real cart loads. */}
        <section aria-label="Cart items (loading)" className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[80px_1fr] gap-4 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm sm:grid-cols-[96px_1fr_auto] sm:p-5"
            >
              <div className="h-20 w-20 rounded-md bg-pm-ink-100 sm:h-24 sm:w-24" />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="h-3 w-12 rounded-sm bg-pm-ink-100" />
                <div className="h-4 w-3/4 rounded-sm bg-pm-ink-100" />
                <div className="h-3 w-1/2 rounded-sm bg-pm-ink-100" />
              </div>
              <div className="hidden h-7 w-28 rounded-md bg-pm-ink-100 sm:block" />
            </div>
          ))}
        </section>

        {/* RIGHT — summary placeholder */}
        <aside aria-label="Order summary (loading)">
          <div className="overflow-hidden rounded-lg border border-pm-ink-200 bg-white shadow-sm">
            <div className="border-b border-pm-ink-200 px-5 py-4">
              <div className="h-5 w-32 rounded-sm bg-pm-ink-100" />
            </div>
            <div className="flex flex-col gap-3 px-5 py-5">
              <div className="h-4 w-full rounded-sm bg-pm-ink-100" />
              <div className="h-4 w-full rounded-sm bg-pm-ink-100" />
              <div className="h-4 w-full rounded-sm bg-pm-ink-100" />
              <div className="my-1 h-px bg-pm-ink-200" />
              <div className="h-7 w-1/2 self-end rounded-sm bg-pm-ink-100" />
              <div className="mt-2 h-11 w-full rounded-md bg-pm-ink-100" />
              <div className="h-10 w-full rounded-md bg-pm-ink-100" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartEmptyState() {
  return (
    <div className="mx-auto max-w-pm-container px-8 py-20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pm-tan-pale text-pm-tan">
          <ShoppingCart size={36} strokeWidth={1.25} />
        </div>
        <h1 className="mt-6 text-[26px] font-bold tracking-tight text-pm-ink-900 sm:text-[32px]">
          Your cart is empty
        </h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-pm-ink-500">
          Add servers, networking, or storage from the catalog — or paste a
          list of SKUs with Quick Order to bulk-load a BOM.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={HOME_HREF}
            className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-pm-terracotta-light"
          >
            Browse catalog
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
          <Link
            href={`${HOME_HREF}/category/servers`}
            className="inline-flex items-center rounded-md border border-pm-ink-300 bg-white px-5 py-3 text-[14px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100"
          >
            See popular servers
          </Link>
        </div>
      </div>
    </div>
  );
}

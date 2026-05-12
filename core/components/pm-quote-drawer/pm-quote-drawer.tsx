'use client';

/**
 * PmQuoteDrawer
 * -------------
 * 440px slide-in cart pane. Dual-mode CTA depending on stock:
 *
 *   - Every line in-stock        → "Check out" primary CTA, links to
 *                                  /dev/preview/checkout which redirects to
 *                                  BC's Stencil OPC via the cart redirect
 *                                  mutation.
 *   - One or more lines NOT in   → "Send for quote" CTA stays primary
 *     stock (or stock unknown)     because we can't fulfill all items
 *                                  immediately. The drawer also surfaces a
 *                                  note explaining why the quote path is
 *                                  needed (out-of-stock items, custom
 *                                  configs, etc.).
 *
 * The split exists because Platinum Micro's catalog mixes truly purchasable
 * SKUs (mainstream HPE / Dell / ASRock builds, in stock now) with
 * configure-to-order / EOL items that genuinely need a salesperson's eyes.
 * Forcing "Send for quote" everywhere hides the easy checkout path from
 * the customers who could one-click-buy.
 *
 * Reads everything from the PmQuoteContext store. No props required.
 */

import { useEffect, useState, useTransition } from 'react';
import { X, ShoppingCart, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { startCheckoutAction } from '~/app/dev/preview/_actions/start-checkout';
import { Image } from '~/components/image';
import { PmCouponInput } from '~/components/pm-coupon-input';
import { usePmQuote } from '~/lib/pm-quote-store';

const SCRIM_DURATION_MS = 200;

export function PmQuoteDrawer() {
  const { lines, totalUnits, isOpen, close, removeLine, setQty, clear } = usePmQuote();
  // Tracks the server-action lifecycle so the CTA can show a spinner +
  // disable itself while BC creates the cart + we 302 to Stencil.
  const [isCheckingOut, startCheckoutTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Reset transient checkout error whenever the drawer reopens or the
  // line set changes (otherwise a stale failure message hangs around).
  useEffect(() => {
    setCheckoutError(null);
  }, [isOpen, lines.length]);

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
        );
      } catch (err) {
        // Next.js's redirect() throws NEXT_REDIRECT internally — that's
        // success, not failure. Anything else is a genuine cart-creation
        // error worth surfacing to the user.
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
          'Could not start checkout. Please try again — or use "Send for quote" to route this through sales.',
        );
      }
    });
  };

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-[90] bg-pm-navy-deepest/40 transition-opacity ease-pm-standard ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        style={{ transitionDuration: `${SCRIM_DURATION_MS}ms` }}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Cart"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 bottom-0 z-[91] flex w-[440px] max-w-full flex-col bg-white shadow-xl transition-transform duration-[280ms] ease-pm-emphasized ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* HEAD */}
        <div className="flex shrink-0 items-center justify-between border-b border-pm-ink-200 px-6 py-[22px]">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-lg font-bold text-pm-ink-900">Your cart</h3>
            {lines.length > 0 && (
              <span className="text-[13px] text-pm-ink-500">
                {lines.length} item{lines.length === 1 ? '' : 's'} · {totalUnits} unit
                {totalUnits === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-md text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <PmDrawerEmpty />
          ) : (
            <ul className="flex flex-col">
              {lines.map((line) => (
                <li
                  key={line.sku}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-pm-ink-200 py-3.5"
                >
                  {/* Thumbnail */}
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        sizes="56px"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-pm-ink-400">
                        {line.sku.slice(0, 6)}
                      </span>
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <h5 className="mb-1 truncate text-[13px] font-semibold leading-[1.3] text-pm-ink-900">
                      {line.title ?? line.sku}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-pm-ink-500">
                      <span className="tracking-[0.02em]">{line.sku}</span>
                      {line.unitPrice && (
                        <>
                          <span className="text-pm-ink-300">·</span>
                          <span className="text-pm-ink-700">{line.unitPrice}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Qty + remove */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-stretch overflow-hidden rounded-md border border-pm-ink-200">
                      <button
                        type="button"
                        onClick={() => setQty(line.sku, line.qty - 1)}
                        disabled={line.qty <= 1}
                        aria-label="Decrease quantity"
                        className="h-7 w-7 bg-white text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => setQty(line.sku, Number(e.target.value))}
                        aria-label="Quantity"
                        className="w-9 border-x border-pm-ink-200 text-center text-xs text-pm-ink-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(line.sku, line.qty + 1)}
                        aria-label="Increase quantity"
                        className="h-7 w-7 bg-white text-pm-ink-700 transition-colors hover:bg-pm-ink-100"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.sku)}
                      aria-label={`Remove ${line.sku}`}
                      className="rounded-md p-1.5 text-pm-ink-400 transition-colors hover:bg-pm-danger-bg hover:text-pm-danger"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && (
            <div className="mt-4">
              <PmCouponInput />
            </div>
          )}
        </div>

        {/* FOOT */}
        {lines.length > 0 && (() => {
          // A line counts as out-of-stock only when the caller EXPLICITLY
          // says so (inStock === false). Lines added without a flag default
          // to "purchasable" per the PmBomLine doc — that keeps older
          // callsites (Quick Order paste, saved lists) on the safe side.
          const outOfStockLines = lines.filter((l) => l.inStock === false);
          // Lines missing productEntityId can't be pushed to BC's cart
          // (createCart keys on entityId, not SKU) → those force the quote
          // path too. Quick Order paste sits in this bucket.
          const linesMissingEntityId = lines.filter(
            (l) => typeof l.productEntityId !== 'number',
          );
          const canCheckOut =
            outOfStockLines.length === 0 && linesMissingEntityId.length === 0;
          const blockReason =
            outOfStockLines.length > 0
              ? (outOfStockLines.length === 1
                  ? '1 item is currently out of stock — '
                  : `${outOfStockLines.length} items are currently out of stock — `) +
                'your cart will be sent to sales as a quote so we can ' +
                'confirm availability and lead time.'
              : linesMissingEntityId.length > 0
                ? 'Some items still need to be matched against the catalog — ' +
                  'your cart will be sent to sales for confirmation.'
                : null;

          return (
            <div className="flex shrink-0 flex-col gap-2.5 border-t border-pm-ink-200 bg-pm-tan-pale px-6 py-5">
              <div className="flex justify-between text-[13px] text-pm-ink-700">
                <span>Total units</span>
                <span className="font-semibold">{totalUnits}</span>
              </div>
              <div className="flex justify-between text-[13px] text-pm-ink-500">
                <span>Tax &amp; shipping</span>
                <span>calculated at checkout</span>
              </div>

              {blockReason && (
                <div className="mt-1 flex gap-2 rounded-md border border-pm-warning-bg bg-pm-warning-bg/50 px-3 py-2 text-[12px] leading-[1.45] text-pm-warning">
                  <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                  <span>{blockReason}</span>
                </div>
              )}

              {checkoutError && (
                <div className="mt-1 rounded-md border border-pm-danger-bg bg-pm-danger-bg/40 px-3 py-2 text-[12px] leading-[1.45] text-pm-danger">
                  {checkoutError}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={clear}
                  disabled={isCheckingOut}
                  className="rounded-md bg-pm-ink-100 px-4 py-3.5 text-[15px] font-semibold text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-200 disabled:opacity-50"
                >
                  Clear
                </button>

                {canCheckOut ? (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:enabled:bg-pm-terracotta-light disabled:opacity-70"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                        Starting checkout…
                      </>
                    ) : (
                      'Check out'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
                  >
                    Send for quote
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </aside>
    </>
  );
}

function PmDrawerEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <ShoppingCart size={48} strokeWidth={1} className="text-pm-ink-300" />
      <p className="max-w-[280px] text-sm text-pm-ink-500">
        Your cart is empty. Add parts from the catalog or use Quick order to paste a
        list of SKUs.
      </p>
    </div>
  );
}

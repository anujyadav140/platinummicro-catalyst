'use client';

/**
 * PmQuoteDrawer
 * -------------
 * 440px slide-out interstitial that opens when the user adds something to
 * the cart. NOT the canonical cart surface — that lives at /dev/preview/cart
 * (see app/dev/preview/cart/). This drawer is intentionally lightweight:
 *
 *   - Shows what's in the cart (image, title, sku, qty, line price)
 *   - Lets the user adjust qty / remove without leaving the current page
 *   - Primary CTA = "View cart" → routes to the full cart page where the
 *     Check out vs. Send for quote decision actually happens
 *
 * The decision split was deliberate: a $15K server purchase deserves a
 * dedicated review surface with shipping estimate, coupon, trust
 * signals, etc. — not a cramped right-side drawer. So the drawer is just
 * the "you added this" moment, and the cart page is the "let's review
 * and decide" moment.
 *
 * Reads everything from the PmQuoteContext store. No props required.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { Image } from '~/components/image';
import { usePmQuote } from '~/lib/pm-quote-store';

const SCRIM_DURATION_MS = 200;
const CART_HREF = '/dev/preview/cart';

export function PmQuoteDrawer() {
  const { lines, totalUnits, isOpen, close, removeLine, setQty, clear } =
    usePmQuote();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

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
                {lines.length} item{lines.length === 1 ? '' : 's'} ·{' '}
                {totalUnits} unit{totalUnits === 1 ? '' : 's'}
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
            <PmDrawerEmpty onClose={close} />
          ) : (
            <ul className="flex flex-col">
              {lines.map((line) => (
                <li
                  key={line.sku}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-pm-ink-200 py-3.5 last:border-b-0"
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
                      <span>{line.sku}</span>
                      {line.unitPrice && (
                        <>
                          <span className="text-pm-ink-300">·</span>
                          <span className="text-pm-ink-700">
                            {line.unitPrice}
                          </span>
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
        </div>

        {/* FOOT — slim CTA row. Shipping / tax / coupon all move to the
            cart page; this is just "you added it, here's a peek, want to
            review?". */}
        {lines.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-pm-ink-200 bg-pm-tan-pale px-6 py-5">
            <p className="text-[12px] leading-[1.45] text-pm-ink-500">
              Shipping, tax, and coupon codes apply at checkout.
            </p>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={clear}
                aria-label="Clear cart"
                className="rounded-md bg-pm-ink-100 px-4 py-3 text-[14px] font-semibold text-pm-ink-700 transition-colors hover:bg-pm-ink-200"
              >
                Clear
              </button>
              <Link
                href={CART_HREF}
                onClick={close}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
              >
                View cart
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function PmDrawerEmpty({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pm-tan-pale text-pm-tan">
        <ShoppingCart size={28} strokeWidth={1.25} />
      </div>
      <p className="max-w-[280px] text-[14px] leading-[1.5] text-pm-ink-500">
        Your cart is empty. Add parts from the catalog or use Quick order to
        paste a list of SKUs.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-1 text-[13px] font-semibold text-pm-navy-deep underline-offset-2 hover:underline"
      >
        Keep browsing
      </button>
    </div>
  );
}

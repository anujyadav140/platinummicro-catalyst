'use client';

/**
 * ListDetail (client)
 * -------------------
 * Renders one saved list: header (name + count + back link), table of
 * items with thumbnail / SKU / qty stepper / unit price / Remove, and a
 * footer with two CTAs: "Add all to cart" (pushes everything into the
 * PmQuote drawer) and "Delete list".
 *
 * Reads from `usePmLists()` and writes via `setItemQty` / `removeItemFromList`
 * so changes persist to localStorage as the user interacts.
 *
 * Empty state: when the list has zero items, we show a small inline
 * placeholder with a CTA back to the catalog.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Image } from '~/components/image';
import {
  ArrowLeft,
  Check,
  ListChecks,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

import { usePmLists } from '~/lib/pm-lists-store';
import { usePmQuote } from '~/lib/pm-quote-store';

export function ListDetail({ listId }: { listId: string }) {
  const router = useRouter();
  const { lists, ready, deleteList, removeItemFromList, setItemQty } =
    usePmLists();
  const { addLines, open } = usePmQuote();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [, startTransition] = useTransition();

  // Hydration guard — show a small loading state until the store is ready,
  // then resolve list (or 404).
  if (!ready) {
    return (
      <div className="rounded-md border border-pm-ink-200 bg-white p-8 text-[14px] text-pm-ink-500">
        Loading list…
      </div>
    );
  }

  const list = lists.find((l) => l.id === listId);

  if (!list) {
    return (
      <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
        <span
          aria-hidden
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
        >
          <ListChecks size={24} strokeWidth={1.5} />
        </span>
        <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
          List not found
        </h2>
        <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
          This list may have been deleted or never existed on this browser.
          Lists are stored locally per device.
        </p>
        <Link
          href="/dev/preview/account/lists"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
        >
          Back to all lists
        </Link>
      </div>
    );
  }

  const handleAddAllToCart = () => {
    addLines(
      list.items.map((it) => ({
        sku: it.sku,
        qty: it.qty,
        title: it.title,
        imageUrl: it.imageUrl,
        unitPrice: it.unitPrice,
        brand: it.brand,
      })),
    );
    setRecentlyAdded(true);
    setTimeout(() => setRecentlyAdded(false), 1200);
    open();
  };

  const handleDelete = () => {
    deleteList(list.id);
    startTransition(() => {
      router.push('/dev/preview/account/lists');
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/dev/preview/account/lists"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-deep"
      >
        <ArrowLeft size={13} strokeWidth={2} />
        All lists
      </Link>

      {/* Items card */}
      {list.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
          <span
            aria-hidden
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
          >
            <ListChecks size={24} strokeWidth={1.5} />
          </span>
          <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
            This list is empty
          </h2>
          <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
            Open a product page and use &ldquo;Add to List&rdquo; to drop
            items in here.
          </p>
          <Link
            href="/dev/preview"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-sm">
          <ul className="divide-y divide-pm-ink-100">
            {list.items.map((item) => (
              <li
                key={item.sku}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-4"
              >
                {/* Thumbnail */}
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      sizes="64px"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-pm-ink-400">
                      {item.sku.slice(0, 6)}
                    </span>
                  )}
                </div>

                {/* Title + meta */}
                <div className="min-w-0">
                  {item.brand && (
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-pm-tan">
                      {item.brand}
                    </div>
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block truncate text-[14px] font-semibold text-pm-ink-900 hover:text-pm-navy-deep hover:underline"
                    >
                      {item.title ?? item.sku}
                    </Link>
                  ) : (
                    <span className="block truncate text-[14px] font-semibold text-pm-ink-900">
                      {item.title ?? item.sku}
                    </span>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[12px] text-pm-ink-500">
                    <span>SKU {item.sku}</span>
                    {item.unitPrice && (
                      <>
                        <span className="text-pm-ink-300">·</span>
                        <span className="font-semibold text-pm-ink-700">
                          {item.unitPrice}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Qty stepper + Remove */}
                <div className="flex items-center gap-3">
                  <div className="flex items-stretch overflow-hidden rounded-md border border-pm-ink-200">
                    <button
                      type="button"
                      onClick={() =>
                        setItemQty(list.id, item.sku, item.qty - 1)
                      }
                      disabled={item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="h-8 w-7 bg-white text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        setItemQty(
                          list.id,
                          item.sku,
                          Number(e.target.value) || 1,
                        )
                      }
                      aria-label="Quantity"
                      className="w-10 border-x border-pm-ink-200 text-center text-[13px] text-pm-ink-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setItemQty(list.id, item.sku, item.qty + 1)
                      }
                      aria-label="Increase quantity"
                      className="h-8 w-7 bg-white text-pm-ink-700 transition-colors hover:bg-pm-ink-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemFromList(list.id, item.sku)}
                    aria-label={`Remove ${item.sku}`}
                    className="rounded-md p-1.5 text-pm-ink-400 transition-colors hover:bg-pm-danger-bg hover:text-pm-danger"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-[13px] text-pm-danger">
            <span>Delete this entire list?</span>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md px-2.5 py-1 font-semibold text-pm-ink-500 hover:bg-pm-ink-100 hover:text-pm-ink-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded-md bg-pm-danger px-3 py-1.5 font-semibold text-white transition-colors hover:bg-pm-danger/90"
            >
              <Trash2 size={12} strokeWidth={2} />
              Delete list
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-pm-danger transition-colors hover:underline"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete this list
          </button>
        )}

        {list.items.length > 0 && (
          <button
            type="button"
            onClick={handleAddAllToCart}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-pm-terracotta px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            {recentlyAdded ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                Added to cart
              </>
            ) : (
              <>
                <ShoppingCart size={14} strokeWidth={2} />
                Add all to cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

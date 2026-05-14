'use client';

/**
 * PmQuickOrderModal
 * -----------------
 * Fixed-height (560px) modal for B2B "I already know my SKUs" quick add.
 *
 * Layout:
 *   - Header (sticky-relative, doesn't scroll)
 *   - Rows region — flex-1, internal scroll, sticky column header
 *   - Footer (sticky-relative, doesn't scroll) with summary + actions
 *
 * Why fixed height instead of grow: per design feedback, the modal getting
 * taller as rows are added felt jumpy. We pin it at 560px and scroll inside.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import type {
  PmQuickOrderAddResult,
  PmQuickOrderModalProps,
  PmQuickOrderRow,
} from './pm-quick-order-modal.types';

function makeEmptyRows(count: number): PmQuickOrderRow[] {
  return Array.from({ length: count }, () => ({ sku: '', qty: 1 }));
}

export function PmQuickOrderModal({
  open,
  onClose,
  onAdd,
  initialRowCount = 3,
}: PmQuickOrderModalProps) {
  const [rows, setRows] = useState<PmQuickOrderRow[]>(() =>
    makeEmptyRows(initialRowCount),
  );
  // While the BC resolver is running we disable the form so the user
  // can't double-submit or close mid-flight.
  const [submitting, setSubmitting] = useState(false);
  // SKUs the resolver couldn't match — surfaced inline so the user can
  // fix typos without losing the rest of the rows they typed.
  const [missing, setMissing] = useState<string[]>([]);

  // Close on Escape (disabled while a submit is in flight so a stray
  // keypress can't strand the user mid-resolve).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, submitting]);

  // Reset state shortly after the close animation.
  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setRows(makeEmptyRows(initialRowCount));
      setMissing([]);
    }, 200);
  }, [onClose, initialRowCount, submitting]);

  const setRow = (i: number, key: keyof PmQuickOrderRow, value: string | number) => {
    setRows((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
    );
    // Clear the stale "missing" warnings as soon as the user starts
    // editing — the previous resolver result no longer reflects what's
    // in the form.
    if (key === 'sku' && missing.length > 0) setMissing([]);
  };

  const addRow = () => setRows((rs) => [...rs, { sku: '', qty: 1 }]);

  const removeRow = (i: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  };

  const handleSubmit = async () => {
    const filledRows = rows.filter((r) => r.sku.trim().length > 0);
    if (filledRows.length === 0 || !onAdd) return;
    setSubmitting(true);
    setMissing([]);
    try {
      const result = await onAdd(filledRows);
      const r = (result ?? {}) as PmQuickOrderAddResult;
      if (Array.isArray(r.missing) && r.missing.length > 0) {
        // Keep modal open so the user can fix typos. Drop the resolved
        // rows from the form so only the unmatched ones remain visible.
        const stillMissing = new Set(r.missing.map((s) => s.toLowerCase()));
        setRows((rs) => {
          const trimmed = rs.filter((row) =>
            stillMissing.has(row.sku.trim().toLowerCase()),
          );
          return trimmed.length > 0 ? trimmed : makeEmptyRows(initialRowCount);
        });
        setMissing(r.missing);
      } else {
        // Everything resolved — drop the form contents and close.
        onClose();
        setTimeout(() => {
          setRows(makeEmptyRows(initialRowCount));
          setMissing([]);
        }, 200);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const filled = rows.filter((r) => r.sku.trim().length > 0);
  const totalUnits = filled.reduce(
    (sum, r) => sum + (Number(r.qty) || 0),
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-pm-navy-deepest/45 p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-quick-order-title"
    >
      <div
        className="flex w-full max-w-[560px] flex-col gap-[18px] rounded-xl bg-white p-7 shadow-xl"
        style={{ height: '560px' }}
      >
        {/* HEAD */}
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h3
              id="pm-quick-order-title"
              className="mb-1.5 text-[22px] font-bold tracking-[-0.01em] text-pm-ink-900"
            >
              Quick order
            </h3>
            <p className="max-w-[420px] text-sm leading-[1.5] text-pm-ink-500">
              Already know what you need? Enter SKUs and quantities to add them
              straight to your cart.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close quick order"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* MISSING SKUS banner — only rendered after a resolve attempt
            where some SKUs didn't match the BC catalog. Stays visible
            until the user edits a SKU input (cleared via setRow). */}
        {missing.length > 0 && (
          <div
            role="alert"
            className="flex shrink-0 items-start gap-2.5 rounded-md border border-pm-warning/40 bg-pm-warning/10 px-3 py-2.5 text-[13px] leading-snug text-pm-ink-900"
          >
            <AlertCircle
              size={16}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-pm-warning"
            />
            <div>
              <div className="font-semibold">
                {missing.length === 1
                  ? "We couldn't find that SKU in the catalog."
                  : `We couldn't find ${missing.length} of those SKUs in the catalog.`}
              </div>
              <div className="mt-0.5 text-[12px] text-pm-ink-700">
                {missing.join(', ')}
              </div>
              <div className="mt-0.5 text-[12px] text-pm-ink-500">
                Double-check the spelling, or remove them and submit again.
                The rest of your list has been added.
              </div>
            </div>
          </div>
        )}

        {/* ROWS — scrolls internally */}
        <div
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 -mr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Sticky column header */}
          <div className="sticky top-0 z-[1] mb-1 grid grid-cols-[1fr_88px_36px] gap-2.5 border-b border-pm-ink-200 bg-white px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
            <span>SKU</span>
            <span>Qty</span>
            <span />
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_88px_36px] items-center gap-2.5"
            >
              <input
                value={row.sku}
                onChange={(e) => setRow(i, 'sku', e.target.value)}
                placeholder="e.g. P58416-B21"
                className="rounded-md border border-pm-ink-300 bg-white px-3 py-2.5 text-sm text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
              />
              <input
                type="number"
                min={1}
                value={row.qty}
                onChange={(e) => setRow(i, 'qty', Number(e.target.value))}
                className="rounded-md border border-pm-ink-300 bg-white px-3 py-2.5 text-center text-sm text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                aria-label="Remove row"
                className="flex h-9 w-9 items-center justify-center rounded-md text-pm-ink-500 transition-colors hover:enabled:bg-pm-danger-bg hover:enabled:text-pm-danger disabled:cursor-not-allowed disabled:opacity-30"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="mt-1.5 inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-pm-ink-300 px-3 py-1.5 text-[13px] font-semibold text-pm-navy-mid transition-all hover:border-pm-navy-mid hover:bg-pm-navy-pale"
          >
            <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-pm-navy-mid text-white">
              <Plus size={12} strokeWidth={3} />
            </span>
            Add another row
          </button>
        </div>

        {/* FOOT */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-pm-ink-200 pt-4">
          <span className="text-[13px] text-pm-ink-500">
            {filled.length} SKU{filled.length === 1 ? '' : 's'} ·{' '}
            {totalUnits} unit{totalUnits === 1 ? '' : 's'} ready to add
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-md bg-pm-ink-100 px-4 py-3.5 text-[15px] font-semibold text-pm-ink-700 transition-colors hover:enabled:bg-pm-ink-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={filled.length === 0 || submitting}
              onClick={handleSubmit}
              className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:enabled:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:bg-pm-ink-300"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    strokeWidth={2.25}
                    className="animate-spin"
                  />
                  Resolving…
                </>
              ) : (
                'Add to cart'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

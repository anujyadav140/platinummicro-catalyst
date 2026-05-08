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
import { X, Plus } from 'lucide-react';
import type {
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset rows shortly after the close animation
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => setRows(makeEmptyRows(initialRowCount)), 200);
  }, [onClose, initialRowCount]);

  const setRow = (i: number, key: keyof PmQuickOrderRow, value: string | number) => {
    setRows((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
    );
  };

  const addRow = () => setRows((rs) => [...rs, { sku: '', qty: 1 }]);

  const removeRow = (i: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
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
              className="rounded-md bg-pm-ink-100 px-4 py-3.5 text-[15px] font-semibold text-pm-ink-700 transition-colors hover:bg-pm-ink-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={filled.length === 0}
              onClick={() => {
                onAdd?.(filled);
                handleClose();
              }}
              className="rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:bg-pm-ink-300"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

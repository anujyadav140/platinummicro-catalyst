'use client';

/**
 * useQuickOrderAddHandler
 * -----------------------
 * Shared submit handler for `<PmQuickOrderModal>`. Resolves each typed
 * SKU against BC via the `resolveQuickOrderSkus` server action, pushes
 * the resolved (entityId-bearing) lines into the BoM, and returns the
 * SKUs that didn't match so the modal can flag them inline.
 *
 * Every preview shell (homepage, category, PDP, cart, account, etc.)
 * used to inline its own one-line addLines callback that produced
 * SKU-only BoM lines — those lines lacked `productEntityId` and
 * couldn't go through Stencil checkout (start-checkout filters them
 * out by design). Centralizing here means:
 *   - Each shell drops to a single `useQuickOrderAddHandler()` call
 *   - Future shells that add Quick Order can't accidentally regress
 *   - The resolve roundtrip is in one place for caching / metrics
 */

import { useCallback } from 'react';
import { resolveQuickOrderSkus } from '~/app/dev/preview/_actions/resolve-quick-order-skus';
import {
  usePmQuote,
  type PmBomLine,
} from '~/lib/pm-quote-store';
import type {
  PmQuickOrderAddResult,
  PmQuickOrderRow,
} from '~/components/pm-quick-order-modal';

export function useQuickOrderAddHandler(): (
  rows: PmQuickOrderRow[],
) => Promise<PmQuickOrderAddResult> {
  const { addLines, open: openDrawer } = usePmQuote();

  return useCallback(
    async (rows) => {
      const inputs = rows
        .map((r) => ({ sku: r.sku.trim(), qty: Number(r.qty) || 1 }))
        .filter((r) => r.sku.length > 0);
      if (inputs.length === 0) return { missing: [] };

      const { resolved, missing } = await resolveQuickOrderSkus(inputs);

      // Push resolved lines into the BoM. Each line now carries
      // productEntityId + price + stock so direct checkout works.
      if (resolved.length > 0) {
        const lines: PmBomLine[] = resolved.map((r) => ({
          sku: r.sku,
          qty: r.qty,
          title: r.title,
          imageUrl: r.imageUrl,
          unitPrice: r.unitPrice,
          brand: r.brand,
          inStock: r.inStock,
          productEntityId: r.productEntityId,
        }));
        addLines(lines);
      }

      // Open the drawer only if SOMETHING resolved — otherwise let the
      // modal keep focus on its own error banner so the user can fix
      // typos without context-switching.
      if (resolved.length > 0) openDrawer();

      return { missing };
    },
    [addLines, openDrawer],
  );
}

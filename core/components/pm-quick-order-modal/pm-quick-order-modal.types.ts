/**
 * Types for the Quick Order modal — paste SKU + quantity rows and submit
 * them straight to the BOM/Quote drawer.
 */

export interface PmQuickOrderRow {
  sku: string;
  qty: number;
}

/**
 * Result returned by the parent's resolver. Pre-Catalyst the modal just
 * forwarded raw rows; we now hand them to a server-side BC lookup so
 * the resulting BoM lines carry productEntityId + price + stock, which
 * is what /checkout needs to go through (vs. falling back to quote).
 */
export interface PmQuickOrderAddResult {
  /** SKUs the modal couldn't match against BC — surfaced inline */
  missing: string[];
}

export interface PmQuickOrderModalProps {
  /** Whether the modal is visible */
  open: boolean;

  /** Close handler — called both on backdrop click and Cancel button */
  onClose: () => void;

  /**
   * Submit handler — receives only the rows that have a non-empty SKU.
   * May be sync (legacy paste-only flow) or async (the resolver-backed
   * flow that hydrates each SKU against BC and returns the list of
   * SKUs we couldn't match so the modal can flag them inline before
   * closing).
   *
   * The parent typically forwards these to the Quote drawer / BOM store.
   */
  onAdd?: (rows: PmQuickOrderRow[]) =>
    | void
    | Promise<void>
    | Promise<PmQuickOrderAddResult>;

  /** Initial number of empty rows shown when the modal opens. Default 3. */
  initialRowCount?: number;
}

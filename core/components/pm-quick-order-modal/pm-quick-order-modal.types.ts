/**
 * Types for the Quick Order modal — paste SKU + quantity rows and submit
 * them straight to the BOM/Quote drawer.
 */

export interface PmQuickOrderRow {
  sku: string;
  qty: number;
}

export interface PmQuickOrderModalProps {
  /** Whether the modal is visible */
  open: boolean;

  /** Close handler — called both on backdrop click and Cancel button */
  onClose: () => void;

  /**
   * Submit handler — receives only the rows that have a non-empty SKU.
   * The parent typically forwards these to the Quote drawer / BOM store.
   */
  onAdd?: (rows: PmQuickOrderRow[]) => void;

  /** Initial number of empty rows shown when the modal opens. Default 3. */
  initialRowCount?: number;
}

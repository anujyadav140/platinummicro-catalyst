/**
 * PmProductDetail prop types.
 * Kept in a separate file so the (server-side) page.tsx can import these
 * without dragging the (client) component bundle along.
 */

import type { PmProductDetail } from '~/lib/pm-product-by-slug';

export interface PmProductDetailProps {
  product: PmProductDetail;
}

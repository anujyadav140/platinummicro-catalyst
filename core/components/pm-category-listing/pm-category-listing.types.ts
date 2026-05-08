import type { PmProduct } from '~/lib/pm-products';
import type { PmCategoryDescriptor } from '~/lib/pm-category-by-slug';
import type { PmViewMode } from '~/components/pm-view-toggle';

export interface PmCategoryListingProps {
  category: PmCategoryDescriptor;
  /** Products to render on the current page (already filtered + paginated server-side) */
  products: PmProduct[];
  /** Brand facet entries (top N by count, computed server-side from the full category list) */
  brands: Array<{ brand: string; count: number }>;
  /** Total products after filters but before pagination (used for "X of Y" range) */
  totalCount: number;
  currentPage: number;
  totalPages: number;
  /** Products per page (used to compute the visible range "1 - 17 of 17") */
  pageSize: number;
  /** Active layout — comes from URL `?view=` and is read server-side */
  viewMode: PmViewMode;
  /** Upper bound for the price-range slider — derived from the live max price. */
  priceSliderMax: number;
}

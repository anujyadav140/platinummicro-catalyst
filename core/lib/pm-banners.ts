/**
 * pm-banners (server-only)
 * ------------------------
 * Reads BC's admin-managed banner strips (Marketing → Banners) so the team
 * can publish marketing copy without code changes. BC banners aren't exposed
 * via the Storefront GraphQL API, so this hits the REST V2 admin endpoint
 * directly using the store's admin API token.
 *
 * Filtering rules applied here (so render-site components stay dumb):
 *   - `visible: 1` only — hidden banners are dropped
 *   - `date_type === 'always'` always passes
 *   - `date_type === 'custom'` passes only when "now" is between
 *     `date_from` and `date_to` (inclusive, in Unix seconds)
 *
 * On any failure (missing env, network, non-2xx, malformed payload) returns
 * `[]` and logs once. The page must keep rendering — banners are
 * non-essential chrome.
 *
 * Cached for 60s via Next's `fetch` revalidate so admins see edits within
 * about a minute. Same TTL as the other PM fetchers.
 */
export interface PmBanner {
  id: number;
  name: string;
  /** HTML — must be sanitized at render-site if untrusted, but BC admin is trusted */
  content: string;
  /** Where on the page the banner is meant to appear */
  page: 'TOP_OF_PAGE' | 'BOTTOM_OF_PAGE' | 'CATEGORY_PAGE' | 'SEARCH_PAGE' | 'BRAND_PAGE';
}

interface BcBannerRaw {
  id: number;
  name: string;
  content: string;
  page: string;
  location: string;
  date_type: string;
  date_from: number;
  date_to: number;
  visible: number;
  item_id: number;
}

function isActiveNow(b: BcBannerRaw): boolean {
  if (String(b.visible) !== '1') return false;
  if (b.date_type === 'always') return true;
  if (b.date_type === 'custom') {
    const now = Math.floor(Date.now() / 1000);
    return now >= Number(b.date_from) && now <= Number(b.date_to);
  }
  return false;
}

function locationToPage(location: string): PmBanner['page'] | undefined {
  if (location === 'top') return 'TOP_OF_PAGE';
  if (location === 'bottom') return 'BOTTOM_OF_PAGE';
  return undefined;
}

export async function fetchPmBanners(): Promise<PmBanner[]> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    // eslint-disable-next-line no-console
    console.warn('[pm-banners] missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN, returning []');
    return [];
  }

  try {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/banners`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    );

    // BC returns 204 when there are zero banners — treat as empty list, not error.
    if (res.status === 204) return [];

    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[pm-banners] BC REST returned ${res.status}, returning []`);
      return [];
    }

    const raw = (await res.json()) as BcBannerRaw[];
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(isActiveNow)
      .reduce<PmBanner[]>((acc, b) => {
        const page = locationToPage(b.location);
        if (page) {
          acc.push({ id: b.id, name: b.name, content: b.content, page });
        }
        return acc;
      }, []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pm-banners] fetch failed, returning []:', err);
    return [];
  }
}

/**
 * Convention for the navy trust bar at the very top of the page (PmTopBar):
 * any banner whose name starts with "trust" (case-insensitive, after trim)
 * is treated as trust-bar copy and rendered there instead of the regular
 * top-of-page banner strip. Lets the team edit the trust line ("MBE-
 * certified · Free freight · Ships from CA") from BC admin without code
 * changes. The first matching banner wins; subsequent matches are ignored.
 */
export function isPmTrustBarBanner(banner: PmBanner): boolean {
  return /^\s*trust/i.test(banner.name);
}

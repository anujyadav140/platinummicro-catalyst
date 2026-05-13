/**
 * pm-promotions (server-only)
 * ---------------------------
 * Surfaces the active site-wide offers that admins create in BC admin
 * (Marketing → Promotions) so customers can browse them on a public listing
 * page. Pulls from BC's REST V3 promotions endpoint and shapes each row into
 * the lean `PmPromotion` model the card actually needs.
 *
 * BC's promotion shape carries a lot of admin-only metadata (rules, coupon
 * codes, internal notes). We keep just enough on the client side to render a
 * useful customer-facing card: a human summary ("10% off"), the marketing
 * headline notification, the redemption mechanism, and the active window.
 *
 * Errors fall through to an empty list — the listing page handles empty
 * gracefully, and a broken offers page should never block the site.
 */

interface BcPromotionDiscount {
  amount?: number | string;
  percentage_amount?: number | string;
}

interface BcPromotionRule {
  discount?: BcPromotionDiscount;
}

interface BcPromotionNotification {
  content?: string;
}

interface BcPromotionSchedule {
  starts_at?: string | null;
  ends_at?: string | null;
}

interface BcPromotion {
  id: number;
  name: string;
  display_name?: string;
  status: 'ENABLED' | 'DISABLED' | 'ARCHIVED';
  type: string;
  redemption_type: 'AUTOMATIC' | 'COUPON';
  notifications?: BcPromotionNotification[];
  rules?: BcPromotionRule[];
  schedule?: BcPromotionSchedule;
}

interface BcPromotionsResponse {
  data: BcPromotion[];
}

export interface PmPromotion {
  id: number;
  name: string;
  /** Marketing copy from BC, e.g. "Spend $50, get 10% off site-wide". Falls back to `name` when empty. */
  headline: string;
  /** Human-readable summary — something like "10% off" or "Free shipping over $100" */
  summary: string;
  /** AUTOMATIC = applied at checkout automatically. COUPON = customer needs a code. */
  redemption: 'AUTOMATIC' | 'COUPON';
  /** ISO 8601 string or null. */
  startsAt: string | null;
  endsAt: string | null;
  /** Whether the promo is currently within its active window. */
  isActive: boolean;
}

/** Strip a leading `<p>...</p>` etc. so notification HTML renders as plain text. */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/** Coerce BC's amount fields — they can come back as numbers or numeric strings. */
function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Trim trailing zeros for cleaner display ("10% off" not "10.00% off"). */
function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, '');
}

function buildSummary(promo: BcPromotion): string {
  const firstRule = promo.rules?.[0];
  const discount = firstRule?.discount;

  switch (promo.type) {
    case 'PERCENTAGE_DISCOUNT': {
      const pct = toNumber(discount?.percentage_amount);
      return pct !== undefined ? `${formatNumber(pct)}% off` : 'Percentage discount';
    }
    case 'FIXED_AMOUNT_DISCOUNT': {
      const amt = toNumber(discount?.amount);
      return amt !== undefined ? `$${formatNumber(amt)} off` : 'Amount off';
    }
    case 'FREE_SHIPPING':
      return 'Free shipping';
    default:
      return 'Special offer';
  }
}

function buildHeadline(promo: BcPromotion): string {
  const raw = promo.notifications?.[0]?.content;
  if (raw) {
    const cleaned = stripHtml(raw);
    if (cleaned) return cleaned;
  }
  return promo.display_name ?? promo.name;
}

function isWithinWindow(schedule: BcPromotionSchedule | undefined, now: Date): boolean {
  const startsAt = schedule?.starts_at;
  const endsAt = schedule?.ends_at;
  if (startsAt && now < new Date(startsAt)) return false;
  if (endsAt && now > new Date(endsAt)) return false;
  return true;
}

export async function fetchPmPromotions(): Promise<PmPromotion[]> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    // eslint-disable-next-line no-console
    console.warn('[pm-promotions] missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN');
    return [];
  }

  try {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/promotions?status=ENABLED&limit=100`;
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': accessToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[pm-promotions] BC returned ${response.status} ${response.statusText}`);
      return [];
    }

    const json = (await response.json()) as BcPromotionsResponse;
    const now = new Date();

    const mapped: PmPromotion[] = (json.data ?? []).map((promo) => {
      const startsAt = promo.schedule?.starts_at ?? null;
      const endsAt = promo.schedule?.ends_at ?? null;
      const isActive = promo.status === 'ENABLED' && isWithinWindow(promo.schedule, now);

      return {
        id: promo.id,
        name: promo.name,
        headline: buildHeadline(promo),
        summary: buildSummary(promo),
        redemption: promo.redemption_type,
        startsAt,
        endsAt,
        isActive,
      };
    });

    // Active first, then stable alphabetical so the page reads predictably
    // when admins toggle promos on and off.
    mapped.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return mapped;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pm-promotions] failed to fetch promotions:', err);
    return [];
  }
}

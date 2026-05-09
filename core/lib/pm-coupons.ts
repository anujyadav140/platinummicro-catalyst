/**
 * pm-coupons
 * ----------
 * Server-side validator for BigCommerce admin coupons.
 *
 * The PM "cart" is actually a quote/BOM drawer — for v1 we just *check*
 * whether a code is real, enabled, and not expired, then echo a short
 * human-readable summary back to the drawer. Real cart application will
 * land when an actual BC cart is wired up.
 *
 * Hits BC REST V2 directly (`/v2/coupons?code={CODE}`) since the GraphQL
 * Storefront API doesn't expose admin coupon metadata.
 */

interface BcCoupon {
  id: number;
  name: string;
  code: string;
  type: string;
  amount: string | number;
  enabled: boolean;
  /** Unix seconds; 0 = never expires */
  expires: number;
  min_purchase?: string | number;
  max_uses?: number;
  num_uses?: number;
}

export interface PmCouponValidation {
  valid: boolean;
  /** The normalized code (uppercased, trimmed) */
  code: string;
  /** When valid: human-readable summary like "10% off" or "Free shipping" */
  summary?: string;
  /** When invalid: short reason ("Code not found", "This code has expired", "This code is disabled") */
  reason?: string;
}

function buildSummary(type: string, amount: string | number): string {
  // BC stores amount as a string like "10.0000" — strip trailing zeros for display.
  const n = Number(amount);
  const pretty = Number.isFinite(n)
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : String(amount);

  switch (type) {
    case 'percentage_discount':
      return `${pretty}% off`;
    case 'free_shipping':
      return 'Free shipping';
    case 'per_item_discount':
    case 'cart_dollars_off':
    case 'shipping_amount_off':
      return `$${pretty} off`;
    default:
      return 'Discount applied';
  }
}

export async function validatePmCoupon(rawCode: string): Promise<PmCouponValidation> {
  const code = (rawCode ?? '').trim().toUpperCase();

  if (!code) {
    return { valid: false, code: '', reason: 'Enter a code' };
  }

  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    // eslint-disable-next-line no-console
    console.error('[pm-coupons] missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN');
    return { valid: false, code, reason: 'Could not check this code right now' };
  }

  try {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v2/coupons?code=${encodeURIComponent(code)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Token': accessToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    // BC returns 204 when the filter has no match.
    if (res.status === 204) {
      return { valid: false, code, reason: 'Code not found' };
    }

    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[pm-coupons] BC responded', res.status, res.statusText);
      return { valid: false, code, reason: 'Could not check this code right now' };
    }

    const data = (await res.json()) as BcCoupon[] | null;
    const match = Array.isArray(data) ? data[0] : null;

    if (!match) {
      return { valid: false, code, reason: 'Code not found' };
    }

    if (!match.enabled) {
      return { valid: false, code, reason: 'This code is disabled' };
    }

    if (match.expires > 0 && match.expires * 1000 < Date.now()) {
      return { valid: false, code, reason: 'This code has expired' };
    }

    const maxUses = Number(match.max_uses ?? 0);
    const numUses = Number(match.num_uses ?? 0);
    if (maxUses > 0 && numUses >= maxUses) {
      return { valid: false, code, reason: 'This code has reached its usage limit' };
    }

    return {
      valid: true,
      code,
      summary: buildSummary(match.type, match.amount),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pm-coupons] validation failed:', err);
    return { valid: false, code, reason: 'Could not check this code right now' };
  }
}

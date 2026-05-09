/**
 * POST /dev/preview/api/coupons/validate
 *
 * JSON endpoint backing the quote-drawer coupon input. Thin wrapper over
 * `validatePmCoupon` — keeps the BC REST credentials server-side.
 *
 * Always returns 200; validation failures are surfaced in-band as
 * `{ valid: false, reason }` so the drawer can render a friendly message
 * rather than a generic fetch error.
 */

import { NextResponse } from 'next/server';
import { validatePmCoupon } from '~/lib/pm-coupons';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown } | null;
    const code = typeof body?.code === 'string' ? body.code : '';
    const result = await validatePmCoupon(code);
    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/coupons/validate] failed:', err);
    return NextResponse.json({
      valid: false,
      code: '',
      reason: 'Could not check this code right now',
    });
  }
}

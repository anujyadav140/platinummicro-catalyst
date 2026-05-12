/**
 * POST /dev/preview/api/compare
 *
 * Body: `{ slugs: string[] }` — up to 4 product path slugs (e.g. "/foo/").
 * Returns `{ specsBySlug: { [slug]: PmProductSpec[] } }`.
 *
 * Powers the side-by-side specifications grid on /dev/preview/compare/.
 * The compare list itself lives in localStorage (sku, name, image, etc.),
 * so specs have to be fetched fresh from BC at view time — keeps localStorage
 * tiny and lets the merchant edit specs without users needing to re-toggle
 * products into the compare list.
 */

import { NextResponse } from 'next/server';
import { fetchPmProductBySlug, type PmProductSpec } from '~/lib/pm-product-by-slug';

const MAX_ITEMS = 4;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ specsBySlug: {} }, { status: 400 });
  }

  const slugs = Array.isArray((body as { slugs?: unknown })?.slugs)
    ? ((body as { slugs: unknown[] }).slugs.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      ).slice(0, MAX_ITEMS))
    : [];

  if (slugs.length === 0) {
    return NextResponse.json({ specsBySlug: {} });
  }

  const entries = await Promise.all(
    slugs.map(async (slug): Promise<[string, PmProductSpec[]]> => {
      try {
        const product = await fetchPmProductBySlug(slug);
        return [slug, product?.specs ?? []];
      } catch {
        return [slug, []];
      }
    }),
  );

  const specsBySlug: Record<string, PmProductSpec[]> = Object.fromEntries(entries);

  return NextResponse.json(
    { specsBySlug },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    },
  );
}

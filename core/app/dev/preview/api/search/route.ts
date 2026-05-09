/**
 * GET /dev/preview/api/search?q={query}&limit={n}
 *
 * JSON endpoint backing the header typeahead. Thin wrapper over
 * `searchPmProducts` — keeps BC client / GraphQL out of the client bundle.
 *
 * Returns 200 with `{ hits: [], totalCount: 0, query }` for empty/too-short
 * queries and for upstream errors, since the typeahead just hides itself
 * when there are zero hits and a 4xx/5xx would surface as an error toast in
 * the panel — bad UX for a transient hiccup.
 */

import { NextResponse } from 'next/server';
import { searchPmProducts } from '~/lib/pm-search';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await searchPmProducts(q, Number.isFinite(limit) ? limit : undefined);
    // Browser caches typeahead responses for 60s — backspacing or retyping
    // a recent query becomes instant. SWR keeps the experience fresh after
    // the window without making the user wait on a network round-trip.
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/search] failed:', err);
    return NextResponse.json({ hits: [], totalCount: 0, query: q.trim() });
  }
}

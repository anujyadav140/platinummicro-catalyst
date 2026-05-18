'use client';

/**
 * PmSearchTypeahead
 * -----------------
 * Header search bar with a live results panel. Mirrors the original
 * GET-form fallback but, when JS is on, debounces input → fetches
 * /dev/preview/api/search → renders a sleek dropdown the user can
 * arrow through.
 *
 * Behavior:
 *   - 200ms typing debounce; AbortController cancels stale requests
 *     so old responses can never overwrite a fresher one
 *   - Panel opens when there are results and the input has focus
 *   - ↑/↓ moves the highlight, Enter navigates (highlighted hit OR
 *     first hit OR /search submission), Esc closes
 *   - Click outside / blur (with grace delay so clicks land) closes
 *   - Loading state replaces the trailing search icon with a spinner
 *   - Match-highlighting bolds the typed query within result names
 *
 * Accessibility:
 *   - role="combobox" on input, role="listbox" on panel,
 *     aria-activedescendant tracks the focused row
 *   - Each row is a real <a> so middle-click / cmd-click open in
 *     a new tab as expected
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, PackageSearch, Search } from 'lucide-react';
import { Image } from '~/components/image';
import type { PmSearchHit } from '~/lib/pm-search';

export interface PmSearchTypeaheadProps {
  placeholder?: string;
  /** Submit-target for the GET fallback (no-JS / Enter with no hits). */
  searchAction?: string;
  /** Where to navigate "View all N results" — accepts a query string. */
  resultsHref?: (query: string) => string;
}

interface SearchResponse {
  hits: PmSearchHit[];
  totalCount: number;
  query: string;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;

// Fixed listbox ID — only one search typeahead is mounted per page, so a
// stable hardcoded ID is preferable to React's `useId`. We saw `useId`
// producing different paths on server vs client (the search input's
// `aria-controls` changed across hydration), throwing a React hydration
// warning. A constant ID avoids the issue entirely.
const PANEL_ID = 'pm-search-typeahead-panel';

export function PmSearchTypeahead({
  placeholder = 'Search by keyword, brand, or SKU',
  searchAction = '/dev/preview/api/search',
  resultsHref = (q) => `/dev/preview/search?q=${encodeURIComponent(q)}`,
}: PmSearchTypeaheadProps) {
  const router = useRouter();
  const panelId = PANEL_ID;

  // Input is controlled. `committedQuery` is what the latest response was
  // for (used to filter out stale responses if the user keeps typing).
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PmSearchHit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [committedQuery, setCommittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);

  const wrapperRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const showPanel =
    open &&
    trimmed.length >= MIN_QUERY_LEN &&
    // Only show after we've issued at least one request for a query of
    // similar length — avoids a flash of empty panel before the first fetch.
    (loading || hits.length > 0 || committedQuery.length >= MIN_QUERY_LEN);

  const fetchHits = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(
        `${searchAction}?q=${encodeURIComponent(q)}&limit=8`,
        { signal: ctrl.signal },
      );
      if (!res.ok) throw new Error(`search ${res.status}`);
      const json = (await res.json()) as SearchResponse;
      // Drop responses for queries the user has already typed past.
      if (json.query !== q.trim()) return;
      setHits(json.hits);
      setTotalCount(json.totalCount);
      setCommittedQuery(json.query);
      setHighlight(-1);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      // eslint-disable-next-line no-console
      console.error('[search] fetch failed', err);
      setHits([]);
      setTotalCount(0);
    } finally {
      // Only clear loading if this request is still the latest one.
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [searchAction]);

  // Debounce: typing → fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < MIN_QUERY_LEN) {
      setHits([]);
      setTotalCount(0);
      setCommittedQuery('');
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchHits(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, fetchHits]);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Esc closes panel; ↑/↓ navigate; Enter selects
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || hits.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      // Enter falls through to native form submit when no panel
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? hits.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
      if (highlight >= 0) {
        router.push(hits[highlight].href);
      } else {
        router.push(resultsHref(trimmed));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOpen(false);
    if (highlight >= 0 && hits.length > 0) {
      router.push(hits[highlight].href);
    } else {
      router.push(resultsHref(trimmed));
    }
  };

  return (
    <form
      ref={wrapperRef}
      action={searchAction}
      method="get"
      onSubmit={handleSubmit}
      role="search"
      className="relative flex w-full flex-1 items-stretch md:max-w-[720px]"
    >
      <div
        className={`flex flex-1 items-stretch overflow-hidden rounded-lg border-[1.5px] bg-white transition-all ${
          showPanel
            ? 'rounded-b-none border-pm-navy-light shadow-[0_0_0_3px_rgba(46,109,180,0.15)]'
            : 'border-pm-ink-300 focus-within:border-pm-navy-light focus-within:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]'
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={panelId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && highlight >= 0
              ? `${panelId}-hit-${highlight}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-pm-ink-900 outline-none placeholder:text-pm-ink-500 sm:px-4 sm:text-[15px] md:px-[18px] md:py-[13px]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="shrink-0 inline-flex h-11 items-center justify-center gap-2 bg-pm-terracotta px-4 text-sm font-semibold text-white transition-colors hover:bg-pm-terracotta-light sm:px-5 md:h-auto md:px-7 md:text-[15px]"
        >
          {loading ? (
            <Loader2 size={16} strokeWidth={2.25} className="animate-spin" />
          ) : (
            <Search size={16} strokeWidth={2.25} />
          )}
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {showPanel && (
        <div
          id={panelId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 max-h-[min(70vh,520px)] overflow-y-auto rounded-b-lg border-x-[1.5px] border-b-[1.5px] border-pm-navy-light bg-white shadow-[0_12px_28px_-8px_rgba(7,21,37,0.18)]"
        >
          {loading && hits.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[14px] text-pm-ink-500">
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              Searching…
            </div>
          ) : hits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-pm-ink-500">
              <PackageSearch size={28} strokeWidth={1.5} className="text-pm-ink-300" />
              <p className="text-[14px] font-semibold text-pm-ink-700">
                No products match &ldquo;{committedQuery}&rdquo;.
              </p>
              <p className="text-[12.5px]">
                Try a brand, SKU, or part of a product name.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-pm-ink-100">
                {hits.map((hit, i) => (
                  <li
                    key={hit.id}
                    id={`${panelId}-hit-${i}`}
                    role="option"
                    aria-selected={highlight === i}
                  >
                    <Link
                      href={hit.href}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex items-stretch gap-3 px-4 py-2.5 transition-colors ${
                        highlight === i ? 'bg-pm-paper' : 'hover:bg-pm-paper'
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-pm-ink-200 bg-white">
                        {hit.imageUrl ? (
                          // BC CDN urlTemplate — Catalyst <Image> substitutes
                          // the `{:size}` token per-DPR. Fixed 56px tile.
                          <Image
                            src={hit.imageUrl}
                            alt={hit.imageAlt}
                            width={56}
                            height={56}
                            sizes="56px"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pm-ink-400">
                            {hit.sku.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                        <p className="line-clamp-2 text-[13.5px] font-semibold leading-[1.35] text-pm-ink-900">
                          {highlightMatch(hit.name, committedQuery)}
                        </p>
                        <p className="flex items-center gap-2 truncate text-[11.5px] text-pm-ink-500">
                          {hit.brand && (
                            <span className="truncate font-semibold uppercase tracking-[0.04em] text-pm-ink-700">
                              {hit.brand}
                            </span>
                          )}
                          <span className="text-pm-ink-300">·</span>
                          <span className="truncate">SKU {hit.sku}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-0.5">
                        {hit.priceLabel && (
                          <span className="whitespace-nowrap text-[14px] font-bold text-pm-ink-900">
                            {hit.priceLabel}
                          </span>
                        )}
                        <span
                          className={`text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
                            hit.inStock ? 'text-pm-success' : 'text-pm-warning'
                          }`}
                        >
                          {hit.inStock ? 'In stock' : 'Lead time'}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalCount > hits.length && (
                <Link
                  href={resultsHref(committedQuery)}
                  onClick={() => setOpen(false)}
                  className="block border-t border-pm-ink-100 bg-pm-paper px-4 py-3 text-center text-[13px] font-semibold text-pm-navy-mid transition-colors hover:bg-pm-tan-pale hover:text-pm-navy-deep"
                >
                  View all {totalCount.toLocaleString()} results for &ldquo;
                  {committedQuery}&rdquo; →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}

/**
 * Bolds occurrences of `query` inside `text` so users can see at a glance
 * why a hit matched. Case-insensitive, handles regex-special chars in the
 * query, splits at every match (not just the first).
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < MIN_QUERY_LEN) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="rounded-sm bg-pm-tan-pale px-0.5 font-bold text-pm-navy-deep"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}


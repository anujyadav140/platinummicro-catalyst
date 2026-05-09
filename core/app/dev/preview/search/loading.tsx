import { ChevronRight, House, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SearchLoading() {
  return (
    <main className="bg-pm-paper">
      <div className="mx-auto max-w-pm-container px-8 pb-6 pt-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[14px] text-pm-ink-500"
        >
          <Link
            href="/dev/preview"
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-pm-ink-500"
          >
            <House size={14} strokeWidth={1.75} />
            <span>Home</span>
          </Link>
          <ChevronRight size={14} strokeWidth={2} className="text-pm-ink-300" />
          <span className="font-semibold text-pm-ink-900">Search</span>
        </nav>
        <div className="mt-3 flex items-center gap-2 text-pm-ink-500">
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          <span className="text-[13px]">Searching the catalog…</span>
        </div>
      </div>

      <div className="mx-auto max-w-pm-container px-8 pb-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
          {/* Filter sidebar skeleton */}
          <div className="hidden lg:flex flex-col gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-24 animate-pulse rounded bg-pm-ink-200" />
                <div className="h-3 w-full animate-pulse rounded bg-pm-ink-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-pm-ink-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-pm-ink-100" />
              </div>
            ))}
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2.5 rounded-lg border border-pm-ink-200 bg-white p-4"
              >
                <div className="h-[160px] animate-pulse rounded-md bg-pm-ink-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-pm-ink-100" />
                <div className="h-4 w-full animate-pulse rounded bg-pm-ink-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-pm-ink-100" />
                <div className="mt-1 flex items-center justify-between border-t border-pm-ink-200 pt-3">
                  <div className="h-5 w-16 animate-pulse rounded bg-pm-ink-100" />
                  <div className="h-7 w-14 animate-pulse rounded bg-pm-ink-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

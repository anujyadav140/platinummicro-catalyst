/**
 * /dev/preview not-found
 * ----------------------
 * Branded fallback page rendered whenever something under `/dev/preview/*`
 * calls `notFound()` — most commonly the product detail route when BC's
 * `site.route()` can't resolve a slug, but also any other unmatched URL
 * inside the preview namespace.
 *
 * Why a dedicated 404 here:
 *   - The root `app/not-found.tsx` is unbranded (Catalyst stock chrome).
 *     A user clicking a product card on the homepage and landing on
 *     generic typography feels like "the site is broken."
 *   - Next.js wraps this with the nearest layout, so we get the PM
 *     header + footer for free without re-importing them.
 *
 * Common causes for getting here:
 *   - BC product visibility changed (was visible when the homepage was
 *     rendered, then hidden / unpublished / channel-rescoped before the
 *     user clicked).
 *   - Product deleted in BC admin.
 *   - Stale CDN/edge cache holding the old `newestProducts` list.
 *   - A category whose products have been moved/renamed.
 */

import Link from 'next/link';
import { ArrowRight, PackageSearch, Phone } from 'lucide-react';

export default function PreviewNotFound() {
  return (
    <main className="bg-pm-paper">
      <div className="mx-auto flex max-w-pm-container flex-col items-center px-8 py-20 text-center sm:py-28">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pm-tan-pale text-pm-tan">
          <PackageSearch size={36} strokeWidth={1.25} />
        </div>

        <h1 className="mt-6 text-[28px] font-bold tracking-tight text-pm-ink-900 sm:text-[40px]">
          We couldn&apos;t find that page
        </h1>

        <p className="mt-3 max-w-[520px] text-[15px] leading-[1.55] text-pm-ink-500">
          The product or page you&apos;re looking for may have been moved,
          renamed, or sold out. Our team probably knows where it went —
          try the catalog or give us a call.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dev/preview/"
            className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-pm-terracotta-light"
          >
            Browse catalog
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
          <Link
            href="/dev/preview/category/servers/"
            className="inline-flex items-center rounded-md border border-pm-ink-300 bg-white px-5 py-3 text-[14px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100"
          >
            See popular servers
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-2 border-t border-pm-ink-200 pt-6 text-[13px] text-pm-ink-500">
          <Phone size={14} strokeWidth={1.5} />
          Need help finding something specific?{' '}
          <a
            href="tel:+18185730303"
            className="font-semibold text-pm-navy-deep underline-offset-2 hover:underline"
          >
            Call 1-818-573-0303
          </a>
        </div>
      </div>
    </main>
  );
}

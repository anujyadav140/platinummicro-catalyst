/**
 * PmLegalLayout
 * -------------
 * Shared chrome + typography wrapper for the legal pages
 * (terms, privacy, order verification). Reuses AccountShell so the persistent
 * cart drawer + QuickOrder modal still work while reading.
 *
 * The hero strip is navy-deep with the page title; the content column is a
 * centered 760px max-width on warm paper for comfortable reading length.
 *
 * Content typography is hand-styled here (not via @tailwind/typography prose)
 * so it stays locked to the type scale: H2 28/32, H3 18, body 15 with 1.6
 * line-height (lead body for long-form reading), lists with terracotta dot
 * markers.
 */

import type { ReactNode } from 'react';
import { AccountShell } from '~/app/dev/preview/account/account-shell';
import { getPmSessionCustomer } from '~/lib/pm-session-server';

export interface PmLegalLayoutProps {
  /** Small uppercase tracked label above the H1 */
  eyebrow: string;
  /** Main heading */
  title: string;
  /** "Effective" or "Last updated" line shown beneath the title (optional) */
  meta?: string;
  /** The body content — typically a series of <section> blocks */
  children: ReactNode;
}

// Async because we read the Auth.js session here so the AccountShell can
// render its signed-in chrome (header dropdown, top-bar greeting). All
// legal pages are server components, so awaiting in JSX is fine.
export async function PmLegalLayout({
  eyebrow,
  title,
  meta,
  children,
}: PmLegalLayoutProps) {
  const customer = await getPmSessionCustomer();

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        {/* Hero strip — navy-deep with the page title */}
        <section className="bg-pm-navy-deep">
          <div className="mx-auto max-w-pm-container px-8 py-16 lg:py-20">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-terracotta-light">
              {eyebrow}
            </div>
            <h1 className="mt-3 text-[clamp(32px,3.4vw,44px)] font-bold leading-[1.1] tracking-[-0.02em] text-white">
              {title}
            </h1>
            {meta && (
              <p className="mt-4 text-[14px] text-white/60">{meta}</p>
            )}
          </div>
        </section>

        {/* Content column — locked to our type scale */}
        <article className="mx-auto max-w-[760px] px-8 py-16 text-[15px] leading-[1.6] text-pm-ink-700 [&_h2]:mt-12 [&_h2:first-child]:mt-0 [&_h2]:text-[28px] [&_h2]:font-bold [&_h2]:tracking-[-0.018em] [&_h2]:text-pm-ink-900 [&_h3]:mt-8 [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:text-pm-ink-900 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul_li]:flex [&_ul_li]:items-start [&_ul_li]:gap-2.5 [&_ul_li]:before:mt-[10px] [&_ul_li]:before:h-1 [&_ul_li]:before:w-1 [&_ul_li]:before:shrink-0 [&_ul_li]:before:rounded-full [&_ul_li]:before:bg-pm-terracotta [&_ul_li]:before:content-[''] [&_strong]:font-semibold [&_strong]:text-pm-ink-900 [&_a]:font-semibold [&_a]:text-pm-navy-mid [&_a]:underline-offset-2 hover:[&_a]:text-pm-navy-light hover:[&_a]:underline">
          {children}
        </article>
      </main>
    </AccountShell>
  );
}

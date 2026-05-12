'use client';

/**
 * PmBannerStrip
 * -------------
 * Renders BC admin-managed banner strips above or below page content.
 *
 * Rich HTML from BC admin's editor is styled automatically — links get
 * underlines + hover color, bold/italic work, lists are spaced.
 *
 * Coupon convention: wrap a coupon code in <code> in BC's HTML editor
 * (click the HTML button). It renders as a pill badge the customer can
 * click to copy. Example HTML in BC admin:
 *   Use code <code>SAVE20</code> for 20% off!
 *
 * Banners are individually dismissable (X button). Dismissal is persisted
 * in a cookie keyed by BC banner ID (see `PM_DISMISSED_BANNERS_COOKIE`),
 * read server-side in the layout and filtered out before render so there
 * is no SSR-to-CSR flash. We still flip local state on click so the banner
 * disappears instantly without waiting for a router refresh.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Copy, Check } from 'lucide-react';
import type { PmBanner } from '~/lib/pm-banners';
import { appendDismissedBannerId } from '~/lib/pm-top-bar-cookie';

interface PmBannerStripProps {
  banners: PmBanner[];
  placement: 'top' | 'bottom';
}

const PLACEMENT_TO_PAGE: Record<PmBannerStripProps['placement'], PmBanner['page']> = {
  top: 'TOP_OF_PAGE',
  bottom: 'BOTTOM_OF_PAGE',
};

function BannerItem({ banner }: { banner: PmBanner }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 1800);
    });
  }, []);

  const handleDismiss = useCallback(() => {
    // Persist first so a fast follow-up navigation/refresh still sees the
    // dismissal, then flip local state so the banner disappears without
    // waiting on the router. router.refresh() re-runs the server layout
    // so other banner strips on the page (e.g. bottom placement) also
    // pick up the new cookie state.
    appendDismissedBannerId(banner.id);
    setDismissed(true);
    router.refresh();
  }, [banner.id, router]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const codeEls = el.querySelectorAll('code');
    codeEls.forEach((code) => {
      if (code.dataset.couponWired) return;
      code.dataset.couponWired = '1';

      code.style.cursor = 'pointer';
      code.title = 'Click to copy';
      code.setAttribute('role', 'button');
      code.setAttribute('tabindex', '0');

      const handler = () => handleCopy(code.textContent?.trim() ?? '');
      code.addEventListener('click', handler);
      code.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }, [handleCopy]);

  if (dismissed) return null;

  return (
    <div className="relative py-2.5">
      <div
        ref={ref}
        className="banner-rich mx-auto max-w-pm-container px-12 text-center text-[13.5px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: banner.content }}
      />
      {copiedCode && (
        <span className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 rounded bg-pm-navy-deep px-2.5 py-1 text-xs font-medium text-white shadow-md">
          <Check size={12} className="mr-1 inline" />
          Copied &quot;{copiedCode}&quot;
        </span>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pm-ink-400 transition-colors hover:bg-pm-ink-200/50 hover:text-pm-ink-900"
        aria-label="Dismiss banner"
      >
        <X size={20} strokeWidth={2} />
      </button>
    </div>
  );
}

export function PmBannerStrip({ banners, placement }: PmBannerStripProps) {
  const targetPage = PLACEMENT_TO_PAGE[placement];
  const matched = banners.filter((b) => b.page === targetPage);

  if (matched.length === 0) return null;

  return (
    <>
      {/* Scoped styles for BC admin HTML inside .banner-rich */}
      <style>{`
        .banner-rich a {
          text-decoration: underline;
          text-underline-offset: 2px;
          font-weight: 600;
          transition: color 0.15s;
        }
        .banner-rich a:hover {
          color: var(--color-pm-terracotta, #a0522d);
        }
        .banner-rich strong, .banner-rich b {
          font-weight: 700;
        }
        .banner-rich em, .banner-rich i {
          font-style: italic;
        }
        .banner-rich code {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0,0,0,0.08);
          border: 1px dashed rgba(0,0,0,0.2);
          border-radius: 4px;
          padding: 1px 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.92em;
          font-weight: 700;
          letter-spacing: 0.04em;
          user-select: all;
          transition: background 0.15s, border-color 0.15s;
        }
        .banner-rich code:hover {
          background: rgba(0,0,0,0.13);
          border-color: rgba(0,0,0,0.35);
        }
        .banner-rich code::after {
          content: '';
          display: inline-block;
          width: 12px;
          height: 12px;
          background: currentColor;
          opacity: 0.4;
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2' ry='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E");
          mask-size: contain;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2' ry='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E");
          -webkit-mask-size: contain;
        }
        .banner-rich ul, .banner-rich ol {
          display: inline;
        }
        .banner-rich li {
          display: inline;
        }
        .banner-rich li + li::before {
          content: ' · ';
          opacity: 0.5;
        }
        .banner-rich p {
          margin: 0;
        }
      `}</style>
      <div className="border-b border-pm-ink-200/50 bg-pm-tan-pale text-pm-ink-900">
        {matched.map((banner, idx) => (
          <div
            key={banner.id}
            className={idx < matched.length - 1 ? 'border-b border-pm-ink-200/30' : ''}
          >
            <BannerItem banner={banner} />
          </div>
        ))}
      </div>
    </>
  );
}

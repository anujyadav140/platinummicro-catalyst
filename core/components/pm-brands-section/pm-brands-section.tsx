'use client';

/**
 * PmBrandsSection
 * ===============
 * Admin-managed "Authorized Partners" carousel. Reads config produced by
 * `parsePmBrandsSection` (see `lib/pm-brands-section.ts`) plus brand data
 * fetched from BC by the page-banner fetcher (each grandchild category
 * under the section folder = one brand).
 *
 * Replaces the old hardcoded <PmBrandWall>. Keeps the drag-to-scroll
 * behavior so the row feels the same — admins just have control over
 * which brands appear, their order, and their logos.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Image } from '~/components/image';
import type {
  PmBrandConfig,
  PmBrandsSectionConfig,
} from '~/lib/pm-brands-section';

export interface PmBrandsSectionProps {
  section: PmBrandsSectionConfig;
}

/** Pixel threshold: drags shorter than this still register as clicks. */
const DRAG_CLICK_THRESHOLD = 6;

const DEFAULTS = {
  eyebrow: 'Authorized partners',
  title: 'Stocked, supported, sourced direct.',
  ctaLabel: 'All manufacturers',
  ctaHref: '/dev/preview/brands',
  paddingY: '80px',
  logoHeight: 64,
  columnsLg: 5,
  columnsMd: 3,
  columnsSm: 2,
};

export function PmBrandsSection({ section }: PmBrandsSectionProps) {
  const {
    eyebrow = DEFAULTS.eyebrow,
    title = DEFAULTS.title,
    ctaLabel = DEFAULTS.ctaLabel,
    ctaHref = DEFAULTS.ctaHref,
    bgColor,
    paddingY = DEFAULTS.paddingY,
    logoHeight = DEFAULTS.logoHeight,
    columnsLg = DEFAULTS.columnsLg,
    columnsMd = DEFAULTS.columnsMd,
    columnsSm = DEFAULTS.columnsSm,
    brands,
  } = section;

  if (brands.length === 0) return null;

  // ── Drag-to-scroll + paging-button state ─────────────────────────
  // The rail still supports drag-to-scroll with the cursor (kept from
  // the previous design). The bottom scrollbar is replaced by two
  // arrow buttons (one each side) that scroll by ~one viewport's width.
  // The buttons hide when there's nothing left to scroll in that
  // direction.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const railDragRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    movedDistance: number;
    pointerId: number;
  } | null>(null);
  const [railDragging, setRailDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute whether the left/right arrows should be visible based on
  // current scroll position. Allow ~1px slack so we don't get "stuck-
  // on" buttons due to subpixel rounding.
  const syncArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    syncArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      el.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows]);

  // Click an arrow → smooth-scroll by ~one viewport's worth so the
  // user sees a fresh page of brands while keeping some context.
  const pageStep = () => {
    const el = scrollRef.current;
    return el ? el.clientWidth * 0.8 : 0;
  };
  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * pageStep(), behavior: 'smooth' });
  };

  const handleRailPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = scrollRef.current;
    if (!el) return;
    railDragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      movedDistance: 0,
      pointerId: e.pointerId,
    };
    setRailDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleRailPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = railDragRef.current;
    if (!state?.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - state.startX;
    state.movedDistance = Math.max(state.movedDistance, Math.abs(dx));
    el.scrollLeft = state.startScrollLeft - dx;
  };
  const handleRailPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = railDragRef.current;
    if (!state) return;
    try {
      e.currentTarget.releasePointerCapture(state.pointerId);
    } catch {
      // pointer capture can be released by the browser already
    }
    if (state.movedDistance > DRAG_CLICK_THRESHOLD) {
      const suppressNextClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        window.removeEventListener('click', suppressNextClick, true);
      };
      window.addEventListener('click', suppressNextClick, true);
    }
    railDragRef.current = null;
    setRailDragging(false);
  };

  // Per-cell basis percentage from admin-set column count. Each cell
  // takes `(100/cols) - gap-fudge%` of the row width so N fit at the
  // given breakpoint.
  const basisSm = `calc(${100 / columnsSm}% - 8px)`;
  const basisMd = `calc(${100 / columnsMd}% - 11px)`;
  const basisLg = `calc(${100 / columnsLg}% - 13px)`;

  return (
    <section style={{ backgroundColor: bgColor, paddingTop: paddingY, paddingBottom: paddingY }}>
      <div className="mx-auto max-w-pm-container px-8">
        {/* Header — eyebrow + title on the left, CTA link on the right */}
        <div className="mb-9 flex items-end justify-between gap-6">
          <div>
            {eyebrow && (
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.018em] text-pm-ink-900 md:text-[32px]">
                {title}
              </h2>
            )}
          </div>
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-pm-navy-deep transition-colors hover:text-pm-terracotta"
            >
              {ctaLabel}
              <ArrowRight size={14} strokeWidth={2.25} />
            </Link>
          )}
        </div>

        {/* Per-instance responsive basis. Tailwind can't generate
            arbitrary flex-basis values at build time, so each cell
            carries its own --pm-basis-md / --pm-basis-lg vars and this
            <style> block applies them at the right breakpoints. */}
        <style
          // eslint-disable-next-line react/no-danger -- static, no user input
          dangerouslySetInnerHTML={{
            __html: `
              @media (min-width: 768px) {
                .pm-brand-cell { flex-basis: var(--pm-basis-md) !important; }
              }
              @media (min-width: 1024px) {
                .pm-brand-cell { flex-basis: var(--pm-basis-lg) !important; }
              }
            `,
          }}
        />

        {/* Rail + side-paging arrows. Layout is a 3-column flex row:
            [Left button] [Rail (flex-1)] [Right button]
            so logos never scroll underneath the buttons. Buttons stay
            mounted at fixed width and fade when there's nothing left
            to scroll in that direction — preserving layout (no shift
            when the rail reaches an edge). */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Left arrow */}
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll brands left"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-pm-navy-deep bg-white text-pm-navy-deep shadow-sm transition-all duration-pm-base ease-pm-standard hover:bg-pm-navy-deep hover:text-white hover:shadow-md disabled:cursor-default disabled:border-pm-ink-200 disabled:bg-white disabled:text-pm-ink-300 disabled:shadow-none disabled:hover:bg-white disabled:hover:text-pm-ink-300 disabled:hover:shadow-none"
          >
            <ChevronLeft size={18} strokeWidth={2.25} />
          </button>

          {/* Drag-to-scroll rail. min-w-0 lets it shrink properly
              inside the flex row; overflow-x-auto handles the
              horizontal scroll. */}
          <div
            ref={scrollRef}
            onPointerDown={handleRailPointerDown}
            onPointerMove={handleRailPointerMove}
            onPointerUp={handleRailPointerUp}
            onPointerCancel={handleRailPointerUp}
            className={`flex min-w-0 flex-1 select-none gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              railDragging
                ? 'cursor-grabbing scroll-auto'
                : 'cursor-grab snap-x snap-mandatory scroll-smooth'
            }`}
          >
            {brands.map((brand) => (
              <BrandCell
                key={brand.id}
                brand={brand}
                logoHeight={logoHeight}
                basisSm={basisSm}
                basisMd={basisMd}
                basisLg={basisLg}
              />
            ))}
          </div>

          {/* Right arrow */}
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            aria-label="Scroll brands right"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-pm-navy-deep bg-white text-pm-navy-deep shadow-sm transition-all duration-pm-base ease-pm-standard hover:bg-pm-navy-deep hover:text-white hover:shadow-md disabled:cursor-default disabled:border-pm-ink-200 disabled:bg-white disabled:text-pm-ink-300 disabled:shadow-none disabled:hover:bg-white disabled:hover:text-pm-ink-300 disabled:hover:shadow-none"
          >
            <ChevronRight size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </section>
  );
}

function BrandCell({
  brand,
  logoHeight,
  basisSm,
  basisMd,
  basisLg,
}: {
  brand: PmBrandConfig;
  logoHeight: number;
  basisSm: string;
  basisMd: string;
  basisLg: string;
}) {
  const inner = brand.logoUrl ? (
    <Image
      src={brand.logoUrl}
      alt={brand.name}
      width={240}
      height={logoHeight}
      sizes="240px"
      draggable={false}
      style={{ height: `${logoHeight}px`, width: 'auto' }}
      className="max-w-full object-contain opacity-90 transition-opacity duration-pm-base group-hover:opacity-100"
      onError={(e) => {
        const img = e.currentTarget;
        const fallback = document.createElement('span');
        fallback.className =
          'text-[16px] font-bold tracking-[0.04em] text-pm-ink-700 transition-colors group-hover:text-pm-navy-deep';
        fallback.textContent = brand.name;
        img.replaceWith(fallback);
      }}
    />
  ) : (
    <span className="text-[16px] font-bold tracking-[0.04em] text-pm-ink-700 transition-colors group-hover:text-pm-navy-deep">
      {brand.name}
    </span>
  );

  // Each cell uses inline `flex-basis` so admin-set column counts apply
  // at each breakpoint without generating Tailwind classes at runtime.
  // Visual tile pattern matches the old PmBrandWall: no card chrome, the
  // logo just sits in a generous-padding box and lifts on hover.
  const cellStyle: React.CSSProperties & Record<string, string> = {
    flexBasis: basisSm,
    ['--pm-basis-md' as string]: basisMd,
    ['--pm-basis-lg' as string]: basisLg,
  };

  const baseClass =
    'pm-brand-cell group flex aspect-[2/1] shrink-0 snap-start items-center justify-center px-3 py-4 transition-transform duration-pm-base ease-pm-standard hover:scale-105';

  if (brand.href) {
    return (
      <Link href={brand.href} aria-label={brand.name} className={baseClass} style={cellStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <div aria-label={brand.name} className={baseClass} style={cellStyle}>
      {inner}
    </div>
  );
}

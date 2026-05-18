'use client';

/**
 * PmBrandWall
 * -----------
 * Horizontal carousel of authorized manufacturer logos. Shows 5 brands at a
 * time on desktop (3 on tablet, 2 on mobile).
 *
 * Navigation, in order of priority for users:
 *   1. Click-and-drag the rail itself (grab cursor, swipe to scroll)
 *   2. Drag the thumb on the slim scroll-track below the row
 *   3. Click anywhere on the bare track to jump
 *   4. Trackpad / touch swipe / mouse wheel still work — thumb stays in
 *      sync via a `scroll` listener on the row.
 *
 * Drag-to-scroll suppresses the click on child Links if the user moved
 * more than `DRAG_CLICK_THRESHOLD` pixels — so dragging never accidentally
 * navigates to a brand page.
 *
 * Logos are real brand marks (Clearbit logo API). Brands without a logo URL
 * fall back to a typeset wordmark.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import { PM_BRANDS, type PmBrand } from '~/lib/pm-brands';
import { PmSectionHeader } from '~/components/pm-section-header';

export interface PmBrandWallProps {
  eyebrow?: string;
  title?: string;
  brands?: PmBrand[];
}

// Pixel threshold: if the user moved less than this between pointerdown
// and pointerup, treat as a click (let it through). More than this and
// suppress the click so dragging doesn't accidentally navigate.
const DRAG_CLICK_THRESHOLD = 6;

export function PmBrandWall({
  eyebrow = 'Authorized partners',
  title = 'Stocked, supported, sourced direct.',
  brands = PM_BRANDS,
}: PmBrandWallProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number }>({
    left: 0,
    width: 100,
  });
  const thumbDraggingRef = useRef(false);

  // Drag-to-scroll state on the rail itself
  const railDragRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    movedDistance: number;
    pointerId: number;
  } | null>(null);
  const [railDragging, setRailDragging] = useState(false);

  // Sync the thumb to the row's scroll position
  const syncThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const total = el.scrollWidth;
    const view = el.clientWidth;
    if (total <= view) {
      setThumb({ left: 0, width: 100 });
      return;
    }
    const widthPct = (view / total) * 100;
    const leftPct = (el.scrollLeft / total) * 100;
    setThumb({ left: leftPct, width: widthPct });
  }, []);

  useEffect(() => {
    syncThumb();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncThumb, { passive: true });
    window.addEventListener('resize', syncThumb);
    return () => {
      el.removeEventListener('scroll', syncThumb);
      window.removeEventListener('resize', syncThumb);
    };
  }, [syncThumb]);

  // Drag → scroll mapping. Translates pointer x within the track to a
  // scrollLeft on the row.
  const scrollToPointer = (clientX: number) => {
    const row = scrollRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const max = row.scrollWidth - row.clientWidth;
    row.scrollLeft = ratio * max;
  };

  const handleThumbPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation(); // don't let the rail drag handler also start
    e.currentTarget.setPointerCapture(e.pointerId);
    thumbDraggingRef.current = true;
  };

  const handleThumbPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!thumbDraggingRef.current) return;
    scrollToPointer(e.clientX);
  };

  const handleThumbPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    thumbDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Click on the bare track (not the thumb) jumps the thumb to that point
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === trackRef.current) {
      scrollToPointer(e.clientX);
    }
  };

  // ---------- Drag-to-scroll on the rail ----------
  const handleRailPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only initiate drag for primary mouse button or touch/pen; let the
    // browser handle right-clicks normally.
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
    if (!state || !state.active) return;
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
      // releasePointerCapture can throw if the pointer was already lost
    }

    // If the user dragged far enough to be "scrolling", suppress the next
    // click so we don't accidentally navigate into a brand page.
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

  // If the carousel fits without scrolling, hide the bar entirely
  const showScrollbar = thumb.width < 100;

  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="mx-auto max-w-pm-container px-4 sm:px-6 md:px-8">
        <PmSectionHeader
          eyebrow={eyebrow}
          title={title}
          linkLabel="All manufacturers"
          linkHref="/dev/preview/category/components"
        />

        {/* Scrolling rail — drag-to-scroll, scrollbar hidden, custom one below */}
        <div
          ref={scrollRef}
          onPointerDown={handleRailPointerDown}
          onPointerMove={handleRailPointerMove}
          onPointerUp={handleRailPointerUp}
          onPointerCancel={handleRailPointerUp}
          className={`flex select-none gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            railDragging
              ? 'cursor-grabbing scroll-auto'
              : 'cursor-grab snap-x snap-mandatory scroll-smooth'
          }`}
        >
          {brands.map((brand) => (
            <BrandCell key={brand.name} brand={brand} />
          ))}
        </div>

        {/* Custom scrollbar — slim track + draggable thumb */}
        {showScrollbar && (
          <div className="mt-6">
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              className="relative h-1.5 w-full cursor-pointer rounded-full bg-pm-ink-200"
              role="presentation"
            >
              <button
                type="button"
                aria-label="Drag to scroll brands"
                onPointerDown={handleThumbPointerDown}
                onPointerMove={handleThumbPointerMove}
                onPointerUp={handleThumbPointerUp}
                onPointerCancel={handleThumbPointerUp}
                style={{
                  left: `${thumb.left}%`,
                  width: `${thumb.width}%`,
                }}
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pm-navy-deep transition-colors hover:bg-pm-terracotta touch-none"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BrandCell({ brand }: { brand: PmBrand }) {
  // No card chrome — logos float in the row with generous breathing room.
  // The aspect-ratio still drives the row height so cells stay consistent.
  // Hover gets a subtle scale-up; no shadow / border / bg.
  const baseClasses =
    'group flex aspect-[2/1] shrink-0 basis-[calc(50%-8px)] snap-start items-center justify-center px-3 py-4 transition-transform duration-pm-base ease-pm-standard hover:scale-105 md:basis-[calc(33.333%-11px)] lg:basis-[calc(20%-13px)]';

  const inner = brand.logoSrc ? (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN, no remote-domain config yet
    <img
      src={brand.logoSrc}
      alt={brand.name}
      loading="lazy"
      draggable={false}
      className="h-16 w-auto max-w-full object-contain opacity-90 transition-opacity duration-pm-base group-hover:opacity-100"
      onError={(e) => {
        // If the logo 404s, replace the broken image with a typeset name
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

  return brand.href ? (
    <Link href={brand.href} aria-label={brand.name} className={baseClasses}>
      {inner}
    </Link>
  ) : (
    <div aria-label={brand.name} className={baseClasses}>
      {inner}
    </div>
  );
}

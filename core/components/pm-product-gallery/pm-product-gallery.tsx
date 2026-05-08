'use client';

/**
 * PmProductGallery
 * ----------------
 * Two-piece gallery, modeled on the platinummicro.com OG PDP:
 *   - Vertical thumbnail column on the LEFT (62×62 each, stacked).
 *   - Square main image on the right with Amazon-style hover zoom.
 *   - Click a thumb to swap the main image.
 *
 * Sizing: main image caps at ~405px (25% smaller than the previous 540px
 * cap, per design feedback). With the thumb column + gap, total gallery
 * width caps at ~480px when thumbs are visible, ~405px otherwise.
 *
 * Hover zoom: while the cursor is over the main image, the <img> scales 2×
 * with `transform-origin` tracked to the cursor's percentage position. The
 * surrounding box is `overflow-hidden`, so the unzoomed area is clipped —
 * giving the cursor-following magnify effect Amazon uses. No portal, no
 * lens, no extra DOM — just CSS transforms on the existing <img>.
 *
 * Marked client because of useState (active image + zoom state). If we
 * later add a lightbox / pinch-zoom we'd keep this same surface and add
 * those as additional sub-components.
 *
 * Empty state: if no images are passed, we render a paper placeholder block
 * with the SKU stamped on it (matches PmProductCard's empty-state pattern).
 */

import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { PmProductImage } from '~/lib/pm-product-by-slug';

export interface PmProductGalleryProps {
  /** Ordered list of gallery images. First is shown on mount. */
  images: PmProductImage[];
  /** Product name — used for fallback alt text */
  productName: string;
  /** SKU — shown on the placeholder when there are no images */
  sku: string;
}

const ZOOM_SCALE = 2;

export function PmProductGallery({
  images,
  productName,
  sku,
}: PmProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full max-w-[405px] items-center justify-center rounded-md border border-pm-ink-200 bg-pm-ink-100">
        <span className="rounded-sm border border-dashed border-pm-ink-300 bg-white px-3 py-2 text-[12px] text-pm-ink-400">
          {sku}
        </span>
      </div>
    );
  }

  // Safe: we just guarded `images.length === 0` above, so `images[0]` exists.
  const active = images[activeIndex] ?? images[0]!;

  const hasThumbs = images.length > 1;

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Clamp 0..100 so origin doesn't drift past the image edge if the cursor
    // briefly crosses over a sub-pixel border.
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div
      className={`flex w-full gap-3 ${hasThumbs ? 'max-w-[480px]' : 'max-w-[405px]'}`}
    >
      {/* Vertical thumbnail column — only when 2+ images */}
      {hasThumbs && (
        <div className="flex shrink-0 flex-col gap-2">
          {images.slice(0, 6).map((image, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={`${image.url}-${i}`}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => setActiveIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={isActive}
                className={`flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white transition-colors duration-[120ms] ease-pm-standard ${
                  isActive
                    ? 'border-pm-terracotta'
                    : 'border-pm-ink-200 hover:border-pm-ink-400'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet */}
                <img
                  src={image.url}
                  alt=""
                  className="max-h-full max-w-full object-contain p-1.5"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main image with cursor-tracked zoom on hover */}
      <div
        ref={frameRef}
        onMouseEnter={() => setZoomActive(true)}
        onMouseLeave={() => setZoomActive(false)}
        onMouseMove={handleMouseMove}
        className="relative flex aspect-square w-full flex-1 items-center justify-center overflow-hidden rounded-md border border-pm-ink-200 bg-white"
        style={{ cursor: zoomActive ? 'zoom-out' : 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet */}
        <img
          src={active.url}
          alt={active.altText || productName}
          className="h-full w-full object-contain p-5 transition-transform duration-150 ease-out"
          style={{
            transform: zoomActive ? `scale(${ZOOM_SCALE})` : 'scale(1)',
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
      </div>
    </div>
  );
}

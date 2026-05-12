/**
 * PmHeroBanner
 * ------------
 * Admin-managed hero banner. Reads config produced by `parsePmHeroBanner`
 * (see `lib/pm-hero-banner.ts`) and renders one of three layouts depending
 * on `imageFit`:
 *
 *   - "side"     (default) split layout, text on one side and image on the
 *                other. Best for product/category heroes with a clean
 *                product render (e.g. server, switch, brand logo art).
 *   - "cover"    image fills the full background, gradient overlay protects
 *                text legibility. Best for editorial/lifestyle photos.
 *   - "contain"  image centered with bg color filling around it. Best for
 *                logos or transparent-background art.
 *
 * Server component — no client state. Renders as a top-level <section>, so
 * it's safe to drop above any page layout without wrapper concerns.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PmHeroBannerConfig } from '~/lib/pm-hero-banner';

export interface PmHeroBannerProps {
  banner: PmHeroBannerConfig;
}

// Defaults chosen to look reasonable when ALL optional keys are unset
// (so a banner with just `image: ...` and `headline: ...` still ships
// looking deliberate).
const DEFAULT_HEIGHT = '320px';
const DEFAULT_PADDING_Y = '48px';
const DEFAULT_BG = '#0d9488';

export function PmHeroBanner({ banner }: PmHeroBannerProps) {
  const {
    imageUrl,
    extraImageUrls,
    bgColor = DEFAULT_BG,
    bgGradient,
    bgImageUrl,
    bgImageSize = 'cover',
    bgImagePosition = 'center',
    bgImageRepeat = 'no-repeat',
    bgOverlay,
    textColor = 'light',
    accentColor,
    eyebrow,
    headline,
    body,
    logoUrl,
    ctaLabel,
    ctaHref,
    height = DEFAULT_HEIGHT,
    paddingY = DEFAULT_PADDING_Y,
    marginTop,
    marginBottom,
    align = 'left',
    imageFit = 'side',
    imagePosition = 'left',
    imageHalfBg,
    imageHalfSize = 'cover',
    imageHalfPosition = 'center',
    contentHalfBg,
    contentPadding = '48px 56px',
    fullBleed = false,
    borderRadius,
  } = banner;

  // Container-width helpers. When fullBleed is true the inner container
  // drops max-width + horizontal padding so the banner hugs both screen
  // edges. When false, the banner sits inside the 1280px frame with
  // 32px gutters (matches the rest of the site).
  const innerContainerClass = fullBleed
    ? 'mx-auto flex flex-col sm:flex-row'
    : 'mx-auto flex max-w-pm-container flex-col px-8 sm:flex-row';
  // Border radius — applied to the outer <section> with overflow:hidden
  // so bg layers and split halves stay clipped to the curve. The split
  // mode also benefits because the image side's bg-image gets rounded.
  const radiusStyle = borderRadius
    ? { borderRadius, overflow: 'hidden' as const }
    : {};

  // Full image rail = primary + any extras (filter out falsy in case
  // primary is unset — gradient-only / text-only banners are valid).
  const allImages = [imageUrl, ...(extraImageUrls ?? [])].filter(
    (u): u is string => Boolean(u),
  );
  const imageCount = allImages.length;
  const hasImages = imageCount > 0;

  const isLight = textColor === 'light';
  const headingClass = isLight ? 'text-white' : 'text-pm-ink-900';
  const bodyClass = isLight ? 'text-white/85' : 'text-pm-ink-700';
  const hasCta = Boolean(ctaLabel && ctaHref);
  const ctaStyle = accentColor ? { backgroundColor: accentColor } : undefined;

  // Background layers — rendered as absolutely-positioned divs inside the
  // root so they stack predictably regardless of CSS shorthand quirks.
  // Order matters: bgColor (bottom) → bgGradient → bgImage → bgOverlay → content (top).
  const hasGradient = Boolean(bgGradient);
  const hasBgImage = Boolean(bgImageUrl);
  const hasOverlay = Boolean(bgOverlay);
  const rootStyle = {
    backgroundColor: bgColor,
    marginTop,
    marginBottom,
  };
  // Helper subtree that paints the background layers (gradient / image /
  // overlay). Wrapped here so both `side` and `cover/contain` modes can
  // reuse the same logic.
  const bgLayers = (
    <>
      {hasGradient && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: bgGradient }}
        />
      )}
      {hasBgImage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${bgImageUrl}")`,
            backgroundSize: bgImageSize,
            backgroundPosition: bgImagePosition,
            backgroundRepeat: bgImageRepeat,
          }}
        />
      )}
      {hasOverlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: bgOverlay }}
        />
      )}
    </>
  );

  // ── SPLIT MODE ────────────────────────────────────────────────────
  // Hard 50/50 split — one half is the image (edge-to-edge, no inner
  // padding), the other half is the content with its own bg color. The
  // image side stacks above the content side on mobile so the design
  // stays usable below the sm breakpoint.
  if (imageFit === 'split') {
    const isImageLeft = imagePosition !== 'right';
    const imageSideStyle = {
      backgroundColor: imageHalfBg ?? bgColor,
      // Use bg-image when imageUrl is set so it fills cleanly (and
      // honors object-fit-like sizing). Falls back to a centered <img>
      // tag inside if no image is set (unlikely in split mode but safe).
      //
      // Admin can override `imageHalfSize` (default 'cover') to zoom IN
      // on the source photo when it has built-in whitespace at the
      // edges — e.g. set to '150%' to crop out the source's white
      // margins. `imageHalfPosition` shifts the focal point to keep
      // the product centered after zooming.
      backgroundImage: imageUrl ? `url("${imageUrl}")` : undefined,
      backgroundSize: imageHalfSize,
      backgroundPosition: imageHalfPosition,
      backgroundRepeat: 'no-repeat',
    };
    const contentSideStyle = {
      backgroundColor: contentHalfBg ?? bgColor,
      padding: contentPadding,
    };
    const imageHalf = (
      <div
        className="flex min-h-[280px] flex-1 items-center justify-center"
        style={imageSideStyle}
        aria-label={headline ?? undefined}
      />
    );
    const contentHalf = (
      <div
        className={`flex flex-1 flex-col justify-center ${align === 'center' ? 'items-center text-center' : 'items-start text-left'}`}
        style={contentSideStyle}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- BC CDN images
          <img
            src={logoUrl}
            alt=""
            className="mb-4 h-12 w-auto object-contain"
            loading="lazy"
          />
        )}
        {headline && (
          <h1
            className={`text-[26px] font-bold leading-[1.2] tracking-tight sm:text-[34px] ${headingClass}`}
          >
            {headline}
          </h1>
        )}
        {body && (
          <p
            className={`mt-3 max-w-[520px] text-[14px] leading-[1.55] sm:text-[15px] ${bodyClass}`}
          >
            {body}
          </p>
        )}
        {hasCta && (
          <Link
            href={ctaHref!}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-white shadow-sm transition-colors hover:bg-pm-terracotta-light"
            style={ctaStyle}
          >
            {ctaLabel}
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        )}
      </div>
    );
    // The "card" — bg, optional rounded corners, and the actual content.
    // In contained mode this floats on the page background with left/
    // right margins from the gutter wrapper below. In full-bleed mode it
    // IS the full-width section.
    const card = (
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderRadius,
          minHeight: height,
        }}
      >
        {bgLayers}
        <div
          className="relative flex w-full flex-col sm:flex-row"
          style={{
            minHeight: height,
            paddingTop: paddingY,
            paddingBottom: paddingY,
          }}
        >
          {isImageLeft ? (
            <>
              {imageHalf}
              {contentHalf}
            </>
          ) : (
            <>
              {contentHalf}
              {imageHalf}
            </>
          )}
        </div>
      </div>
    );

    // Outer <section> is now TRANSPARENT in contained mode — only the
    // card has color. This is the fix for "no cyan bleed": the page
    // background shows on both sides of the card, giving it the proper
    // card-floating-in-the-page look the user expects.
    return (
      <section style={{ marginTop, marginBottom }}>
        {fullBleed ? (
          card
        ) : (
          <div className="mx-auto max-w-pm-container px-8">{card}</div>
        )}
      </section>
    );
  }

  if (imageFit === 'side') {
    return (
      <section
        className="relative overflow-hidden"
        style={{ ...rootStyle, ...radiusStyle }}
      >
        {bgLayers}
        <div
          className={`relative ${fullBleed ? 'mx-auto flex flex-col items-center gap-8 sm:flex-row' : 'mx-auto flex max-w-pm-container flex-col items-center gap-8 px-8 sm:flex-row'} ${align === 'center' ? 'sm:items-center' : ''}`}
          style={{
            minHeight: height,
            paddingTop: paddingY,
            paddingBottom: paddingY,
          }}
        >
          {/* Text column */}
          <div
            className={`flex-1 ${align === 'center' ? 'text-center' : 'text-left'}`}
          >
            {headline && (
              <h1
                className={`text-[28px] font-bold leading-[1.15] tracking-tight sm:text-[36px] ${headingClass}`}
              >
                {headline}
              </h1>
            )}
            {body && (
              <p
                className={`mt-3 max-w-[560px] text-[15px] leading-[1.55] sm:text-[16px] ${bodyClass} ${align === 'center' ? 'mx-auto' : ''}`}
              >
                {body}
              </p>
            )}
            {hasCta && (
              <Link
                href={ctaHref!}
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-pm-terracotta-light"
                style={ctaStyle}
              >
                {ctaLabel}
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            )}
          </div>

          {/* Image rail — supports up to 5 images side-by-side. Each one
              shrinks to fit (max-h scales down so a row of 5 doesn't
              overflow the banner) and they share the same vertical
              center. The optional brand logo sits left of the rail.
              When the admin hasn't set ANY image (gradient-only or
              text-only banner), the rail collapses out and the text
              column gets the whole width. */}
          {(hasImages || logoUrl) && (
            <div className="flex flex-1 items-center justify-end gap-5">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet
                <img
                  src={logoUrl}
                  alt=""
                  className="h-16 w-auto shrink-0 object-contain"
                  loading="lazy"
                />
              )}
              {hasImages && (
                <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
                  {allImages.map((url, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet
                    <img
                      key={`${url}-${idx}`}
                      src={url}
                      alt={idx === 0 ? (headline ?? '') : ''}
                      loading="lazy"
                      // Cap the rail's max height so multiple images stay
                      // proportional. Single image gets more room; 2+ shrink.
                      className={`w-auto shrink object-contain ${
                        imageCount === 1
                          ? 'max-h-[280px]'
                          : imageCount === 2
                            ? 'max-h-[240px]'
                            : imageCount === 3
                              ? 'max-h-[200px]'
                              : 'max-h-[180px]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // cover / contain — the primary `imageUrl` paints as the background.
  // The explicit bg controls (bgImageUrl, bgGradient, bgOverlay) still
  // apply ON TOP for admins who want a layered look (e.g. cover photo +
  // tinted overlay for legibility).
  const isCover = imageFit === 'cover';

  return (
    <section
      className="relative overflow-hidden"
      style={{ ...rootStyle, ...radiusStyle }}
    >
      {/* Primary image as the implicit background for cover/contain modes.
          Skipped when no image is set — the explicit bg layers below take
          over (gradient-only / color-only banners stay valid). */}
      {imageUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: isCover ? 'cover' : 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Optional admin-set bg layers (gradient / bg_image / overlay) paint
          over the primary image. */}
      {bgLayers}

      {/* Default left-weighted legibility gradient in cover mode — only
          applied if the admin hasn't already set a custom overlay (so
          their explicit choice wins). */}
      {isCover && !hasOverlay && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            isLight
              ? 'bg-gradient-to-r from-black/55 via-black/25 to-transparent'
              : 'bg-gradient-to-r from-white/65 via-white/30 to-transparent'
          }`}
        />
      )}

      <div
        className={`relative ${fullBleed ? 'mx-auto flex flex-col justify-center' : 'mx-auto flex max-w-pm-container flex-col justify-center px-8'} ${align === 'center' ? 'items-center text-center' : 'items-start text-left'}`}
        style={{
          minHeight: height,
          paddingTop: paddingY,
          paddingBottom: paddingY,
        }}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- BC CDN images
          <img
            src={logoUrl}
            alt=""
            className="mb-5 h-14 w-auto object-contain"
            loading="lazy"
          />
        )}
        {eyebrow && (
          // Small uppercase brand label sitting above the headline. Color
          // pulls from `accentColor` so the brand terracotta is the
          // natural default — matches the design system's "small tan/
          // terracotta eyebrow over big headline" pattern used elsewhere
          // (PmAudienceStrip, PmAboutBanner, PmSectionHeader).
          <div
            className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: accentColor ?? 'var(--pm-terracotta-light, #ed8166)' }}
          >
            {eyebrow}
          </div>
        )}
        {headline && (
          <h1
            className={`max-w-[680px] text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[44px] ${headingClass}`}
          >
            {headline}
          </h1>
        )}
        {body && (
          <p
            className={`mt-4 max-w-[640px] text-[16px] leading-[1.65] sm:text-[18px] ${bodyClass}`}
          >
            {body}
          </p>
        )}
        {hasCta && (
          <Link
            href={ctaHref!}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-6 py-3 text-[14px] font-semibold text-white shadow-md transition-colors hover:bg-pm-terracotta-light"
            style={ctaStyle}
          >
            {ctaLabel}
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * PmCardSection
 * =============
 * Admin-configured card grid. Same fenced-comment pattern as
 * <PmHeroBanner> but for grids of small cards (e.g. "Industries we
 * serve", "Browse by category", brand tiles, etc.).
 *
 * Configured via `<!--pm-cards ... -->` in any banner-bearing BC
 * category description. See `lib/pm-card-section.ts` for the full
 * schema reference.
 *
 * Server component — pure rendering, no client state.
 */

import Link from 'next/link';
import { Image } from '~/components/image';
import {
  ArrowUpRight,
  Building2,
  Boxes,
  Briefcase,
  Cpu,
  Globe2,
  GraduationCap,
  HardDrive,
  HeartPulse,
  Landmark,
  Microscope,
  Monitor,
  Network,
  Package,
  Rocket,
  Server,
  ServerCog,
  ShieldCheck,
  ShoppingCart,
  Star,
  Stethoscope,
  Truck,
  Wifi,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  PmCardConfig,
  PmCardSectionConfig,
} from '~/lib/pm-card-section';

/**
 * Curated Lucide icons admins can reference by name in `card_N_icon:`.
 * Add new entries here when the admin needs a glyph not yet listed —
 * the value is the literal Lucide import. Names are case-insensitive at
 * lookup time so admins can type "landmark" or "Landmark".
 */
const ICON_LIBRARY: Record<string, LucideIcon> = {
  Building2,
  Boxes,
  Briefcase,
  Cpu,
  Globe2,
  GraduationCap,
  HardDrive,
  HeartPulse,
  Landmark,
  Microscope,
  Monitor,
  Network,
  Package,
  Rocket,
  Server,
  ServerCog,
  ShieldCheck,
  ShoppingCart,
  Star,
  Stethoscope,
  Truck,
  Wifi,
  Zap,
};

function resolveIcon(name?: string): LucideIcon | undefined {
  if (!name) return undefined;
  // Case-insensitive lookup so admins can be casual about casing.
  const lowered = name.toLowerCase();
  for (const key of Object.keys(ICON_LIBRARY)) {
    if (key.toLowerCase() === lowered) return ICON_LIBRARY[key];
  }
  return undefined;
}

export interface PmCardSectionProps {
  section: PmCardSectionConfig;
}

// Visual defaults — used when the admin hasn't overridden them.
const DEFAULTS = {
  columns: 6,
  columnsMd: 3,
  columnsSm: 2,
  gap: '12px',
  paddingY: '80px',
  cardBg: 'white',
  cardBorder: '1px solid #e5e5e5',
  cardRadius: '8px',
  cardPadding: '20px',
  cardHoverAccent: 'var(--pm-terracotta)',
  iconSize: 18,
  iconBg: '#eef1f7',
  iconColor: '#2e6db4',
  // 48px matches the tight "icon tile" look. Admins opt into the
  // CDW-clean "photo card" look by setting image_size: 96 or higher.
  imageSize: 48,
  showHoverArrow: true,
};

export function PmCardSection({ section }: PmCardSectionProps) {
  const {
    eyebrow,
    title,
    subtitle,
    bgColor,
    textColor = 'dark',
    columns = DEFAULTS.columns,
    columnsMd = DEFAULTS.columnsMd,
    columnsSm = DEFAULTS.columnsSm,
    gap = DEFAULTS.gap,
    paddingY = DEFAULTS.paddingY,
    align = 'left',
    cardBg = DEFAULTS.cardBg,
    cardText,
    cardBorder = DEFAULTS.cardBorder,
    cardRadius = DEFAULTS.cardRadius,
    cardPadding = DEFAULTS.cardPadding,
    cardHoverAccent = DEFAULTS.cardHoverAccent,
    iconSize = DEFAULTS.iconSize,
    iconBg = DEFAULTS.iconBg,
    iconColor = DEFAULTS.iconColor,
    imageSize = DEFAULTS.imageSize,
    showHoverArrow = DEFAULTS.showHoverArrow,
    cardStyle = 'icon-tile',
    cardAspect = '2 / 1',
    ribbonBg = '#8a2929',
    ribbonText = '#ffffff',
    cards,
  } = section;

  if (cards.length === 0) return null;

  const isLight = textColor === 'light';
  const headingClass = isLight ? 'text-white' : 'text-pm-ink-900';
  const eyebrowClass = isLight ? 'text-white/70' : 'text-pm-tan';
  const subtitleClass = isLight ? 'text-white/80' : 'text-pm-ink-500';

  // Grid columns — we set CSS variables and let the inline-styled grid
  // pick them up at each breakpoint. This avoids dynamically generating
  // Tailwind classes (which the JIT can't see at build time).
  const gridStyle: React.CSSProperties & Record<string, string> = {
    display: 'grid',
    gap,
    '--pm-cols': String(columns),
    '--pm-cols-md': String(columnsMd),
    '--pm-cols-sm': String(columnsSm),
    gridTemplateColumns: `repeat(${columnsSm}, minmax(0, 1fr))`,
  };

  return (
    <section
      style={{ backgroundColor: bgColor, paddingTop: paddingY, paddingBottom: paddingY }}
    >
      <div className="mx-auto max-w-pm-container px-8">
        {(eyebrow || title || subtitle) && (
          <div className={`mb-9 ${align === 'center' ? 'text-center' : 'text-left'}`}>
            {eyebrow && (
              <div
                className={`mb-2 text-[11px] font-bold uppercase tracking-[0.14em] ${eyebrowClass}`}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h2
                className={`text-[28px] font-bold leading-[1.2] tracking-[-0.018em] md:text-[32px] ${headingClass}`}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={`mt-3 max-w-[640px] text-[15px] leading-[1.55] ${subtitleClass} ${align === 'center' ? 'mx-auto' : ''}`}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Responsive grid — sm columns set in inline style above; md/lg
            climb up via a tiny inline <style> block that reads our CSS
            variables. Keeps the breakpoints admin-controllable without
            generating Tailwind classes at runtime. */}
        <style
          // eslint-disable-next-line react/no-danger -- static, no user input
          dangerouslySetInnerHTML={{
            __html: `
              @media (min-width: 768px) {
                .pm-card-grid { grid-template-columns: repeat(var(--pm-cols-md), minmax(0, 1fr)) !important; }
              }
              @media (min-width: 1024px) {
                .pm-card-grid { grid-template-columns: repeat(var(--pm-cols), minmax(0, 1fr)) !important; }
              }
              .pm-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
              .pm-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(7,21,37,0.08); }
              .pm-card-icon { transition: background-color 180ms ease, color 180ms ease; }
              .pm-card:hover .pm-card-icon { background-color: var(--pm-card-hover-accent); color: white; }
              .pm-card:hover .pm-card-title { color: var(--pm-navy-deep); }
              .pm-card-arrow { opacity: 0; transform: translateY(4px); transition: opacity 180ms ease, transform 180ms ease; }
              .pm-card:hover .pm-card-arrow { opacity: 1; transform: translateY(0); }
            `,
          }}
        />

        <ul
          className="pm-card-grid"
          style={gridStyle}
        >
          {cards.map((card, idx) =>
            cardStyle === 'poster' ? (
              <li key={`${card.title}-${idx}`}>
                <PmPosterCard
                  card={card}
                  cardAspect={cardAspect}
                  cardBorder={cardBorder}
                  cardRadius={cardRadius}
                  ribbonBg={ribbonBg}
                  ribbonText={ribbonText}
                />
              </li>
            ) : (
              <li key={`${card.title}-${idx}`}>
                <PmCard
                  card={card}
                  align={align}
                  iconSize={iconSize}
                  iconBg={iconBg}
                  iconColor={iconColor}
                  imageSize={imageSize}
                  cardBg={cardBg}
                  cardText={cardText}
                  cardBorder={cardBorder}
                  cardRadius={cardRadius}
                  cardPadding={cardPadding}
                  cardHoverAccent={cardHoverAccent}
                  showHoverArrow={showHoverArrow}
                />
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

/**
 * Single card inside the grid. If `href` is set, the whole card is a
 * clickable <Link>; otherwise it's a plain <article>.
 */
function PmCard({
  card,
  align,
  iconSize,
  iconBg,
  iconColor,
  imageSize,
  cardBg,
  cardText,
  cardBorder,
  cardRadius,
  cardPadding,
  cardHoverAccent,
  showHoverArrow,
}: {
  card: PmCardConfig;
  align: 'left' | 'center';
  iconSize: number;
  iconBg: string;
  iconColor: string;
  imageSize: number;
  cardBg: string;
  cardText?: string;
  cardBorder: string;
  cardRadius: string;
  cardPadding: string;
  cardHoverAccent: string;
  showHoverArrow: boolean;
}) {
  const Icon = resolveIcon(card.iconName);
  const cardStyle: React.CSSProperties & Record<string, string> = {
    backgroundColor: card.bgColor ?? cardBg,
    color: card.textColor ?? cardText ?? 'inherit',
    border: card.border ?? cardBorder,
    borderRadius: cardRadius,
    padding: cardPadding,
    boxShadow: '0 1px 2px rgba(7,21,37,0.04)',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflow: 'hidden',
    '--pm-card-hover-accent': cardHoverAccent,
  };
  const isCentered = align === 'center';
  // Render priority for the card visual: emoji > image > icon > nothing.
  // Lets an admin swap between visuals without changing card structure.
  const visualSizeStyle: React.CSSProperties = {
    width: `${imageSize}px`,
    height: `${imageSize}px`,
  };
  const inner = (
    <article
      className="pm-card"
      style={cardStyle}
      title={card.subtitle ?? card.title}
    >
      {card.emoji ? (
        <div
          aria-hidden
          className={`flex items-center justify-center ${isCentered ? 'mx-auto' : ''}`}
          style={{
            ...visualSizeStyle,
            // Scale the glyph to roughly fill the box — `0.8em` keeps a
            // hair of padding so emoji descenders aren't clipped.
            fontSize: `${Math.round(imageSize * 0.8)}px`,
            lineHeight: 1,
          }}
        >
          {card.emoji}
        </div>
      ) : card.imageUrl ? (
        <Image
          src={card.imageUrl}
          alt=""
          width={imageSize * 2}
          height={imageSize * 2}
          sizes={`${imageSize}px`}
          className={`object-contain ${isCentered ? 'mx-auto' : ''}`}
          style={visualSizeStyle}
        />
      ) : Icon ? (
        <div
          className={`pm-card-icon flex items-center justify-center rounded-md ${isCentered ? 'mx-auto' : ''}`}
          style={{
            ...visualSizeStyle,
            backgroundColor: iconBg,
            color: iconColor,
          }}
        >
          <Icon size={Math.max(iconSize, Math.round(imageSize * 0.5))} strokeWidth={1.75} />
        </div>
      ) : null}

      <h3
        className={`pm-card-title text-[15px] font-bold leading-[1.25] ${isCentered ? 'text-center' : 'text-left'}`}
        style={{ color: card.textColor ?? cardText ?? 'var(--pm-ink-900)' }}
      >
        {card.title}
      </h3>

      {card.subtitle && (
        <p
          className={`text-[13px] leading-[1.5] ${isCentered ? 'text-center' : 'text-left'}`}
          style={{ color: card.textColor ?? cardText ?? 'var(--pm-ink-500)' }}
        >
          {card.subtitle}
        </p>
      )}

      {showHoverArrow && card.href && (
        <ArrowUpRight
          size={14}
          strokeWidth={2}
          aria-hidden
          className="pm-card-arrow absolute bottom-4 right-4"
          style={{ color: cardHoverAccent }}
        />
      )}
    </article>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

/**
 * Poster-style card — image fills the whole card as a background and
 * the title renders as a ribbon in the top-left corner. Used for the
 * "Industries we serve" strip. Falls back to a solid bg (using
 * iconBg) when the admin didn't supply an image so the card never
 * renders fully empty.
 */
function PmPosterCard({
  card,
  cardAspect,
  cardBorder,
  cardRadius,
  ribbonBg,
  ribbonText,
}: {
  card: PmCardConfig;
  cardAspect: string;
  cardBorder: string;
  cardRadius: string;
  ribbonBg: string;
  ribbonText: string;
}) {
  const cardStyle: React.CSSProperties = {
    aspectRatio: cardAspect,
    border: card.border ?? cardBorder,
    borderRadius: cardRadius,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: card.bgColor ?? '#1a1a1a',
    backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // Subtle resting shadow so borderless poster cards still have
    // presence — hover state (handled by the parent .pm-card rule)
    // amplifies it to the full lift.
    boxShadow: '0 4px 12px rgba(7,21,37,0.08), 0 1px 2px rgba(7,21,37,0.04)',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    cursor: card.href ? 'pointer' : 'default',
  };
  const inner = (
    <article
      className="pm-card pm-poster-card"
      style={cardStyle}
      title={card.subtitle ?? card.title}
    >
      {/* Top-left ribbon — short label, uppercase, brand maroon by
          default. Slight bottom-right "fold" via a subtle drop shadow
          so it reads as a banner rather than a flat sticker. */}
      <div
        className="absolute left-0 top-0 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] leading-tight"
        style={{
          backgroundColor: ribbonBg,
          color: ribbonText,
          maxWidth: '70%',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {card.title}
      </div>

      {/* Optional subtitle — sits bottom-left as a faint caption.
          Only renders when the admin supplied card_N_subtitle. */}
      {card.subtitle && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-[13px] font-medium text-white"
        >
          {card.subtitle}
        </div>
      )}
    </article>
  );
  if (card.href) {
    return (
      <Link href={card.href} className="block h-full no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

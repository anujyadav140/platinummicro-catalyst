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
    showHoverArrow = DEFAULTS.showHoverArrow,
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
          {cards.map((card, idx) => (
            <li key={`${card.title}-${idx}`}>
              <PmCard
                card={card}
                align={align}
                iconSize={iconSize}
                iconBg={iconBg}
                iconColor={iconColor}
                cardBg={cardBg}
                cardText={cardText}
                cardBorder={cardBorder}
                cardRadius={cardRadius}
                cardPadding={cardPadding}
                cardHoverAccent={cardHoverAccent}
                showHoverArrow={showHoverArrow}
              />
            </li>
          ))}
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
  const inner = (
    <article
      className="pm-card"
      style={cardStyle}
      title={card.subtitle ?? card.title}
    >
      {/* Visual: image takes precedence; otherwise icon tile; otherwise nothing. */}
      {card.imageUrl ? (
        <Image
          src={card.imageUrl}
          alt=""
          width={96}
          height={96}
          sizes="48px"
          className={`h-12 w-12 object-contain ${isCentered ? 'mx-auto' : ''}`}
        />
      ) : Icon ? (
        <div
          className={`pm-card-icon flex h-10 w-10 items-center justify-center rounded-md ${isCentered ? 'mx-auto' : ''}`}
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon size={iconSize} strokeWidth={1.75} />
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

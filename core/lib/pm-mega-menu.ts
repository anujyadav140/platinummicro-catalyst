/**
 * pm-mega-menu
 * ------------
 * Static mega-menu data for the header nav.
 *
 * Keyed by `PmCategory.key` from pm-categories.ts. A category without an
 * entry here renders as a plain link with no chevron and no hover panel.
 *
 * EVERY href in this file routes inside `/dev/preview/*` so clicks always
 * land on a working page in the design preview. Specifically:
 *   - Sub-category links → parent PLP (we don't have form-factor / capacity
 *     filters yet, so they all land at the parent category page)
 *   - "By manufacturer" links → parent PLP with `?brand={Brand}` filter
 *     applied. Brand strings match how BC returns them (case-sensitive).
 *   - "Programs" / "Contracts" / promo CTAs → `#` placeholder until we build
 *     dedicated routes (or kept as the live external HPE Copilot URL).
 *
 * When BC's actual category subtree is wired (form factor, capacity, etc.),
 * swap the link hrefs to use the proper sub-category PLP — no consumer
 * change needed.
 */

export interface PmMegaColumn {
  /** Title Case heading shown in tan eyebrow style */
  title: string;
  /** Links shown beneath */
  items: { label: string; href: string }[];
}

export interface PmMegaPromo {
  /** Small all-caps badge — e.g. "New" */
  eyebrow: string;
  /** Headline of the promo card */
  title: string;
  /** Supporting body copy */
  body: string;
  /** CTA button label */
  ctaLabel: string;
  /** CTA link target */
  ctaHref: string;
}

export interface PmMegaMenu {
  /** 4 columns of curated links */
  cols: PmMegaColumn[];
  /** Right-rail promo card (HPE Copilot, vendor of the month, etc.) */
  promo?: PmMegaPromo;
}

// Helper — keeps the data below readable
const cat = (slug: string, query?: string) =>
  `/dev/preview/category/${slug}${query ? `?${query}` : ''}`;

/**
 * Map of category key → mega menu config. Categories not in this map render
 * as plain nav links (e.g., "Bulk pricing").
 */
export const PM_MEGA_MENU: Record<string, PmMegaMenu> = {
  servers: {
    cols: [
      {
        title: 'By form factor',
        items: [
          { label: '1U rack',       href: cat('servers') },
          { label: '2U rack',       href: cat('servers') },
          { label: '4U rack',       href: cat('servers') },
          { label: 'Tower',         href: cat('servers') },
          { label: 'Blade',         href: cat('servers') },
          { label: 'High density',  href: cat('servers') },
        ],
      },
      {
        title: 'By workload',
        items: [
          { label: 'HPC / AI',         href: cat('servers') },
          { label: 'Storage server',   href: cat('servers') },
          { label: 'GPU server',       href: cat('servers') },
          { label: 'General purpose',  href: cat('servers') },
          { label: 'Edge / micro DC',  href: cat('servers') },
        ],
      },
      {
        title: 'By manufacturer',
        items: [
          { label: 'HPE ProLiant', href: cat('servers', 'brand=HPE') },
          { label: 'Supermicro',   href: cat('servers', 'brand=Supermicro') },
          { label: 'ASRock Rack',  href: cat('servers', 'brand=ASRock+Rack') },
          { label: 'Gigabyte',     href: cat('servers', 'brand=Gigabyte') },
          { label: 'Dell EMC',     href: cat('servers', 'brand=Dell+EMC') },
        ],
      },
      {
        title: 'Programs',
        items: [
          { label: 'Server refresh',     href: '#' },
          { label: 'Lifecycle takeback', href: '#' },
          { label: 'On-site warranty',   href: '#' },
          { label: 'Spare-parts kit',    href: '#' },
        ],
      },
    ],
    promo: {
      eyebrow: 'New',
      title: 'HPE Copilot — find your next server in 60 seconds.',
      body: 'Answer five questions, get a configured quote with real lead times.',
      ctaLabel: 'Try it',
      ctaHref: 'https://platinum-micro-estimate.vercel.app',
    },
  },

  storage: {
    cols: [
      {
        title: 'Drives',
        items: [
          { label: 'Enterprise SSD',  href: cat('storage') },
          { label: 'NVMe',            href: cat('storage') },
          { label: 'SAS / SATA',      href: cat('storage') },
          { label: 'HDD',             href: cat('storage') },
          { label: 'Hot-swap caddies',href: cat('storage') },
        ],
      },
      {
        title: 'Arrays & NAS',
        items: [
          { label: 'HPE Alletra', href: cat('storage', 'brand=HPE') },
          { label: 'NetApp',      href: cat('storage', 'brand=NetApp') },
          { label: 'Synology',    href: cat('storage', 'brand=Synology') },
          { label: 'QNAP',        href: cat('storage', 'brand=QNAP') },
        ],
      },
      {
        title: 'By manufacturer',
        items: [
          { label: 'Seagate',         href: cat('storage', 'brand=Seagate') },
          { label: 'Samsung',         href: cat('storage', 'brand=Samsung') },
          { label: 'Western Digital', href: cat('storage', 'brand=Western+Digital') },
          { label: 'Solidigm',        href: cat('storage', 'brand=Solidigm') },
          { label: 'Kioxia',          href: cat('storage', 'brand=Kioxia') },
        ],
      },
      {
        title: 'Programs',
        items: [
          { label: 'Bulk SSD pricing', href: '#' },
          { label: 'Drive RMA',        href: '#' },
          { label: 'Secure erase',     href: '#' },
        ],
      },
    ],
    promo: {
      eyebrow: 'Bundle',
      title: 'Storage refresh: 12-bay arrays + drives + caddies, kitted and pre-tested.',
      body: 'Lead time under 5 business days for stock configurations.',
      ctaLabel: 'Build a kit',
      ctaHref: '/dev/preview/category/bundles',
    },
  },

  networking: {
    cols: [
      {
        title: 'Switches',
        items: [
          { label: 'Top-of-rack', href: cat('networking') },
          { label: 'Aggregation', href: cat('networking') },
          { label: 'Core',        href: cat('networking') },
          { label: 'Stackable',   href: cat('networking') },
        ],
      },
      {
        title: 'Wireless',
        items: [
          { label: 'Wi-Fi 6/6E APs', href: cat('networking') },
          { label: 'Wi-Fi 7 APs',    href: cat('networking') },
          { label: 'Controllers',    href: cat('networking') },
        ],
      },
      {
        title: 'Optics & cables',
        items: [
          { label: 'SFP / SFP+',         href: cat('networking') },
          { label: 'QSFP28 / QSFP56',    href: cat('networking') },
          { label: 'DAC / AOC',          href: cat('networking') },
          { label: 'Patch cables',       href: cat('networking') },
        ],
      },
      {
        title: 'By manufacturer',
        items: [
          { label: 'Cisco',   href: cat('networking', 'brand=Cisco') },
          { label: 'Aruba',   href: cat('networking', 'brand=Aruba') },
          { label: 'HPE',     href: cat('networking', 'brand=HPE') },
          { label: 'Juniper', href: cat('networking', 'brand=Juniper') },
        ],
      },
    ],
    promo: {
      eyebrow: 'Featured',
      title: 'Aruba Instant On — Wi-Fi 6 access points in stock, ships same day.',
      body: 'Cloud-managed APs for SMB and education buyers. Same-day shipping from CA.',
      ctaLabel: 'Shop Aruba',
      ctaHref: cat('networking', 'brand=Aruba'),
    },
  },

  components: {
    cols: [
      {
        title: 'CPUs',
        items: [
          { label: 'Intel Xeon',       href: cat('components', 'brand=Intel') },
          { label: 'AMD EPYC',         href: cat('components', 'brand=AMD') },
          { label: 'Workstation CPUs', href: cat('components') },
        ],
      },
      {
        title: 'Memory',
        items: [
          { label: 'DDR5 ECC RDIMM', href: cat('components') },
          { label: 'DDR4 ECC',       href: cat('components') },
          { label: 'Optane / PMem',  href: cat('components') },
        ],
      },
      {
        title: 'GPUs',
        items: [
          { label: 'NVIDIA H100',  href: cat('components', 'brand=NVIDIA') },
          { label: 'NVIDIA L40S',  href: cat('components', 'brand=NVIDIA') },
          { label: 'NVIDIA RTX',   href: cat('components', 'brand=NVIDIA') },
          { label: 'AMD Instinct', href: cat('components', 'brand=AMD') },
        ],
      },
      {
        title: 'Other',
        items: [
          { label: 'Power supplies', href: cat('components') },
          { label: 'Fans',           href: cat('components') },
          { label: 'Heatsinks',      href: cat('components') },
          { label: 'Cables',         href: cat('components') },
        ],
      },
    ],
    promo: {
      eyebrow: 'In stock',
      title: 'NVIDIA H100 SXM5 — limited allocation available.',
      body: 'Quote required. Speak with an account manager about lead times and bulk pricing.',
      ctaLabel: 'Talk to a specialist',
      ctaHref: '#',
    },
  },

  software: {
    cols: [
      {
        title: 'Virtualization',
        items: [
          { label: 'VMware',           href: cat('software', 'brand=VMware') },
          { label: 'Microsoft Hyper-V', href: cat('software', 'brand=Microsoft') },
          { label: 'Proxmox',          href: cat('software', 'brand=Proxmox') },
        ],
      },
      {
        title: 'Operating systems',
        items: [
          { label: 'Windows Server',          href: cat('software', 'brand=Microsoft') },
          { label: 'Red Hat Enterprise Linux',href: cat('software', 'brand=Red+Hat') },
          { label: 'SUSE',                    href: cat('software', 'brand=SUSE') },
        ],
      },
      {
        title: 'Backup & security',
        items: [
          { label: 'Veeam',       href: cat('software', 'brand=Veeam') },
          { label: 'Acronis',     href: cat('software', 'brand=Acronis') },
          { label: 'CrowdStrike', href: cat('software', 'brand=CrowdStrike') },
        ],
      },
      {
        title: 'Productivity',
        items: [
          { label: 'Microsoft 365', href: cat('software', 'brand=Microsoft') },
          { label: 'Adobe',         href: cat('software', 'brand=Adobe') },
        ],
      },
    ],
  },

  bundles: {
    cols: [
      {
        title: 'Pre-configured',
        items: [
          { label: 'HPC / AI training nodes', href: cat('bundles') },
          { label: 'VDI starter kits',        href: cat('bundles') },
          { label: 'NAS + drive kits',        href: cat('bundles') },
          { label: 'Branch office bundles',   href: cat('bundles') },
        ],
      },
      {
        title: 'By workload',
        items: [
          { label: 'AI / ML',       href: cat('bundles') },
          { label: 'Database',      href: cat('bundles') },
          { label: 'Backup target', href: cat('bundles') },
        ],
      },
      {
        title: 'By audience',
        items: [
          { label: 'Education',     href: cat('bundles') },
          { label: 'Healthcare',    href: cat('bundles') },
          { label: 'Public sector', href: cat('bundles') },
        ],
      },
      {
        title: 'Programs',
        items: [
          { label: 'Custom builds',  href: '#' },
          { label: 'Refresh cycles', href: '#' },
        ],
      },
    ],
    promo: {
      eyebrow: 'Featured',
      title: 'AI training pod — 8× H100 + InfiniBand fabric + storage, ready to deploy.',
      body: 'Pre-staged, burned in for 72 hours, ships in custom shock-rated crates.',
      ctaLabel: 'See the build',
      ctaHref: cat('bundles'),
    },
  },
};

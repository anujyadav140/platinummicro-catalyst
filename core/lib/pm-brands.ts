/**
 * Authorized manufacturer brands shown in the brand wall carousel.
 *
 * Logo source: Google's public favicon endpoint
 * `https://www.google.com/s2/favicons?domain={domain}&sz=128`. This is
 * stable, free, requires no API key, and returns the actual brand mark for
 * essentially every well-known company. Resolution is 128px which downscales
 * cleanly to the 48px logo height in the carousel cells.
 *
 * (Clearbit's free logo API was deprecated after their acquisition. We tried
 * Simple Icons CDN — only 5 of these brands have entries there.)
 *
 * Brands without a working source render a typeset wordmark fallback via
 * the carousel's onError handler.
 *
 * For production cutover we should download these into /public/pm/brands/*
 * for offline serving + consistent quality.
 */

// 256px source — gives sharper output when downscaled to the carousel cell.
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;

export interface PmBrand {
  /** Display name (used as alt text and placeholder text) */
  name: string;
  /** Logo image URL — `undefined` falls back to typeset name */
  logoSrc?: string;
  /** Brand category landing page (optional) */
  href?: string;
}

export const PM_BRANDS: PmBrand[] = [
  { name: 'Cisco',           logoSrc: favicon('cisco.com'),           href: '/dev/preview/category/networking?brand=Cisco' },
  { name: 'Arctic',          logoSrc: favicon('arctic.de') },
  { name: 'Microsoft',       logoSrc: favicon('microsoft.com'),       href: '/dev/preview/category/software?brand=Microsoft' },
  { name: 'Intel',           logoSrc: favicon('intel.com'),           href: '/dev/preview/category/components?brand=Intel' },
  { name: 'AMD',             logoSrc: favicon('amd.com'),             href: '/dev/preview/category/components?brand=AMD' },
  { name: 'HP',              logoSrc: favicon('hp.com'),              href: '/dev/preview/category/servers?brand=HP' },
  { name: 'ASRock',          logoSrc: favicon('asrock.com') },
  { name: 'AverMedia',       logoSrc: favicon('avermedia.com') },
  { name: 'Western Digital', logoSrc: favicon('westerndigital.com'),  href: '/dev/preview/category/storage?brand=Western+Digital' },
  { name: 'NVIDIA',          logoSrc: favicon('nvidia.com'),          href: '/dev/preview/category/components?brand=NVIDIA' },
  { name: 'XFX',             logoSrc: favicon('xfxforce.com') },
  { name: 'ECS',             logoSrc: favicon('ecs.com.tw') }, // returns 404, falls back via onError
  { name: 'Titanium Micro',  logoSrc: favicon('titaniummicro.com') },
  { name: 'PNY',             logoSrc: favicon('pny.com') },
  { name: 'iStar USA',       logoSrc: favicon('istarusa.com') },
  { name: 'Ampere',          logoSrc: favicon('amperecomputing.com') },
  { name: 'Gigabyte',        logoSrc: favicon('gigabyte.com'),        href: '/dev/preview/category/components?brand=Gigabyte' },
  { name: 'ASUStor',         logoSrc: favicon('asustor.com') },
  { name: 'ASRock Rack',     logoSrc: favicon('asrockrack.com') },
  { name: 'Aruba',           logoSrc: favicon('arubanetworks.com'),   href: '/dev/preview/category/networking?brand=Aruba' },
  { name: 'Solidigm',        logoSrc: favicon('solidigm.com'),        href: '/dev/preview/category/storage?brand=Solidigm' },
];

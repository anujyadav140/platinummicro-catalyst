/**
 * /dev/preview/brands
 * Authorized partner directory.
 *
 * Reality check from platinummicro.com/authorized-brand: only a subset of
 * brands are explicitly named as direct authorized resellers. Everything
 * else in our catalog is sourced via authorized distributors (TD SYNNEX,
 * etc.). We split the page accordingly to avoid overclaiming.
 *
 * Visual treatment matches BrandCell from pm-brand-wall but rendered as a
 * static grid (not the carousel). We do NOT import PmBrandWall.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';
import { PM_BRANDS, type PmBrand } from '~/lib/pm-brands';
import { BrandCell } from './brand-cell';

export const metadata = {
  title: 'Authorized Brands — Platinum Micro',
  description:
    'Manufacturer partners and brands stocked direct by Platinum Micro.',
};

// Brands the live OG page explicitly names as direct authorized resellers.
// Match against PM_BRANDS by lowercase name comparison.
const OG_AUTHORIZED_NAMES = new Set([
  'arctic',
  'asustor',
  'gigabyte',
  'hp',
  'titanium micro',
  'istar usa',
]);

function isDirectAuthorized(brand: PmBrand): boolean {
  return OG_AUTHORIZED_NAMES.has(brand.name.toLowerCase());
}

export default function BrandsPage() {
  const directAuthorized = PM_BRANDS.filter(isDirectAuthorized);
  const distributed = PM_BRANDS.filter((b) => !isDirectAuthorized(b));

  return (
    <PmLegalLayout
      eyebrow="Authorized partners"
      title="Authorized partner brands."
      meta={`${PM_BRANDS.length} manufacturer relationships across direct authorization and authorized-distributor channels`}
    >
      <p>
        Inventory at Platinum Micro flows through two channels — direct
        authorized-reseller agreements with the manufacturers below, and
        authorized distribution partnerships (TD SYNNEX, Ingram Micro, and
        others) for the broader enterprise catalog. Either way, every unit
        carries the original manufacturer warranty and ships from a verified
        channel — never from grey-market or secondary sources.
      </p>

      <h2>Direct authorized resellers</h2>
      <p>
        Platinum Micro holds direct manufacturer authorization for the
        brands below — pricing, warranty escalations, and product
        roadmaps come straight from the source.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {directAuthorized.map((brand) => (
          <BrandCell key={brand.name} brand={brand} />
        ))}
      </div>

      <h2>Sourced through authorized distributors</h2>
      <p>
        Available through Platinum Micro&apos;s authorized distribution
        agreements. Lead times, channel pricing, and warranty handling are
        identical to direct purchases.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {distributed.map((brand) => (
          <BrandCell key={brand.name} brand={brand} />
        ))}
      </div>

      <h2>Don&apos;t see your brand?</h2>
      <p>
        Distribution agreements cover more than 40 manufacturers — many
        outside this list. Most major enterprise lines can be sourced on
        request. Call <strong>(877) PMG-4YOU</strong> or email{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>{' '}
        with the manufacturer name and a rough quantity, and Business
        Development will quote within one business day.
      </p>
    </PmLegalLayout>
  );
}

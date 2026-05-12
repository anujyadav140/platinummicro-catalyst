/**
 * PmPageSectionsRenderer
 * ======================
 * Tiny dispatcher that takes the ordered `PmPageSection[]` from a
 * fetcher and renders each one with the right component. Saves us from
 * repeating a switch statement on every page that consumes the
 * admin-managed sections (homepage, category, brand, search).
 *
 * Add a `case` here when introducing a new section kind so every page
 * picks it up automatically.
 */

import { PmHeroBanner } from '~/components/pm-hero-banner';
import { PmCardSection } from '~/components/pm-card-section';
import { PmBrandsSection } from '~/components/pm-brands-section';
import type { PmPageSection } from '~/lib/pm-page-sections';

export interface PmPageSectionsRendererProps {
  sections: PmPageSection[];
}

export function PmPageSectionsRenderer({
  sections,
}: PmPageSectionsRendererProps) {
  if (sections.length === 0) return null;
  return (
    <>
      {sections.map((section, idx) => {
        switch (section.kind) {
          case 'hero':
            return <PmHeroBanner key={idx} banner={section.config} />;
          case 'cards':
            return <PmCardSection key={idx} section={section.config} />;
          case 'brands':
            return <PmBrandsSection key={idx} section={section.config} />;
          default: {
            // Exhaustiveness check — if a new kind is added to the
            // PmPageSection union, TS will flag this branch.
            const _exhaustive: never = section;
            void _exhaustive;
            return null;
          }
        }
      })}
    </>
  );
}

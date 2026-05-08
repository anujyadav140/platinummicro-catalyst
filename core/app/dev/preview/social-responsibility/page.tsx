/**
 * /dev/preview/social-responsibility
 * Real content from platinummicro.com/social-responsibility — focused on the
 * verified charity partnerships listed there. We removed the previous draft's
 * fabricated NIST 800-88 / E-rate / lifecycle-takeback claims (the OG page
 * doesn't make those claims).
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

const PARTNERS = [
  { name: 'American Red Cross', focus: 'Emergency response, blood services, disaster relief.' },
  { name: "Children's Hospital Los Angeles", focus: 'Pediatric care and research.' },
  { name: 'World Harvest', focus: 'Food rescue and distribution.' },
  { name: 'Ronald McDonald House', focus: 'Housing for families of children in treatment.' },
  { name: 'Feeding America', focus: 'Nationwide hunger-relief network.' },
  { name: 'Wat Thai', focus: 'Community programs in the Los Angeles Thai diaspora.' },
  { name: 'UCLA Health', focus: 'Academic medical research and patient care.' },
  { name: 'New Direction for Youth (NDFY)', focus: 'Mentorship and education for at-risk youth.' },
  { name: "St. Jude Children's Research Hospital", focus: 'Pediatric cancer research and care.' },
];

export const metadata = {
  title: 'Social Responsibility — Platinum Micro',
  description:
    'Charitable partnerships and community giving by Platinum Micro.',
};

export default function SocialResponsibilityPage() {
  return (
    <PmLegalLayout
      eyebrow="Social responsibility"
      title="Where Platinum Micro gives back."
      meta="Local-first community partnerships, plus national health and humanitarian programs."
    >
      <p>
        Platinum Micro is based in Sylmar, California, and the company&apos;s
        giving reflects that — local-first community partnerships paired
        with national health, humanitarian, and youth-focused programs.
        Direct contributions and volunteer time are split across the
        following organizations.
      </p>

      <h2>Partner organizations</h2>
      <ul>
        {PARTNERS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> — {p.focus}
          </li>
        ))}
      </ul>

      <h2>Environmental compliance</h2>
      <p>
        On the operational side, Platinum Micro complies with California&apos;s{' '}
        <a href="/dev/preview/legal/terms-conditions">
          Electronic Waste Recycling Act
        </a>
        , collecting state-mandated fees on covered display devices at
        purchase and routing them to certified recyclers. Customers with
        end-of-life equipment are encouraged to use a state-licensed
        e-waste handler — staff can recommend partners on request.
      </p>

      <h2>Get involved</h2>
      <p>
        Resellers, manufacturers, and customers who want to align a
        purchase or program with one of the partner organizations above
        can reach Business Development at <strong>(877) PMG-4YOU</strong>{' '}
        Monday–Friday, 7am–5pm PT, or{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}

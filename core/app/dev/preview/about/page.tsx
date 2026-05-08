/**
 * /dev/preview/about
 * Real content from platinummicro.com/about-us, tightened to our voice.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'About Platinum Micro',
  description:
    'Two decades of enterprise IT distribution from Southern California. MBE-certified, Intel Partner Gold, HPE-authorized.',
};

export default function AboutPage() {
  return (
    <PmLegalLayout
      eyebrow="About Platinum Micro"
      title="Two decades of enterprise IT distribution."
      meta="Founded 2000 · Sylmar, California"
    >
      <p>
        Platinum Micro was established in 2000 and has spent over two decades
        partnering with leading global manufacturers to source quality
        hardware at accessible prices. The catalog spans computer
        components, consumer electronics, security systems, and
        enterprise-class equipment — sold through this site and through
        major U.S. online retailers.
      </p>

      <h2>Vision</h2>
      <p>
        Platinum Micro&apos;s purpose is to educate and empower people through
        technology — by stocking current-generation products, sourcing them
        globally from leading manufacturers, and making them accessible
        to every kind of buyer.
      </p>

      <h2>The Platinum Experience</h2>
      <p>
        Every order ships with what the company calls{' '}
        <strong>the Platinum Experience</strong>: real lead times, named
        account managers, freight from Southern California, and a
        30-day satisfaction guarantee on most purchases. Trade credit is
        available with approved application, and B2B buyers get bulk pricing,
        quote workflows, and BOM upload built into the storefront.
      </p>

      <h2>Certifications &amp; Authorizations</h2>
      <ul>
        <li>
          <strong>MBE-certified</strong> — Minority Business Enterprise
        </li>
        <li>
          <strong>Intel Partner Gold</strong> — direct Xeon and component
          sourcing
        </li>
        <li>
          <strong>HPE Authorized Partner</strong> — ProLiant servers,
          Alletra storage, and Aruba networking
        </li>
        <li>
          Cooperative contracts: <strong>OMNIA Partners #R250307</strong>{' '}
          (via TD SYNNEX) and <strong>NASPO ValuePoint</strong> for HPE
          California (#7-23-70-55-03)
        </li>
      </ul>

      <h2>Catalog</h2>
      <ul>
        <li>Servers (rack, tower, blade, high density)</li>
        <li>Storage (enterprise SSD, NVMe, SAS, HDD, arrays)</li>
        <li>Networking (switches, wireless, optics, structured cabling)</li>
        <li>Components (CPUs, memory, GPUs, chassis parts)</li>
        <li>Software (virtualization, OS, backup, productivity)</li>
        <li>Pre-configured bundles for AI/ML, VDI, NAS, and edge deployments</li>
      </ul>

      <h2>Talk to Business Development</h2>
      <p>
        Prospective partners — distributors, system integrators, MSPs, and
        institutional buyers — are encouraged to reach out to Business
        Development directly. Call <strong>(877) PMG-4YOU</strong> Monday–Friday,
        7am–5pm PT, or email{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}

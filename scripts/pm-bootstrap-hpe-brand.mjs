#!/usr/bin/env node
/**
 * pm-bootstrap-hpe-brand.mjs
 * --------------------------
 * Seeds the HPE brand page (BC category id=291 — "BRAND > Mega Menu
 * Brands > Hewlett Packard Enterprise") with a four-section composition:
 *
 *   1. Hero banner (split layout) — HPE green content half + datacenter
 *      photo half. Anchors the brand identity.
 *   2. Card grid (3 cards) — three HPE product families (ProLiant servers,
 *      Alletra storage, Aruba networking). Clean white tile look.
 *   3. Hero banner (cover layout) — "HPE + AMD. Better Together." with
 *      a HPE-green → AMD-red overlay over a hardware photo. The campaign
 *      banner the user asked for.
 *   4. Card grid (3 cards, HPE-green bg) — Why HPE+AMD: performance, TCO,
 *      security. Mirrors the Aaawave "feature strip" aesthetic.
 *
 * The brand page itself lives at:
 *   /dev/preview/search?bids=<HPE-brand-ids>&heading=HPE
 * The banner fetcher (pm-brand-banner-fetcher) matches "HPE" to this
 * category via the SHORT_HEADINGS map, parses its description, and
 * renders the sections in document order ABOVE the product grid.
 *
 * Re-runnable: overwrites the description in place. Doesn't touch any
 * other category fields.
 */

import fs from 'node:fs/promises';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const STORE_HASH = '1dedrz66md';
const ACCESS_TOKEN = 'bhjmal6xz743bqbhtdck1qnme9tm6m4';
const BC_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const ARGV = new Set(process.argv.slice(2));
const DRY_RUN = ARGV.has('--dry-run');

const HPE_CATEGORY_ID = 291;
const HPE_PARENT_ID = 290; // "Mega Menu Brands"
const HPE_CATEGORY_NAME = 'Hewlett Packard Enterprise';

// Stable Unsplash hero photos — admin can swap to BC-CDN URLs later by
// uploading their own images and replacing the `image:` lines.
const IMG = {
  // Taylor Vick — server rack closeup with cool green/blue LEDs. Works
  // beautifully alongside HPE Element Green (#01A982).
  heroSplit:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1800&q=80',
  // Manuel Geissinger — long server-room aisle. Used as the bg image
  // behind the HPE+AMD "Better Together" cover banner; tinted via
  // overlay so the photo reads as texture rather than dominating.
  betterTogether:
    'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1800&q=80',
};

// HPE brand colors (Element Green, Deep Slate) + AMD red.
const C = {
  hpeGreen: '#01A982',
  hpeDeepSlate: '#0E3B43',
  amdRed: '#ED1C24',
};

const DESCRIPTION = `<!--pm-hero
image: ${IMG.heroSplit}
image_fit: split
image_position: right
content_half_bg: ${C.hpeGreen}
text: light
accent: ${C.hpeDeepSlate}
headline: Built for what comes next.
body: From ProLiant servers and Alletra storage to Aruba networking, HPE delivers the enterprise-grade infrastructure Platinum Micro builds, configures, and ships every day. Two decades of HPE expertise — one trusted reseller.
cta_label: Shop HPE ProLiant
cta_href: /dev/preview/search?term=HPE+ProLiant
height: 460px
padding_y: 0
content_padding: 56px 64px
margin_top: 0
margin_bottom: 32px
border_radius: 16px
full_bleed: false
-->

<!--pm-cards
eyebrow: The HPE lineup
title: Three product families. One partner.
subtitle: Compute, storage, and networking — certified, racked, and ready to ship from Southern California.
columns: 3
columns_md: 3
columns_sm: 1
gap: 20px
padding_y: 32px
bg: #ffffff
align: left
card_bg: #ffffff
card_border: 1px solid #e5e7eb
card_radius: 12px
card_padding: 28px
icon_bg: #d8f5ec
icon_color: ${C.hpeGreen}
icon_size: 28

card_1_title: HPE ProLiant Servers
card_1_subtitle: Gen11 rack and tower servers — AMD EPYC and Intel Xeon configurations validated for your workload.
card_1_icon: Server
card_1_href: /dev/preview/search?term=HPE+ProLiant

card_2_title: HPE Alletra Storage
card_2_subtitle: All-flash and hybrid storage for AI, virtualization, and mixed enterprise workloads.
card_2_icon: HardDrive
card_2_href: /dev/preview/search?term=HPE+Alletra

card_3_title: HPE Aruba Networking
card_3_subtitle: Instant On Wi-Fi 6/6E and CX core switches — enterprise networking built for the cloud era.
card_3_icon: Network
card_3_href: /dev/preview/search?term=Aruba
-->

<!--pm-hero
image: ${IMG.betterTogether}
image_fit: cover
bg: ${C.hpeDeepSlate}
bg_overlay: linear-gradient(110deg, rgba(14,59,67,0.94) 0%, rgba(14,59,67,0.7) 45%, rgba(237,28,36,0.78) 100%)
text: light
accent: ${C.amdRed}
eyebrow: Smart choice
headline: HPE + AMD. Better Together.
body: HPE ProLiant Gen11 servers powered by AMD EPYC™ processors deliver record-setting performance for virtualization, cloud-native applications, AI, and high-performance computing — at a smarter total cost of ownership. The pairing more enterprises are choosing for the next generation of workloads.
cta_label: Discover EPYC-powered ProLiant
cta_href: /dev/preview/search?term=HPE+EPYC
height: 440px
padding_y: 80px
margin_top: 0
margin_bottom: 32px
border_radius: 16px
full_bleed: false
align: left
-->

<!--pm-cards
eyebrow: Why HPE + AMD
title: A smarter choice for every workload.
subtitle: Performance, efficiency, and security — built in by HPE and AMD, validated and shipped by Platinum Micro.
columns: 3
columns_md: 3
columns_sm: 1
gap: 16px
padding_y: 56px
bg: ${C.hpeGreen}
text: light
align: left
card_bg: rgba(255,255,255,0.10)
card_text: #ffffff
card_border: 1px solid rgba(255,255,255,0.22)
card_radius: 12px
card_padding: 28px
icon_bg: rgba(255,255,255,0.14)
icon_color: #ffffff
icon_size: 26

card_1_title: Record-setting performance
card_1_subtitle: Up to 192 Zen 5 cores per CPU — built for AI inference, HPC, and the most demanding virtualized environments.
card_1_icon: Zap

card_2_title: Best-in-class TCO
card_2_subtitle: Higher core density means fewer servers, less power, and less rack space — savings that compound across the fleet.
card_2_icon: Rocket

card_3_title: Future-ready security
card_3_subtitle: End-to-end Silicon Root of Trust from HPE iLO and AMD Infinity Guard — every layer hardened against modern threats.
card_3_icon: ShieldCheck
-->`;

async function bcReq(method, path, body) {
  const res = await fetch(`${BC_BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`BC ${res.status} ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const bcPut = (p, b) => bcReq('PUT', p, b);

async function main() {
  console.log(`→ Seeding HPE brand page (category id=${HPE_CATEGORY_ID})…`);
  if (DRY_RUN) {
    console.log('  (dry run — no writes)');
    console.log('\n' + DESCRIPTION);
    return;
  }

  await bcPut('/catalog/trees/categories', [
    {
      category_id: HPE_CATEGORY_ID,
      tree_id: 1,
      parent_id: HPE_PARENT_ID,
      name: HPE_CATEGORY_NAME,
      description: DESCRIPTION,
    },
  ]);
  console.log(`  • description set on category id=${HPE_CATEGORY_ID}`);

  await fs.writeFile(
    'scripts/pm-bootstrap-hpe-brand.log.json',
    JSON.stringify({ categoryId: HPE_CATEGORY_ID, description: DESCRIPTION }, null, 2),
  );
  console.log('\n✓ done. View at: /dev/preview/search?bids=&heading=HPE');
  console.log('  Admin: BC → Products → Categories → BRAND → Mega Menu');
  console.log('  Brands → Hewlett Packard Enterprise → Description');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

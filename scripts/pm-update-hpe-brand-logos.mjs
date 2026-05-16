#!/usr/bin/env node
/**
 * pm-update-hpe-brand-logos.mjs
 * -----------------------------
 * One-shot: re-PUTs the HPE brand-banner category description with
 * `section_logo_1` + `section_logo_2` added to the "Why HPE + AMD" card
 * block, so the new pm-cards section-logo feature renders the partner
 * logos above the eyebrow.
 *
 * Logo sources:
 *   - HPE: hand-crafted bold-italic "HPE" white wordmark, inlined as a
 *          data URI (no external host needed). Replace the data URI in
 *          BC admin with a hosted URL if you want a richer mark.
 *   - AMD: cdn.simpleicons.org/amd/white — clean SVG, white recolor,
 *          stable URL. simple-icons is the same library used widely
 *          across the web for brand icons.
 *
 * Targets the new dedicated banner category (PM Page Banners > PM
 * Brand Banners > Hewlett Packard Enterprise). The category id is
 * looked up by name so this script doesn't hard-code an id that might
 * change between environments.
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

// Custom white wordmarks for HPE and AMD — bold italic, same viewBox so
// both render at the same height with matching weight. Inlined as data
// URIs so BC config stays self-contained (no external host to break the
// page when its DNS expires). Admin can swap in BC-CDN URLs for richer
// official logos later.
function wordmarkDataUri(text) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 90">' +
    '<text x="140" y="68" text-anchor="middle" ' +
    'font-family="Helvetica,Arial,sans-serif" font-size="64" ' +
    'font-weight="700" font-style="italic" fill="#ffffff" ' +
    `letter-spacing="3">${text}</text></svg>`;
  return (
    'data:image/svg+xml;base64,' +
    Buffer.from(svg, 'utf8').toString('base64')
  );
}

const HPE_LOGO_URL = wordmarkDataUri('HPE');
const AMD_LOGO_URL = wordmarkDataUri('AMD');

const C = {
  hpeGreen: '#01A982',
  hpeDeepSlate: '#0E3B43',
  amdRed: '#ED1C24',
};

const IMG = {
  heroSplit:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1800&q=80',
  betterTogether:
    'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1800&q=80',
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
section_logo_1: ${HPE_LOGO_URL}
section_logo_2: ${AMD_LOGO_URL}
section_logo_height: 72
section_logo_gap: 36px
section_logo_position: top-right
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

async function findHpeBannerCategoryId() {
  // PM Page Banners (303) → PM Brand Banners → Hewlett Packard Enterprise
  const folders = await bcReq(
    'GET',
    '/catalog/categories?name=PM%20Brand%20Banners&parent_id=303&include_fields=name',
  );
  const brandFolder = folders?.data?.[0];
  if (!brandFolder) throw new Error('PM Brand Banners folder not found');

  const kids = await bcReq(
    'GET',
    `/catalog/categories?parent_id=${brandFolder.id}&include_fields=name`,
  );
  const hpe = (kids?.data ?? []).find(
    (c) => c.name === 'Hewlett Packard Enterprise',
  );
  if (!hpe) throw new Error('HPE category under PM Brand Banners not found');
  return { brandFolderId: brandFolder.id, hpeId: hpe.id };
}

async function main() {
  const { brandFolderId, hpeId } = await findHpeBannerCategoryId();
  console.log(`→ Updating HPE banner (id=${hpeId}) with section logos…`);

  await bcReq('PUT', '/catalog/trees/categories', [
    {
      category_id: hpeId,
      tree_id: 1,
      parent_id: brandFolderId,
      name: 'Hewlett Packard Enterprise',
      description: DESCRIPTION,
    },
  ]);

  await fs.writeFile(
    'scripts/pm-update-hpe-brand-logos.log.json',
    JSON.stringify(
      { hpeId, hpeLogoSize: HPE_LOGO_URL.length, amdLogoUrl: AMD_LOGO_URL },
      null,
      2,
    ),
  );

  console.log(`  • description updated (${DESCRIPTION.length} chars)`);
  console.log(`  • HPE logo: data URI (${HPE_LOGO_URL.length} chars)`);
  console.log(`  • AMD logo: ${AMD_LOGO_URL}`);
  console.log('\n✓ done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

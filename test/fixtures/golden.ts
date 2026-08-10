// Golden set — expected classify() outputs for the 13 real sites in
// docs/data/test-results.json, mapped to the v1 schema (docs/06 §3).
//
// NOTE: test-results.json uses the original manual-testing labels
// (partner_b2b, confidence "negative"/"medium_negative"). The v1 schema
// normalizes those to: partner_trade, and 'none' with confidence 'high'
// (medium/soft cases still resolve to none — see mohd.it). These fixtures encode
// the AUTHORITATIVE v1 decision-table outcome, not the legacy labels.

import type { ClassifyInput, Classification } from '../../lib/types';

export interface GoldenCase {
  domain: string;
  input: ClassifyInput;
  expected: Classification;
}

export const GOLDEN_CASES: GoldenCase[] = [
  // --- affiliate / high (4) ---
  {
    domain: 'vecteezy.com',
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'Affiliate Program', href: 'https://www.vecteezy.com/affiliates', kw: ['affiliate'], platform: [], isStrong: true },
      ],
      platformHits: [],
      pathHits: [{ path: '/affiliates', status: 200, finalUrl: '', isStrong: true }],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'affiliate', confidence: 'high' },
  },
  {
    domain: 'nordicnest.se',
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: '', href: 'https://www.nordicnest.se/om-oss/affiliate/', kw: ['affiliate'], platform: [], isStrong: true },
      ],
      platformHits: [],
      pathHits: [],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'affiliate', confidence: 'high' },
  },
  {
    domain: 'designbyamor.com',
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'Bli en affiliatepartner', href: 'https://af.uppromote.com/7b7fdd-2a/register', kw: ['affiliate', 'partner'], platform: ['uppromote'], isStrong: true },
      ],
      platformHits: ['uppromote'],
      pathHits: [],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'affiliate', confidence: 'high' },
  },
  {
    domain: 'design-bestseller.de',
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'Partnerprogramm', href: 'https://ui.awin.com/merchant-profile/14674', kw: ['partnerprogramm', 'partner'], platform: ['awin'], isStrong: true },
      ],
      platformHits: ['awin'],
      pathHits: [],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'affiliate', confidence: 'high' },
  },

  // --- partner_trade (3) ---
  {
    domain: 'madeindesign.com', // weak link (professionnel) + weak path
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'Espace professionnel', href: 'https://www.madeindesign.com/service-pro.html', kw: ['professionnel'], platform: [], isStrong: false },
      ],
      platformHits: [],
      pathHits: [{ path: '/partenaires', status: 200, finalUrl: '', isStrong: false }],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'partner_trade', confidence: 'medium' },
  },
  {
    domain: 'williamwoodmirrors.co.uk', // weak links + weak path
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'Trade', href: 'https://www.williamwoodmirrors.co.uk/pages/trade', kw: ['trade'], platform: [], isStrong: false },
        { text: 'Partner With Us', href: 'https://www.williamwoodmirrors.co.uk/pages/partner-with-us', kw: ['partner'], platform: [], isStrong: false },
      ],
      platformHits: [],
      pathHits: [{ path: '/pages/trade', status: 200, finalUrl: '', isStrong: false }],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'partner_trade', confidence: 'medium' },
  },
  {
    domain: 'ozdesignfurniture.com.au', // weak link only, no path
    input: {
      loadStatus: 'ok',
      linkHits: [
        { text: 'STYLISTS & COMMERCIAL', href: 'https://ozdesignfurniture.com.au/trade-commercial/', kw: ['trade'], platform: [], isStrong: false },
      ],
      platformHits: [],
      pathHits: [],
      junkBaselineStatus: 404,
    },
    expected: { verdict: 'partner_trade', confidence: 'low' },
  },

  // --- none (5) ---
  ...['namly.dk', 'finnishdesignshop.com', 'thorvalddesign.com', 'mohd.it', 'pazzodesign.it'].map(
    (domain): GoldenCase => ({
      domain,
      input: { loadStatus: 'ok', linkHits: [], platformHits: [], pathHits: [], junkBaselineStatus: 404 },
      expected: { verdict: 'none', confidence: 'high' },
    }),
  ),

  // --- unknown / blocked (1) ---
  {
    domain: 'flinders.nl',
    input: { loadStatus: 'blocked', linkHits: [], platformHits: [], pathHits: [], junkBaselineStatus: null },
    expected: { verdict: 'unknown', confidence: 'blocked' },
  },
];

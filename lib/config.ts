// Detector configuration — keyword / platform / path lists.
// Copied VERBATIM from docs/05-detector-spec.md §2–4. Isolated here so it can be
// extended without touching detector logic (NFR-05). All matching is lowercase.

import type { DetectorConfig, RunConfig } from './types';

/** strong keywords ⇒ affiliate (docs/05 §2). `partnerprogramm` counts as strong. */
export const STRONG_KEYWORDS: string[] = [
  'affiliate',
  'affiliates',
  'affiliation',
  'affiliazione',
  'affiliati',
  'afiliado',
  'affiliat',
  'partnerprogramm',
];

/** weak keywords ⇒ partner/trade, need review (docs/05 §2). */
export const WEAK_KEYWORDS: string[] = [
  'partner',
  'partners',
  'partnership',
  'ambassador',
  'referral',
  'reseller',
  'revendeur',
  'wholesale',
  'grossiste',
  'grosshandel',
  'haendler',
  'rivenditore',
  'trade',
  'stockist',
  'b2b',
  'professionnel',
  'zakelijk',
  'samarbejde',
  'samarbete',
  'partnerskab',
  'forhandler',
  'aterforsaljare',
  'jalleenmyyja',
];

/** known affiliate-platform outbound hosts ⇒ strong (docs/05 §3). */
export const AFFILIATE_PLATFORMS: string[] = [
  'awin',
  'uppromote',
  'refersion',
  'goaffpro',
  'shareasale',
  'cj.com',
  'impact.com',
  'partnerize',
  'tradedoubler',
  'webgains',
  'tradetracker',
  'daisycon',
  'belboon',
  'financeads',
  'commissionfactory',
  'rakutenadvertising',
  'flexoffers',
  'tapfiliate',
  'firstpromoter',
  'affiliatly',
  'post-affiliate',
  'pepperjam',
  'leaddyno',
];

/** path-probe list — generic + shopify + localized (docs/05 §4), deduped. */
export const PROBE_PATHS: string[] = [
  // generic
  '/affiliate',
  '/affiliates',
  '/affiliate-program',
  '/affiliate-programme',
  '/partner',
  '/partners',
  '/partner-program',
  '/partnership',
  '/affiliation',
  '/referral',
  '/ambassador',
  // shopify-style
  '/pages/affiliate',
  '/pages/affiliates',
  '/pages/affiliate-program',
  '/pages/partner',
  '/pages/trade',
  '/pages/wholesale',
  // localized (IT/FR/DE/SE/DK/NL)
  '/affiliazione',
  '/affiliati',
  '/programma-affiliazione',
  '/partenaires',
  '/partnerprogramm',
  '/affiliate-programm',
  '/aterforsaljare',
  '/partnerprogram',
  '/forhandler',
  '/partnerskab',
  '/partnerprogramma',
];

/** 1.1.0 — Evidence.networkHits / CLI network evidence layer (Track A phase 2). */
export const DETECTOR_VERSION = '1.1.0';

/** Bundle passed to the injected detector via executeScript args. */
export const CONFIG: DetectorConfig = {
  strong: STRONG_KEYWORDS,
  weak: WEAK_KEYWORDS,
  platforms: AFFILIATE_PLATFORMS,
  paths: PROBE_PATHS,
  detectorVersion: DETECTOR_VERSION,
};

export {
  clampCollectLimit,
  maxPagesForLimit,
  parseLimitInput,
} from './collect-pagination.ts';

/** Default run knobs — ethical guardrails (docs/08 §6). */
export const DEFAULT_RUN_CONFIG: RunConfig = {
  query: 'design',
  limit: 20,
  delayMs: 2000,
  maxRetries: 2,
  tabTimeoutMs: 20000,
  resolveViaReviewPage: false,
  staleDays: 30,
};

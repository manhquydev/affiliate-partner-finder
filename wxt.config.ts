import { defineConfig } from 'wxt';

// WXT generates the MV3 manifest from this config + the entrypoints/ dir.
// Permissions & host_permissions follow docs/04 §5 and docs/09.
export default defineConfig({
  manifest: {
    name: 'Affiliate/Partner Finder (Trustpilot)',
    version: '1.0.0',
    description:
      'Rà soát công ty trên Trustpilot và phát hiện chương trình affiliate/partner, kèm bằng chứng.',
    permissions: ['tabs', 'scripting', 'storage', 'notifications'],
    // <all_urls> is required to open & scan arbitrary target sites (docs/04 §5).
    host_permissions: ['*://*.trustpilot.com/*', '<all_urls>'],
  },
});

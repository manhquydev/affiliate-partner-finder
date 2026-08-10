// Background service worker — intentionally minimal.
//
// Orchestration (collect → scan queue) used to live here but was moved to the
// dashboard page (entrypoints/options + lib/run-engine.ts): an MV3 service
// worker is killed after ~30s idle / a 5-min cap / a >30s fetch, which stalled
// long runs and forced manual "Resume". An open extension page has none of
// those limits. IndexedDB is the shared source of truth; popup & dashboard read
// it directly, so the SW no longer brokers state.
export default defineBackground(() => {
  // No long-running work here by design. Reserved for future lightweight hooks.
});

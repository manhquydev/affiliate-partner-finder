// Collect affiliate-platform hosts from request/response URLs (observe-only).
// Pure: no Playwright import — CLI attaches listeners and calls addUrl.

import { matchPlatformOnUrl, NETWORK_CDN_ALIASES } from './network-hosts';

/** Deduped platform tokens observed on the network during a page scan. */
export class NetworkHostCollector {
  private readonly hits = new Set<string>();

  constructor(
    private readonly platforms: readonly string[],
    private readonly aliases: Readonly<Record<string, string>> = NETWORK_CDN_ALIASES,
  ) {}

  addUrl(url: string): void {
    if (!url) return;
    for (const token of matchPlatformOnUrl(url, this.platforms, this.aliases)) {
      this.hits.add(token);
    }
  }

  matchedPlatforms(): string[] {
    return [...this.hits];
  }

  clear(): void {
    this.hits.clear();
  }
}

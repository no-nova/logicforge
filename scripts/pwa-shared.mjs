/**
 * Standard shared helpers for PWA / OG site metadata.
 * Canonical replacement for `grok-pwa-shared.mjs` — uses clear, standard naming.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const OG_SITE_REL_PATH = "src/lib/og/site.json";

export function readOgSite(workspaceRoot) {
  try {
    const filePath = join(workspaceRoot, OG_SITE_REL_PATH);
    if (!existsSync(filePath)) return {};
    const rawContent = readFileSync(filePath, "utf8");
    return JSON.parse(rawContent);
  } catch {
    return {};
  }
}

export function siteHasCustomCard(siteMetadata) {
  return String(siteMetadata?.card ?? "").toLowerCase() === "custom";
}

// Legacy re-exports for backward compatibility
export { OG_SITE_REL_PATH as GROK_OG_SITE_REL_PATH };

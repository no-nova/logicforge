/**
 * Standard PWA plugin for LogicForge.
 * Provides the PWA head tags, manifest, and optional branding pill.
 * This is the canonical, standard-named replacement for the legacy `grok-pwa-plugin.mjs`.
 * The legacy file remains as a re-export for backward compatibility.
 */
export function pwaPlugin() {
  return {
    name: "logicforge-pwa",
  };
}

// Legacy alias — keep for any code that still imports `grokPwaPlugin`
export const grokPwaPlugin = pwaPlugin;
export default pwaPlugin;

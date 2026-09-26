/**
 * Standard PWA middleware for LogicForge.
 * Replaces the legacy `grok-pwa.ts` middleware with a standard name.
 * Currently a no-op — real PWA head injection is handled by the Vite plugin.
 */
export default function pwaMiddleware(_request: unknown, _response: unknown, next: unknown) {
  if (typeof next === "function") (next as () => void)();
}

// Legacy alias
export const grokPwaMiddleware = pwaMiddleware;

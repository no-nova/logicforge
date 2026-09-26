/**
 * AI Bridge — exposes circuit state to external AI via window and fetch.
 * Standard API for AI to query disclosure and issue commands.
 */
import type { EditorAPI } from "./store";
import type { SimResult } from "./types";
import { buildAISnapshot } from "./aiSnapshot";
import { executeAICommand } from "@/lib/ai/assistant";

export interface AIBridge {
  getSnapshot: () => any;
  getSnapshotJson: () => string;
  chat: (prompt: string) => { success: boolean; message: string; actions: string[] };
  moveToLayer: (layerIdOrName: string, nodeIds?: string[]) => boolean;
  listLayers: () => any[];
  version: string;
}

export function installAIBridge(
  ed: EditorAPI,
  getSim: () => SimResult | null,
  getView: () => { x: number; y: number; z: number }
): AIBridge {
  const bridge: AIBridge = {
    getSnapshot: () => buildAISnapshot(ed.doc, ed.doc.defs, getSim(), getView(), ed.selection, ed.selectedWires),
    getSnapshotJson: () => JSON.stringify(buildAISnapshot(ed.doc, ed.doc.defs, getSim(), getView(), ed.selection, ed.selectedWires), null, 2),
    chat: (prompt: string) => {
      const snap = buildAISnapshot(ed.doc, ed.doc.defs, getSim(), getView(), ed.selection, ed.selectedWires);
      return executeAICommand(prompt, ed, snap);
    },
    moveToLayer: (layerIdOrName: string, nodeIds?: string[]) => {
      const layers: any[] = (ed as any).layers ?? [];
      let target = layers.find((l: any) => l.id === layerIdOrName) ?? layers.find((l: any) => l.name.toLowerCase() === layerIdOrName.toLowerCase());
      if (!target) return false;
      const ids = nodeIds ?? ed.selection;
      if (!ids.length) return false;
      (ed as any).moveSelectionToLayer?.(target.id, ids);
      return true;
    },
    listLayers: () => (ed as any).layers ?? [],
    version: "1.0",
  };
  // Expose globally for AI / console / external fetch handler
  try {
    (window as any).logicforgeAI = bridge;
    (window as any).getAISnapshot = bridge.getSnapshot;
  } catch {}
  // Also intercept fetch for /api/ai/* for declarative AI access
  const originalFetch = window.fetch.bind(window);
  // Provide a simple handler for /api/ai/snapshot and /api/ai/chat via client-side mock
  // Consumers can do fetch("/api/ai/snapshot").then(r=>r.json())
  const handler = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlStr = "";
    let method = (init?.method ?? "GET").toUpperCase();
    let bodyStr: string | undefined;
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (typeof (input as Request).url === "string") {
      const req = input as Request;
      urlStr = req.url;
      // If init not provided, get method/body from Request
      if (!init) {
        method = (req.method ?? "GET").toUpperCase();
        try { bodyStr = await req.clone().text(); } catch {}
      }
    }
    const pathname = urlStr ? new URL(urlStr, window.location.href).pathname : "";
    if (pathname === "/api/ai/snapshot" || pathname === "/api/ai/state") {
      const snap = bridge.getSnapshot();
      return new Response(JSON.stringify(snap, null, 2), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (pathname === "/api/ai/chat" && method === "POST") {
      try {
        const rawBody = bodyStr ?? (init?.body as string | undefined);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const prompt = body.prompt ?? body.message ?? "";
        const snap = bridge.getSnapshot();
        const result = executeAICommand(prompt, ed, snap);
        return new Response(JSON.stringify({ ...result, snapshot: snap }), { status: 200, headers: { "content-type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, message: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }
    return originalFetch(input as any, init);
  };
  // Monkey patch only if not already patched
  if (!(window as any).__logicforge_patched) {
    (window as any).fetch = handler;
    (window as any).__logicforge_patched = true;
  }
  return bridge;
}

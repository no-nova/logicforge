import type { CNode, Doc, Layer } from "./types";
import { uid } from "./geometry";

const PALETTE = ["#4d9fff", "#34d399", "#f59e0b", "#a78bfa", "#f472b6", "#38bdf8"];

export function defaultLayers(): Layer[] {
  return [
    { id: "layer-bg", name: "Background", color: "#64748b", order: 0 },
    { id: "layer-mid", name: "Midground", color: "#38bdf8", order: 1 },
    { id: "layer-fg", name: "Foreground", color: "#4d9fff", order: 2 },
  ];
}

export function ensureLayers(doc: Doc): Doc {
  if (doc.layers && doc.layers.length) {
    const sorted = [...doc.layers].sort((a, b) => a.order - b.order);
    // ensure active
    const active = doc.activeLayerId && sorted.find((l) => l.id === doc.activeLayerId) ? doc.activeLayerId : sorted[sorted.length - 1].id;
    // ensure nodes have layerId
    const nodes = doc.nodes.map((n) => (n.layerId && sorted.find((l) => l.id === n.layerId) ? n : { ...n, layerId: active }));
    return { ...doc, layers: sorted, activeLayerId: active, nodes };
  }
  const layers = defaultLayers();
  const active = layers[layers.length - 1].id;
  const nodes = doc.nodes.map((n) => ({ ...n, layerId: n.layerId ?? active }));
  return { ...doc, layers, activeLayerId: active, nodes, flattenLayers: doc.flattenLayers ?? false };
}

export function createLayer(name?: string, order?: number): Layer {
  const idx = order ?? 0;
  return {
    id: uid("lyr_"),
    name: name ?? `Layer ${idx + 1}`,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    order: idx,
  };
}

export function layerIndex(layers: Layer[], id?: string) {
  if (!id) return layers.length - 1;
  const i = layers.findIndex((l) => l.id === id);
  return i >= 0 ? i : layers.length - 1;
}

export function layerById(layers: Layer[], id?: string) {
  return layers.find((l) => l.id === id) ?? layers[layers.length - 1];
}

/** Painterly depth — no positional drift so wires stay joined to ports. Only blur+opacity vary; foreground vanishes when viewing background. */
export function depthMetrics(layers: Layer[], activeId: string | undefined, nodeLayerId: string | undefined, flatten: boolean) {
  if (flatten) return { dist: 0, scale: 1, blur: 0, opacity: 1, yOff: 0, z: 0 };
  const activeIdx = layerIndex(layers, activeId);
  const nodeIdx = layerIndex(layers, nodeLayerId);
  const dist = nodeIdx - activeIdx;
  const abs = Math.abs(dist);
  if (abs === 0) return { dist: 0, scale: 1, blur: 0, opacity: 1, yOff: 0, z: nodeIdx };
  if (dist > 0) {
    const blur = Math.min(16, 2.0 + abs * 4.2);
    const opacity = Math.max(0, 1 - abs * 0.88);
    return { dist, scale: 1, blur, opacity, yOff: 0, z: nodeIdx };
  }
  const blur = Math.min(10, 1.6 + abs * 1.8);
  const opacity = Math.max(0.16, 1 - abs * 0.32);
  return { dist, scale: 1, blur, opacity, yOff: 0, z: nodeIdx };
}

export function crossLayerColor(fromLayer: Layer, toLayer: Layer) {
  // Blend two layer colors distinctly — use from color with alpha, or generate gradient id
  return fromLayer.color;
}

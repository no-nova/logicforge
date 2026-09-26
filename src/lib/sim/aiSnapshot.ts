/**
 * AI Snapshot — discloses complete circuit state to AI.
 * Standard interface for AI to understand coordinates, type, connections, on/off, selection, layers, groups.
 */
import type { CNode, Doc } from "./types";
import { portCounts, nodeTitle, specOf, CATALOG } from "./catalog";
import { getNodeSize, getPortPosition } from "./geometry";
import type { SimResult, Val } from "./types";
import { inKey, outKey } from "./netlist";

export interface AIPortSnapshot {
  index: number;
  name: string;
  direction: "in" | "out";
  position: { x: number; y: number };
  connected: boolean;
  wires: string[]; // wire ids
  value: Val;
  floating: boolean;
}

export interface AINodeSnapshot {
  id: string;
  type: string;
  kind: string;
  label: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: 0 | 90 | 180 | 270;
  layerId?: string;
  layerName?: string;
  layerOrder?: number;
  locked: boolean;
  selected: boolean;
  group: string; // catalog group
  defId?: string;
  inputs: number;
  expected?: 0 | 1;
  value?: 0 | 1;
  period?: number;
  delay?: number;
  text?: string;
  ports: {
    inputs: AIPortSnapshot[];
    outputs: AIPortSnapshot[];
  };
  connectionStatus: {
    totalWires: number;
    incomingWires: string[];
    outgoingWires: string[];
    floatingInputs: number[];
    fanout: Record<number, number>;
  };
  runtime: {
    nodeIn: Record<string, Val>;
    nodeOut: Record<string, Val>;
    onOff: "ON" | "OFF" | "X" | "Z" | "unknown";
  };
  regionIds: string[];
}

export interface AIWireSnapshot {
  id: string;
  from: { node: string; port: number; label: string };
  to: { node: string; port: number; label: string };
  value: Val;
  selected: boolean;
  crossLayer: boolean;
  fromLayer?: string;
  toLayer?: string;
  transitionTick?: number;
}

export interface AIComponentSize {
  type: string;
  name: string;
  w: number;
  h: number;
  group: string;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  // how many rows (ins/outs) this size corresponds to
  exampleInputs: number;
  exampleOutputs: number;
}

export interface AISnapshot {
  meta: {
    name: string;
    generatedAt: string;
    nodeCount: number;
    wireCount: number;
    layerCount: number;
    regionCount: number;
    customDefCount: number;
  };
  catalogSizes: AIComponentSize[];
  grid: { size: number; snap: string };
  placementHints: {
    /** Where AI should place next components to avoid overlap (empty area) */
    nextFreeOrigin: { x: number; y: number };
    /** Bounding box of existing nodes */
    boundingBox: { x1: number; y1: number; x2: number; y2: number } | null;
    /** Current layer id where AI should place if prompt says "current layer" */
    currentLayerId?: string;
  };
  view: {
    x: number;
    y: number;
    z: number;
    activeLayerId?: string;
    activeLayerName?: string;
    flattenLayers: boolean;
    sortedLayers: { id: string; name: string; color: string; order: number }[];
  };
  selection: {
    nodeIds: string[];
    wireIds: string[];
    count: number;
  };
  layers: { id: string; name: string; color: string; order: number; nodeCount: number }[];
  regions: { id: string; name: string; color: string; x: number; y: number; w: number; h: number; nodeIds: string[] }[];
  defs: { id: string; name: string; color: string; inputs: number; outputs: number }[];
  nodes: AINodeSnapshot[];
  wires: AIWireSnapshot[];
  sim: {
    time: number;
    stable: boolean;
    floating: string[];
    contention: string[];
    wireValues: Record<string, Val>;
    nodeIn: Record<string, Val>;
    nodeOut: Record<string, Val>;
    transitions: Record<string, number>;
  };
  flattened: {
    /** Quick lookup for AI: id -> snapshot */
    nodeById: Record<string, AINodeSnapshot>;
  };
}

export function buildAISnapshot(
  doc: Doc,
  defsOverride?: Doc["defs"],
  sim?: SimResult | null,
  view?: { x: number; y: number; z: number },
  selection?: string[],
  selectedWires?: string[]
): AISnapshot {
  const defs = defsOverride ?? doc.defs ?? [];
  const layers = (doc as any).layers ?? [];
  const sortedLayers = [...layers].sort((a: any, b: any) => a.order - b.order);
  const activeLayerId = (doc as any).activeLayerId;
  const activeLayer = sortedLayers.find((l: any) => l.id === activeLayerId);
  const regions: any[] = (doc as any).regions ?? [];
  const sel = selection ?? [];
  const selWires = selectedWires ?? [];

  // Precompute wire maps
  const wiresByFrom = new Map<string, typeof doc.wires>();
  const wiresByTo = new Map<string, typeof doc.wires>();
  const wiresByNode = new Map<string, typeof doc.wires>();
  for (const w of doc.wires) {
    const fk = `${w.from.node}:${w.from.port}`;
    const tk = `${w.to.node}:${w.to.port}`;
    if (!wiresByFrom.has(fk)) wiresByFrom.set(fk, []);
    wiresByFrom.get(fk)!.push(w as any);
    if (!wiresByTo.has(tk)) wiresByTo.set(tk, []);
    wiresByTo.get(tk)!.push(w as any);
    if (!wiresByNode.has(w.from.node)) wiresByNode.set(w.from.node, []);
    if (!wiresByNode.has(w.to.node)) wiresByNode.set(w.to.node, []);
    wiresByNode.get(w.from.node)!.push(w as any);
    wiresByNode.get(w.to.node)!.push(w as any);
  }

  const layerById = new Map<string, any>(sortedLayers.map((l: any) => [l.id, l]));

  // Build catalog size disclosure for AI (prevents overlapping auto-layout)
  const catalogSizes: AIComponentSize[] = [];
  try {
    for (const [type, spec] of Object.entries(CATALOG as any)) {
      const dummy: any = { type, inputs: (spec as any).defaultInputs ?? (spec as any).minIn ?? 2, text: "Note", label: type };
      const { w, h } = getNodeSize(dummy as any, defs);
      // For variable fanin, also compute max
      let maxW = w, maxH = h;
      if ((spec as any).variableFanin) {
        const maxDummy: any = { type, inputs: (spec as any).maxIn ?? 8, text: "Note", label: type };
        const mh = getNodeSize(maxDummy as any, defs);
        maxW = mh.w; maxH = mh.h;
      }
      let minW = w, minH = Math.max(40, h - 40);
      if ((spec as any).minIn !== undefined) {
        const minDummy: any = { type, inputs: (spec as any).minIn, text: "N", label: type };
        const mn = getNodeSize(minDummy as any, defs);
        minW = mn.w; minH = mn.h;
      }
      // For TEXT, show range
      if (type === "TEXT") { minW = 120; maxW = 320; minH = 48; maxH = 120; }
      if (type === "INPUT" || type === "LED") { minW = maxW = w; minH = maxH = h; }
      catalogSizes.push({
        type,
        name: (spec as any).name ?? type,
        w, h,
        group: (spec as any).group ?? "unknown",
        minW, maxW, minH, maxH,
        exampleInputs: dummy.inputs,
        exampleOutputs: ((spec as any).outs?.(dummy)?.length ?? 1),
      });
    }
    // Add CUSTOM placeholder
    catalogSizes.push({ type: "CUSTOM", name: "BLOCK", w: 92, h: 50, group: "custom", minW: 92, maxW: 140, minH: 50, maxH: 90, exampleInputs: 2, exampleOutputs: 1 });
  } catch {}

  // Compute placement hints for AI to avoid overlapping
  let boundingBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  let nextFreeOrigin = { x: 120, y: 120 };
  try {
    if (doc.nodes.length) {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      for (const n of doc.nodes) {
        const { w, h } = getNodeSize(n as any, defs);
        x1 = Math.min(x1, n.x);
        y1 = Math.min(y1, n.y);
        x2 = Math.max(x2, n.x + w);
        y2 = Math.max(y2, n.y + h);
      }
      boundingBox = { x1, y1, x2, y2 };
      // Place next circuit to the right of existing with 180px gap, or at view center if empty area
      const gap = 180;
      const viewCx = view ? (400 - view.x) / view.z : x2 + gap;
      const viewCy = view ? (300 - view.y) / view.z : y1;
      // Prefer right of existing, but if that would be off-view, use gap from maxX
      nextFreeOrigin = { x: Math.max(x2 + gap, Math.round(viewCx)), y: Math.round(Math.min(y1, viewCy)) };
      // Snap to grid

      // snap already applied
      nextFreeOrigin.x = Math.round(nextFreeOrigin.x / 20) * 20;
      nextFreeOrigin.y = Math.round(nextFreeOrigin.y / 20) * 20;
    } else if (view) {
      nextFreeOrigin = { x: Math.round((400 - view.x)/view.z), y: Math.round((300 - view.y)/view.z) };
      nextFreeOrigin.x = Math.round(nextFreeOrigin.x/20)*20;
      nextFreeOrigin.y = Math.round(nextFreeOrigin.y/20)*20;
    }
  } catch {}

  const nodes: AINodeSnapshot[] = doc.nodes.map((n) => {
    const { w, h } = getNodeSize(n, defs);
    const { ins, outs } = portCounts(n, defs as any);
    const spec = specOf(n as any, defs as any) as any;
    const title = nodeTitle(n as any, defs as any);
    const group = spec?.group ?? "custom";
    const layer = layerById.get((n as any).layerId ?? activeLayerId ?? "");
    const regionIds = regions.filter((r) => r.nodeIds.includes(n.id)).map((r) => r.id);

    const inPorts: AIPortSnapshot[] = [];
    for (let i = 0; i < ins; i++) {
      const pos = getPortPosition(n as any, defs as any, "in", i);
      const key = `${n.id}:${i}`;
      const wk = `${n.id}|in|${i}`;
      const connectedWires = doc.wires.filter((w) => w.to.node === n.id && w.to.port === i).map((w) => w.id);
      const v = sim?.nodeIn.get(inKey(n.id, i)) ?? ("X" as Val);
      const floating = sim ? sim.floating.includes(inKey(n.id, i)) : false;
      inPorts.push({
        index: i,
        name: spec?.ins?.[i] ?? `in${i}`,
        direction: "in",
        position: pos,
        connected: connectedWires.length > 0,
        wires: connectedWires,
        value: v,
        floating,
      });
    }
    const outPorts: AIPortSnapshot[] = [];
    for (let i = 0; i < outs; i++) {
      const pos = getPortPosition(n as any, defs as any, "out", i);
      const v = sim?.nodeOut.get(outKey(n.id, i)) ?? ("X" as Val);
      const connectedWires = doc.wires.filter((w) => w.from.node === n.id && w.from.port === i).map((w) => w.id);
      const floating = false;
      outPorts.push({
        index: i,
        name: spec?.outs?.[i] ?? `out${i}`,
        direction: "out",
        position: pos,
        connected: connectedWires.length > 0,
        wires: connectedWires,
        value: v,
        floating,
      });
    }

    // connection status
    const incoming = doc.wires.filter((w) => w.to.node === n.id).map((w) => w.id);
    const outgoing = doc.wires.filter((w) => w.from.node === n.id).map((w) => w.id);
    const floatingInputs: number[] = [];
    for (let i = 0; i < ins; i++) {
      if (sim?.floating.includes(inKey(n.id, i))) floatingInputs.push(i);
      else if (!doc.wires.some((w) => w.to.node === n.id && w.to.port === i)) floatingInputs.push(i);
    }
    const fanout: Record<number, number> = {};
    for (let i = 0; i < outs; i++) {
      fanout[i] = doc.wires.filter((w) => w.from.node === n.id && w.from.port === i).length;
    }

    // on/off runtime
    const rawOut = sim?.nodeOut.get(outKey(n.id, 0)) ?? sim?.nodeOut.get(n.id) ?? sim?.nodeIn.get(inKey(n.id, 0)) ?? ("X" as Val);
    let onOff: AINodeSnapshot["runtime"]["onOff"] = "unknown";
    if (n.type === "INPUT") onOff = (n as any).value === 1 ? "ON" : "OFF";
    else if (n.type === "CLOCK") onOff = rawOut === 1 ? "ON" : rawOut === 0 ? "OFF" : "X";
    else if (rawOut === 1) onOff = "ON";
    else if (rawOut === 0) onOff = "OFF";
    else if (rawOut === "X") onOff = "X";
    else if (rawOut === "Z") onOff = "Z";

    const nodeInRec: Record<string, Val> = {};
    const nodeOutRec: Record<string, Val> = {};
    for (let i = 0; i < ins; i++) nodeInRec[`in:${i}`] = sim?.nodeIn.get(inKey(n.id, i)) ?? ("X" as Val);
    for (let i = 0; i < outs; i++) nodeOutRec[`out:${i}`] = sim?.nodeOut.get(outKey(n.id, i)) ?? ("X" as Val);

    return {
      id: n.id,
      type: n.type,
      kind: n.type,
      label: (n as any).label ?? title,
      title,
      x: n.x,
      y: n.y,
      w,
      h,
      rot: n.rot,
      layerId: (n as any).layerId,
      layerName: layer?.name,
      layerOrder: layer?.order,
      locked: !!(n as any).locked,
      selected: sel.includes(n.id),
      group,
      defId: (n as any).defId,
      inputs: (n as any).inputs ?? ins,
      expected: (n as any).expected,
      value: (n as any).value,
      period: (n as any).period,
      delay: (n as any).delay,
      text: (n as any).text,
      ports: { inputs: inPorts, outputs: outPorts },
      connectionStatus: {
        totalWires: incoming.length + outgoing.length,
        incomingWires: incoming,
        outgoingWires: outgoing,
        floatingInputs,
        fanout,
      },
      runtime: {
        nodeIn: nodeInRec,
        nodeOut: nodeOutRec,
        onOff,
      },
      regionIds,
    };
  });

  const wires: AIWireSnapshot[] = doc.wires.map((w) => {
    const fromNode = doc.nodes.find((n) => n.id === w.from.node);
    const toNode = doc.nodes.find((n) => n.id === w.to.node);
    const fromSpec = fromNode ? specOf(fromNode as any, defs as any) as any : null;
    const toSpec = toNode ? specOf(toNode as any, defs as any) as any : null;
    const fromLayer = (fromNode as any)?.layerId;
    const toLayer = (toNode as any)?.layerId;
    const cross = !!fromLayer && !!toLayer && fromLayer !== toLayer && !(doc as any).flattenLayers;
    return {
      id: w.id,
      from: { node: w.from.node, port: w.from.port, label: fromSpec?.outs?.[w.from.port] ?? `out${w.from.port}` },
      to: { node: w.to.node, port: w.to.port, label: toSpec?.ins?.[w.to.port] ?? `in${w.to.port}` },
      value: sim?.wireValues.get(w.id) ?? ("X" as Val),
      selected: selWires.includes(w.id),
      crossLayer: cross,
      fromLayer,
      toLayer,
      transitionTick: sim?.transitions.get(outKey(w.from.node, w.from.port)),
    };
  });

  const wireValuesRec: Record<string, Val> = {};
  if (sim) for (const [k, v] of sim.wireValues) wireValuesRec[k] = v;
  const nodeInRec: Record<string, Val> = {};
  if (sim) for (const [k, v] of sim.nodeIn) nodeInRec[k] = v;
  const nodeOutRec: Record<string, Val> = {};
  if (sim) for (const [k, v] of sim.nodeOut) nodeOutRec[k] = v;
  const transRec: Record<string, number> = {};
  if (sim) for (const [k, v] of sim.transitions) transRec[k] = v;

  return {
    meta: {
      name: doc.name ?? "Untitled",
      generatedAt: new Date().toISOString(),
      nodeCount: doc.nodes.length,
      wireCount: doc.wires.length,
      layerCount: sortedLayers.length,
      regionCount: regions.length,
      customDefCount: defs.length,
    },
    catalogSizes,
    grid: { size: 20, snap: "snapToGrid(x)=Math.round(x/20)*20 — all x/y are multiples of 20" },
    placementHints: {
      nextFreeOrigin,
      boundingBox,
      currentLayerId: activeLayerId,
    },
    view: {
      x: view?.x ?? 0,
      y: view?.y ?? 0,
      z: view?.z ?? 1,
      activeLayerId,
      activeLayerName: activeLayer?.name,
      flattenLayers: !!(doc as any).flattenLayers,
      sortedLayers: sortedLayers.map((l: any) => ({ id: l.id, name: l.name, color: l.color, order: l.order })),
    },
    selection: { nodeIds: sel, wireIds: selWires, count: sel.length + selWires.length },
    layers: sortedLayers.map((l: any) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      order: l.order,
      nodeCount: doc.nodes.filter((n: any) => (n.layerId ?? activeLayerId) === l.id).length,
    })),
    regions: regions.map((r: any) => ({ id: r.id, name: r.name, color: r.color, x: r.x, y: r.y, w: r.w, h: r.h, nodeIds: [...r.nodeIds] })),
    defs: defs.map((d: any) => ({ id: d.id, name: d.name, color: d.color, inputs: d.inputs?.length ?? 0, outputs: d.outputs?.length ?? 0 })),
    nodes,
    wires,
    sim: {
      time: sim?.time ?? 0,
      stable: sim?.stable ?? true,
      floating: sim?.floating ?? [],
      contention: sim?.contention ?? [],
      wireValues: wireValuesRec,
      nodeIn: nodeInRec,
      nodeOut: nodeOutRec,
      transitions: transRec,
    },
    flattened: {
      nodeById: Object.fromEntries(nodes.map((n) => [n.id, n])),
    },
  };
}

/** Expose snapshot to AI via global and fetchable JSON. */
export function formatSnapshotForPrompt(snapshot: AISnapshot): string {
  // Compact but complete for LLM context — include explicit size guidance for AI auto-layout
  const header = `// LogicForge AI disclosure — includes per-node w/h and catalogSizes (w/h ranges per type) + grid=20 + placementHints.nextFreeOrigin (use for new components to avoid overlap; respect currentLayerId if prompt says "current layer").\\n`;
  return header + JSON.stringify(snapshot, null, 2);
}

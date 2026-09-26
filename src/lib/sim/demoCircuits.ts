import { type CNode, type Doc, type Wire, uid } from "./circuit";
import { defaultLayers } from "./layers";

const n = (partial: Omit<CNode, "rot" | "inputs"> & { rot?: CNode["rot"]; inputs?: number }): CNode => ({
  rot: 0,
  inputs: 0,
  ...partial,
});

const w = (f: string, fp: number, t: string, tp: number): Wire => ({
  id: uid("w"),
  from: { node: f, port: fp },
  to: { node: t, port: tp },
});

export function emptyDoc(): Doc {
  const layers = defaultLayers();
  return { nodes: [], wires: [], defs: [], name: "Untitled", layers, activeLayerId: layers[2].id, flattenLayers: false };
}

function withLayers(nodes: CNode[], wires: Wire[], name: string): Doc {
  const layers = defaultLayers();
  // Distribute demo nodes painterly across layers: inputs/background, gates/mid, output/foreground
  const layerIds = layers.map((l) => l.id);
  const assigned = nodes.map((nd, i) => {
    // simple heuristic: inputs -> bg, gates -> mid, outputs -> fg
    let lid = layerIds[2];
    if (nd.type === "INPUT" || nd.type === "CLOCK" || nd.type === "VCC") lid = layerIds[0];
    else if (nd.type === "OUTPUT" || nd.type === "LED") lid = layerIds[2];
    else if (["AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "BUFFER"].includes(nd.type)) lid = layerIds[1];
    else lid = layerIds[1];
    return { ...nd, layerId: lid };
  });
  return { name, nodes: assigned, wires, defs: [], layers, activeLayerId: layerIds[2], flattenLayers: false };
}

/** XOR from NAND+OR+AND — the classic first circuit. */
export function demoXor(): Doc {
  const a = n({ id: "sw_a", type: "INPUT", label: "A", x: 80, y: 180, value: 1 });
  const b = n({ id: "sw_b", type: "INPUT", label: "B", x: 80, y: 300, value: 0 });
  const nand = n({ id: "g_nand", type: "NAND", x: 280, y: 200, inputs: 2 });
  const or = n({ id: "g_or", type: "OR", x: 280, y: 320, inputs: 2 });
  const and = n({ id: "g_and", type: "AND", x: 460, y: 250, inputs: 2 });
  const out = n({ id: "p_out", type: "OUTPUT", label: "A ⊕ B", x: 640, y: 262, inputs: 1 });
  return withLayers([a, b, nand, or, and, out], [w("sw_a", 0, "g_nand", 0), w("sw_b", 0, "g_nand", 1), w("sw_a", 0, "g_or", 0), w("sw_b", 0, "g_or", 1), w("g_nand", 0, "g_and", 0), w("g_or", 0, "g_and", 1), w("g_and", 0, "p_out", 0)], "XOR from gates");
}

/** Full adder — good truth-table demo. */
export function demoAdder(): Doc {
  const a = n({ id: "sw_a", type: "INPUT", label: "A", x: 60, y: 140, value: 1 });
  const b = n({ id: "sw_b", type: "INPUT", label: "B", x: 60, y: 240, value: 1 });
  const cin = n({ id: "sw_c", type: "INPUT", label: "Cin", x: 60, y: 340, value: 0 });
  const add = n({ id: "add", type: "ADDER", x: 280, y: 220 });
  const s = n({ id: "p_s", type: "OUTPUT", label: "Sum", x: 500, y: 200, inputs: 1 });
  const co = n({ id: "p_co", type: "OUTPUT", label: "Cout", x: 500, y: 300, inputs: 1 });
  return withLayers([a, b, cin, add, s, co], [w("sw_a", 0, "add", 0), w("sw_b", 0, "add", 1), w("sw_c", 0, "add", 2), w("add", 0, "p_s", 0), w("add", 1, "p_co", 0)], "Full adder");
}

/** 2-bit ripple counter — clocks, DFFs, waveform. */
export function demoCounter(): Doc {
  const clk = n({ id: "clk", type: "CLOCK", label: "CLK", x: 60, y: 210, period: 12, domain: "clk" });
  const rst = n({ id: "rst", type: "INPUT", label: "RST", x: 60, y: 320, value: 0 });
  const vcc = n({ id: "vcc", type: "VCC", x: 60, y: 110 });
  const t0 = n({ id: "t0", type: "TFF", label: "÷2", x: 280, y: 180 });
  const t1 = n({ id: "t1", type: "TFF", label: "÷4", x: 500, y: 180 });
  const q0 = n({ id: "p0", type: "LED", label: "Q0", x: 280, y: 360, inputs: 1, watch: true });
  const q1 = n({ id: "p1", type: "LED", label: "Q1", x: 500, y: 360, inputs: 1, watch: true });
  return withLayers([clk, rst, vcc, t0, t1, q0, q1], [w("vcc", 0, "t0", 0), w("clk", 0, "t0", 1), w("rst", 0, "t0", 2), w("vcc", 0, "t1", 0), w("t0", 0, "t1", 1), w("rst", 0, "t1", 2), w("t0", 0, "p0", 0), w("t1", 0, "p1", 0)], "Ripple counter");
}

/** Two tri-state drivers onto a shared bus. */
export function demoBus(): Doc {
  const a = n({ id: "sw_a", type: "INPUT", label: "A", x: 40, y: 80, value: 1 });
  const oe1 = n({ id: "oe1", type: "INPUT", label: "OE1", x: 40, y: 180, value: 1 });
  const b = n({ id: "sw_b", type: "INPUT", label: "B", x: 40, y: 300, value: 0 });
  const oe2 = n({ id: "oe2", type: "INPUT", label: "OE2", x: 40, y: 400, value: 0 });
  const t1 = n({ id: "tri1", type: "TRI", x: 240, y: 110 });
  const t2 = n({ id: "tri2", type: "TRI", x: 240, y: 330 });
  const bus = n({ id: "bus", type: "BUS", x: 460, y: 220, inputs: 2 });
  const pu = n({ id: "pu", type: "PULLUP", x: 640, y: 220 });
  const p = n({ id: "out", type: "OUTPUT", label: "BUS", x: 820, y: 232, inputs: 1 });
  return withLayers([a, oe1, b, oe2, t1, t2, bus, pu, p], [w("sw_a", 0, "tri1", 0), w("oe1", 0, "tri1", 1), w("sw_b", 0, "tri2", 0), w("oe2", 0, "tri2", 1), w("tri1", 0, "bus", 0), w("tri2", 0, "bus", 1), w("bus", 0, "pu", 0), w("pu", 0, "out", 0)], "Tri-state bus");
}

export const SAMPLES: { id: string; name: string; hint: string; build: () => Doc }[] = [
  { id: "xor", name: "XOR from gates", hint: "NAND · OR · AND", build: demoXor },
  { id: "adder", name: "Full adder", hint: "A, B, Cin → Sum, Cout", build: demoAdder },
  { id: "counter", name: "Ripple counter", hint: "Clocked TFFs + LEDs", build: demoCounter },
  { id: "bus", name: "Tri-state bus", hint: "Contention and pull-up", build: demoBus },
];

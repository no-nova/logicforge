import { portCounts } from "./catalog";
import type { CNode, CustomDef } from "./types";

let idc = 0;
export const uid = (p = "n") =>
  `${p}${Date.now().toString(36).slice(-5)}${(idc++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;

export const GRID = 20;
export const snap = (v: number) => Math.round(v / GRID) * GRID;

export function nodeSize(n: CNode, defs: CustomDef[]) {
  const { ins, outs } = portCounts(n, defs);
  if (n.type === "VCC" || n.type === "GND") return { w: 56, h: 40 };
  if (n.type === "LED") return { w: 64, h: 64 };
  if (n.type === "INPUT" || n.type === "OUTPUT" || n.type === "CLOCK") return { w: 80, h: 50 };
  const rows = Math.max(ins, outs, 1);
  const w = n.type === "CUSTOM" ? 118 : n.type === "COUNTER" || n.type === "MUX4" ? 108 : 96;
  return { w, h: Math.max(56, 26 + rows * 20) };
}

export function localPort(n: CNode, defs: CustomDef[], dir: "in" | "out", i: number) {
  const { w, h } = nodeSize(n, defs);
  const { ins, outs } = portCounts(n, defs);
  const count = dir === "in" ? ins : outs;
  const y = count <= 1 ? h / 2 : 16 + ((h - 28) * i) / Math.max(1, count - 1);
  return { x: dir === "in" ? 0 : w, y };
}

export function portPos(n: CNode, defs: CustomDef[], dir: "in" | "out", i: number) {
  const { w, h } = nodeSize(n, defs);
  const p = localPort(n, defs, dir, i);
  const cx = w / 2;
  const cy = h / 2;
  const a = (n.rot * Math.PI) / 180;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: n.x + cx + (dx * Math.cos(a) - dy * Math.sin(a)),
    y: n.y + cy + (dx * Math.sin(a) + dy * Math.cos(a)),
  };
}

export function portDir(n: CNode, dir: "in" | "out") {
  const base = dir === "in" ? -1 : 1;
  const a = (n.rot * Math.PI) / 180;
  return { x: base * Math.cos(a), y: base * Math.sin(a) };
}

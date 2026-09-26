import type { GateType, NodeKind, PrimitiveKind, SeqCell, Val } from "./types";
import { isGate } from "./catalog";

export function resolveBus(vals: Val[]): Val {
  const driven = vals.filter((v) => v !== "Z");
  if (!driven.length) return "Z";
  if (driven.some((v) => v === "X")) return "X";
  const first = driven[0];
  return driven.every((v) => v === first) ? first : "X";
}

export function notVal(v: Val): Val {
  if (v === 1) return 0;
  if (v === 0) return 1;
  return "X";
}

function as01X(v: Val): 0 | 1 | "X" {
  return v === "Z" ? "X" : v;
}

export function evalGate(type: GateType, ins: Val[]): Val {
  const xs = ins.map(as01X);
  const hasX = xs.some((v) => v === "X");
  const ones = xs.filter((v) => v === 1).length;
  switch (type) {
    case "AND":
      return xs.some((v) => v === 0) ? 0 : hasX ? "X" : 1;
    case "NAND":
      return xs.some((v) => v === 0) ? 1 : hasX ? "X" : 0;
    case "OR":
      return xs.some((v) => v === 1) ? 1 : hasX ? "X" : 0;
    case "NOR":
      return xs.some((v) => v === 1) ? 0 : hasX ? "X" : 1;
    case "XOR":
      return hasX ? "X" : ((ones % 2) as 0 | 1);
    case "XNOR":
      return hasX ? "X" : (((ones + 1) % 2) as 0 | 1);
    case "NOT":
      return xs[0] === "X" || xs[0] === undefined ? "X" : xs[0] === 1 ? 0 : 1;
    case "BUFFER":
      return xs[0] === undefined ? "X" : xs[0];
  }
}

export function bitOf(n: number, i: number): 0 | 1 {
  return ((n >> i) & 1) as 0 | 1;
}

function q01(cell: SeqCell | undefined): Val {
  if (!cell) return 0;
  if (cell.q === 0 || cell.q === 1) return cell.q;
  return "X";
}

function rising(prev: Val, clk: Val) {
  return prev === 0 && clk === 1;
}

export function evalPrimitive(
  kind: NodeKind | "SOURCE" | "BUFFER",
  ins: Val[],
  seq: SeqCell | undefined,
  opts: { constVal?: 0 | 1; bits?: number; srcVal?: Val },
): { outs: Val[]; seq?: SeqCell } {
  const hold = seq ?? { q: 0, prevClk: 0 as Val };

  if (kind === "TEXT") return { outs: [] };
  if (kind === "SOURCE") return { outs: [opts.srcVal ?? 0] };
  if (kind === "VCC") return { outs: [opts.constVal ?? 1] };
  if (kind === "GND") return { outs: [0] };
  if (isGate(kind as GateType)) return { outs: [evalGate(kind as GateType, ins)] };
  if (kind === "BUFFER" || kind === "DELAY" || kind === "OUTPUT" || kind === "LED") {
    return { outs: [as01X(ins[0] ?? "X")] };
  }
  if (kind === "PULLUP") return { outs: [ins[0] === "Z" || ins[0] == null ? 1 : as01X(ins[0])] };
  if (kind === "PULLDOWN") return { outs: [ins[0] === "Z" || ins[0] == null ? 0 : as01X(ins[0])] };
  if (kind === "TRI") {
    const oe = as01X(ins[1] ?? 0);
    if (oe === 0) return { outs: ["Z"] };
    if (oe === 1) return { outs: [ins[0] ?? "X"] };
    return { outs: ["X"] };
  }
  if (kind === "BUS") return { outs: [resolveBus(ins.length ? ins : ["Z"])] };

  if (kind === "MUX2") {
    const s = as01X(ins[2] ?? "X");
    if (s === 0) return { outs: [ins[0] ?? "X"] };
    if (s === 1) return { outs: [ins[1] ?? "X"] };
    return { outs: ["X"] };
  }
  if (kind === "MUX4") {
    const s0 = as01X(ins[4] ?? "X");
    const s1 = as01X(ins[5] ?? "X");
    if (s0 === "X" || s1 === "X") return { outs: ["X"] };
    const idx = (s0 === 1 ? 1 : 0) + (s1 === 1 ? 2 : 0);
    return { outs: [ins[idx] ?? "X"] };
  }
  if (kind === "DEC2") {
    const a = as01X(ins[0] ?? "X");
    const b = as01X(ins[1] ?? "X");
    if (a === "X" || b === "X") return { outs: ["X", "X", "X", "X"] };
    const idx = (a === 1 ? 1 : 0) + (b === 1 ? 2 : 0);
    return { outs: [0, 1, 2, 3].map((i) => (i === idx ? 1 : 0)) };
  }
  if (kind === "ADDER") {
    const a = as01X(ins[0] ?? "X");
    const b = as01X(ins[1] ?? "X");
    const c = as01X(ins[2] ?? 0);
    if (a === "X" || b === "X" || c === "X") return { outs: ["X", "X"] };
    const sum = (a as number) + (b as number) + (c as number);
    return { outs: [(sum & 1) as 0 | 1, (sum >> 1) as 0 | 1] };
  }

  if (kind === "DLATCH") {
    const d = as01X(ins[0] ?? "X");
    const en = as01X(ins[1] ?? 0);
    let q = q01(hold);
    if (en === 1) q = d;
    const next: SeqCell = { q: q === 1 ? 1 : q === 0 ? 0 : 2, prevClk: en };
    return { outs: [q, notVal(q)], seq: next };
  }

  if (kind === "DFF" || kind === "TFF" || kind === "JKFF" || kind === "COUNTER") {
    const bits = kind === "COUNTER" ? Math.min(8, Math.max(2, opts.bits ?? 4)) : 1;
    const clk = kind === "COUNTER" ? as01X(ins[0] ?? 0) : as01X(ins[kind === "JKFF" ? 2 : 1] ?? 0);
    const rst =
      kind === "COUNTER"
        ? as01X(ins[1] ?? 0)
        : kind === "JKFF"
          ? as01X(ins[3] ?? 0)
          : as01X(ins[2] ?? 0);
    const edge = rising(hold.prevClk, clk);
    let qn = hold.q || 0;
    if (rst === 1) qn = 0;
    else if (edge) {
      if (kind === "DFF") {
        const d = as01X(ins[0] ?? "X");
        qn = d === 1 ? 1 : d === 0 ? 0 : qn;
      } else if (kind === "TFF") {
        const t = as01X(ins[0] ?? 0);
        if (t === 1) qn = qn ? 0 : 1;
      } else if (kind === "JKFF") {
        const j = as01X(ins[0] ?? 0);
        const k = as01X(ins[1] ?? 0);
        const q = qn & 1;
        if (j === 1 && k === 1) qn = q ? 0 : 1;
        else if (j === 1) qn = 1;
        else if (k === 1) qn = 0;
      } else {
        const mask = (1 << bits) - 1;
        qn = (qn + 1) & mask;
      }
    }
    const next: SeqCell = { q: qn, prevClk: clk };
    if (kind === "COUNTER") {
      const outs: Val[] = [];
      for (let i = 0; i < bits; i++) outs.push(bitOf(qn, i));
      return { outs, seq: next };
    }
    const qv: Val = qn & 1 ? 1 : 0;
    return { outs: [qv, notVal(qv)], seq: next };
  }

  return { outs: ["X"] };
}

export function clockAt(time: number, period = 12): 0 | 1 {
  const p = Math.max(2, period);
  const half = p / 2;
  return Math.floor(time / half) % 2 === 0 ? 0 : 1;
}

export function floatDefault(kind: PrimitiveKind, port: number): Val {
  if (kind === "BUS") return "Z";
  if (kind === "TRI" && port === 1) return 0;
  if (kind === "DFF" || kind === "TFF" || kind === "JKFF") {
    if (port >= 1) return 0;
  }
  if (kind === "COUNTER") return 0;
  if (kind === "DLATCH" && port === 1) return 0;
  if (kind === "ADDER" && port === 2) return 0;
  return "X";
}

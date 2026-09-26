import { nodeDelay, portCounts, specOf } from "./catalog";
import { clockAt, evalGate, evalPrimitive, floatDefault } from "./logicEvaluation";
import type {
  Circuit,
  CustomDef,
  FlatNet,
  FlatNode,
  GateType,
  PrimitiveKind,
  SeqCell,
  SimResult,
  Val,
} from "./types";

function portKey(n: string, dir: "in" | "out", p: number) {
  return `${n}:${dir}:${p}`;
}

export const outKey = (node: string, port: number) => portKey(node, "out", port);
export const inKey = (node: string, port: number) => portKey(node, "in", port);
export const valKey = (id: string, port: number) => `${id}:${port}`;

export function flatten(circuit: Circuit, defs: CustomDef[]): FlatNet {
  const nodes = new Map<string, FlatNode>();
  const outAlias = new Map<string, string | null>();
  const inAlias = new Map<string, string>();

  const build = (c: Circuit, prefix: string, isTop: boolean) => {
    const sinkOf = new Map<string, { id: string; port: number }>();
    const sourceOf = new Map<string, string>();

    const setSrc = (flatId: string, port: number, srcKey: string | null) => {
      const fn = nodes.get(flatId);
      if (fn && port < fn.ins.length) fn.ins[port] = srcKey;
    };

    for (const n of c.nodes) {
      const fid = prefix + n.id;
      if (n.type === "CUSTOM") {
        const def = defs.find((d) => d.id === n.defId);
        if (!def) continue;
        build({ nodes: def.nodes, wires: def.wires }, fid + "/", false);
        def.inputs.forEach((inId, i) => {
          const innerFlat = fid + "/" + inId;
          if (!nodes.has(innerFlat)) {
            nodes.set(innerFlat, {
              id: innerFlat, kind: "BUFFER", ins: [null], outCount: 1, delay: 0, topId: isTop ? n.id : undefined,
            });
          }
          sinkOf.set(portKey(n.id, "in", i), { id: innerFlat, port: 0 });
        });
        def.outputs.forEach((outId, j) => {
          const innerFlat = fid + "/" + outId;
          if (!nodes.has(innerFlat)) {
            nodes.set(innerFlat, { id: innerFlat, kind: "BUFFER", ins: [null], outCount: 1, delay: 0 });
          }
          sourceOf.set(portKey(n.id, "out", j), valKey(innerFlat, 0));
        });
        continue;
      }

      if (n.type === "INPUT" || n.type === "CLOCK") {
        if (isTop) {
          nodes.set(fid, {
            id: fid,
            kind: "SOURCE",
            ins: [],
            outCount: 1,
            delay: 0,
            src: n.type === "INPUT" ? n.id : undefined,
            isClock: n.type === "CLOCK",
            period: n.period,
            domain: n.domain,
            topId: n.id,
          });
        } else {
          nodes.set(fid, { id: fid, kind: "BUFFER", ins: [null], outCount: 1, delay: 0 });
        }
        sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
        continue;
      }

      if (n.type === "VCC" || n.type === "GND") {
        nodes.set(fid, {
          id: fid, kind: n.type, ins: [], outCount: 1, delay: 0, constVal: n.type === "VCC" ? 1 : 0, topId: isTop ? n.id : undefined,
        });
        sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
        continue;
      }

      if (n.type === "TEXT") {
        nodes.set(fid, {
          id: fid, kind: "TEXT", ins: [], outCount: 0, delay: 0, topId: isTop ? n.id : undefined,
        });
        continue;
      }

      const names = specOf(n, defs);
      const kind: PrimitiveKind = n.type === "OUTPUT" || n.type === "LED" ? "BUFFER" : n.type;
      nodes.set(fid, {
        id: fid,
        kind,
        ins: new Array(names.ins.length).fill(null),
        outCount: Math.max(1, names.outs.length),
        delay: nodeDelay(n),
        bits: n.bits,
        topId: isTop ? n.id : undefined,
        domain: n.domain,
      });
      names.ins.forEach((_, i) => sinkOf.set(portKey(n.id, "in", i), { id: fid, port: i }));
      names.outs.forEach((_, j) => sourceOf.set(portKey(n.id, "out", j), valKey(fid, j)));
      if (n.type === "OUTPUT" || n.type === "LED") {
        sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
      }
    }

    for (const w of c.wires) {
      const src = sourceOf.get(portKey(w.from.node, "out", w.from.port));
      const sinkNode = c.nodes.find((n) => n.id === w.to.node);
      if (!src || !sinkNode) continue;
      const sink = sinkOf.get(portKey(w.to.node, "in", w.to.port));
      if (sink) setSrc(sink.id, sink.port, src);
    }

    if (isTop) {
      for (const [k, v] of sourceOf) outAlias.set(k, v);
      for (const [k, v] of sinkOf) inAlias.set(k, v.id);
    }
  };

  build(circuit, "", true);
  return { nodes, outAlias, inAlias };
}

export function emptySim(): SimResult {
  return {
    values: new Map(),
    wireValues: new Map(),
    nodeOut: new Map(),
    nodeIn: new Map(),
    stable: true,
    iterations: 0,
    floating: [],
    contention: [],
    time: 0,
    transitions: new Map(),
  };
}

export function packSimResult(
  circuit: Circuit,
  defs: CustomDef[],
  net: FlatNet,
  values: Map<string, Val>,
  iterations: number,
  stable: boolean,
  time: number,
  lastChange?: Map<string, number>,
): SimResult {
  const nodeOut = new Map<string, Val>();
  for (const [k, flat] of net.outAlias) {
    nodeOut.set(k, flat ? values.get(flat) ?? "X" : "X");
    const nodeId = k.split(":")[0];
    if (k.endsWith(":out:0") || !nodeOut.has(nodeId)) {
      nodeOut.set(nodeId, flat ? values.get(flat) ?? "X" : "X");
    }
  }

  const transitions = new Map<string, number>();
  if (lastChange) {
    for (const [k, flat] of net.outAlias) {
      const t = flat ? lastChange.get(flat) : undefined;
      if (t === undefined) continue;
      transitions.set(k, t);
      const nodeId = k.split(":")[0];
      if (k.endsWith(":out:0") || !transitions.has(nodeId)) {
        transitions.set(nodeId, t);
      }
    }
  }

  const wireValues = new Map<string, Val>();
  for (const w of circuit.wires) {
    wireValues.set(w.id, nodeOut.get(outKey(w.from.node, w.from.port)) ?? "X");
  }

  const nodeIn = new Map<string, Val>();
  const floating: string[] = [];
  for (const n of circuit.nodes) {
    const { ins } = portCounts(n, defs);
    for (let i = 0; i < ins; i++) {
      const w = circuit.wires.find((x) => x.to.node === n.id && x.to.port === i);
      const v: Val = w ? (wireValues.get(w.id) ?? "X") : "X";
      nodeIn.set(inKey(n.id, i), v);
      if (!w) floating.push(inKey(n.id, i));
    }
  }

  const contention: string[] = [];
  for (const n of circuit.nodes) {
    if (n.type !== "BUS") continue;
    const y = nodeOut.get(outKey(n.id, 0));
    if (y === "X") contention.push(n.id);
  }

  return { values, wireValues, nodeOut, nodeIn, stable, iterations, floating, contention, time, transitions };
}

export function simulate(
  circuit: Circuit,
  defs: CustomDef[],
  sourceValues: Map<string, Val>,
  seq?: Map<string, SeqCell>,
  time = 0,
): SimResult {
  const net = flatten(circuit, defs);
  const values = new Map<string, Val>();
  const seqMap = seq ?? new Map<string, SeqCell>();
  for (const fn of net.nodes.values()) {
    for (let p = 0; p < fn.outCount; p++) {
      values.set(valKey(fn.id, p), fn.kind === "VCC" ? 1 : fn.kind === "GND" ? 0 : "X");
    }
  }

  let stable = false;
  let iterations = 0;
  const MAX = 120;
  while (iterations < MAX) {
    iterations++;
    let changed = false;
    for (const fn of net.nodes.values()) {
      const ins: Val[] = fn.ins.map((s, i) => (s == null ? floatDefault(fn.kind, i) : values.get(s) ?? "X"));
      let srcVal: Val | undefined;
      if (fn.kind === "SOURCE") {
        srcVal = fn.isClock ? clockAt(time, fn.period ?? 12) : (sourceValues.get(fn.src!) ?? 0);
      }
      const cell = seqMap.get(fn.id);
      const { outs, seq: next } = evalPrimitive(fn.kind, ins, cell, {
        constVal: fn.constVal,
        bits: fn.bits,
        srcVal,
      });
      if (next) seqMap.set(fn.id, next);
      for (let p = 0; p < fn.outCount; p++) {
        const v = outs[p] ?? "X";
        const k = valKey(fn.id, p);
        if (values.get(k) !== v) {
          values.set(k, v);
          changed = true;
        }
      }
    }
    if (!changed) {
      stable = true;
      break;
    }
  }
  return packSimResult(circuit, defs, net, values, iterations, stable, time);
}

export function gateTruthTable(type: GateType, nIn: number) {
  const rows: { ins: (0 | 1)[]; out: Val }[] = [];
  const n = Math.min(nIn, 4);
  for (let m = 0; m < 1 << n; m++) {
    const ins: (0 | 1)[] = [];
    for (let i = n - 1; i >= 0; i--) ins.push(((m >> i) & 1) as 0 | 1);
    rows.push({ ins, out: evalGate(type, ins) });
  }
  return rows;
}

export function circuitTruthTable(circuit: Circuit, defs: CustomDef[]) {
  const switches = circuit.nodes.filter((n) => n.type === "INPUT");
  const probes = circuit.nodes.filter((n) => n.type === "OUTPUT" || n.type === "LED");
  if (!switches.length || !probes.length || switches.length > 8) return null;
  const rows: { ins: (0 | 1)[]; outs: Val[] }[] = [];
  const n = switches.length;
  for (let m = 0; m < 1 << n; m++) {
    const sv = new Map<string, Val>();
    const ins: (0 | 1)[] = [];
    switches.forEach((s, i) => {
      const bit = ((m >> (n - 1 - i)) & 1) as 0 | 1;
      ins.push(bit);
      sv.set(s.id, bit);
    });
    const r = simulate(circuit, defs, sv);
    rows.push({ ins, outs: probes.map((p) => r.nodeIn.get(inKey(p.id, 0)) ?? "X") });
  }
  return { switches, probes, rows };
}

export function topologyKey(doc: { nodes: Circuit["nodes"]; wires: Circuit["wires"]; defs: CustomDef[] }) {
  return [
    doc.nodes.map((n) => `${n.id}:${n.type}:${n.inputs}:${n.defId ?? ""}:${n.bits ?? ""}:${n.delay ?? ""}:${n.period ?? ""}`).join("|"),
    doc.wires.map((w) => `${w.from.node}.${w.from.port}>${w.to.node}.${w.to.port}`).join("|"),
    doc.defs.map((d) => d.id).join(","),
  ].join("~");
}

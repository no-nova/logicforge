import {
  type CustomDef,
  type Circuit,
  type SimResult,
  isSequential,
  nodeDelay,
  nodeTitle,
  portCounts,
} from "./circuit";

export interface Issue {
  level: "info" | "warn" | "err";
  code: string;
  msg: string;
  nodeId?: string;
}

export interface DomainInfo {
  domain: string;
  clocks: string[];
  seq: string[];
}

function clockDriver(circuit: Circuit, nodeId: string, seen = new Set<string>()): string | null {
  if (seen.has(nodeId)) return null;
  seen.add(nodeId);
  const n = circuit.nodes.find((x) => x.id === nodeId);
  if (!n) return null;
  if (n.type === "CLOCK") return n.id;
  const incoming = circuit.wires.filter((w) => w.to.node === nodeId);
  for (const w of incoming) {
    const hit = clockDriver(circuit, w.from.node, seen);
    if (hit) return hit;
  }
  return null;
}

export function clockDomains(circuit: Circuit, defs: CustomDef[]): DomainInfo[] {
  const map = new Map<string, DomainInfo>();
  for (const n of circuit.nodes.filter((x) => x.type === "CLOCK")) {
    const d = n.domain || n.label || "clk";
    const cur = map.get(d) ?? { domain: d, clocks: [], seq: [] };
    cur.clocks.push(n.id);
    map.set(d, cur);
  }
  for (const n of circuit.nodes.filter((x) => isSequential(x.type))) {
    const names = portCounts(n, defs);
    const clkPort = n.type === "COUNTER" ? 0 : n.type === "JKFF" ? 2 : n.type === "DLATCH" ? 1 : 1;
    const w = circuit.wires.find((x) => x.to.node === n.id && x.to.port === Math.min(clkPort, names.ins - 1));
    const clkId = w ? clockDriver(circuit, w.from.node) : null;
    const clk = clkId ? circuit.nodes.find((x) => x.id === clkId) : null;
    const d = clk ? clk.domain || clk.label || "clk" : "ungated";
    const cur = map.get(d) ?? { domain: d, clocks: [], seq: [] };
    cur.seq.push(n.id);
    map.set(d, cur);
  }
  return [...map.values()];
}

export function comboCycles(circuit: Circuit): string[][] {
  const seq = new Set(circuit.nodes.filter((n) => isSequential(n.type) || n.type === "CLOCK" || n.type === "INPUT").map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const n of circuit.nodes) adj.set(n.id, []);
  for (const w of circuit.wires) {
    if (seq.has(w.to.node)) continue;
    adj.get(w.from.node)?.push(w.to.node);
  }
  const cycles: string[][] = [];
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string) => {
    color.set(id, 1);
    stack.push(id);
    for (const nxt of adj.get(id) ?? []) {
      const c = color.get(nxt) ?? 0;
      if (c === 1) {
        const i = stack.lastIndexOf(nxt);
        if (i >= 0) cycles.push(stack.slice(i));
      } else if (c === 0) visit(nxt);
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const n of circuit.nodes) if ((color.get(n.id) ?? 0) === 0) visit(n.id);
  return cycles.slice(0, 8);
}

export function criticalPath(circuit: Circuit, defs: CustomDef[]) {
  const seqBreak = new Set(
    circuit.nodes.filter((n) => isSequential(n.type) || n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC" || n.type === "GND").map((n) => n.id),
  );
  const adj = new Map<string, string[]>();
  for (const n of circuit.nodes) adj.set(n.id, []);
  for (const w of circuit.wires) adj.get(w.from.node)?.push(w.to.node);

  const memo = new Map<string, { delay: number; path: string[] }>();
  const walk = (id: string, seen: Set<string>): { delay: number; path: string[] } => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return { delay: 0, path: [id] };
    const n = circuit.nodes.find((x) => x.id === id);
    if (!n) return { delay: 0, path: [] };
    const self = seqBreak.has(id) ? 0 : nodeDelay(n);
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    let best = { delay: self, path: [id] };
    for (const nxt of adj.get(id) ?? []) {
      const child = walk(nxt, nextSeen);
      if (self + child.delay > best.delay) best = { delay: self + child.delay, path: [id, ...child.path] };
    }
    memo.set(id, best);
    return best;
  };

  let best = { delay: 0, path: [] as string[] };
  for (const n of circuit.nodes) {
    if (!(n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC")) continue;
    const r = walk(n.id, new Set());
    if (r.delay > best.delay) best = r;
  }
  return best;
}

export function inspectCircuit(circuit: Circuit, defs: CustomDef[], sim: SimResult): Issue[] {
  const issues: Issue[] = [];
  if (!sim.stable) {
    issues.push({
      level: "err",
      code: "OSC",
      msg: "Netlist did not settle — combinational loop or bus fight.",
    });
  }
  for (const k of sim.floating) {
    const [id, , port] = k.split(":");
    const n = circuit.nodes.find((x) => x.id === id);
    if (!n) continue;
    if (n.type === "DFF" || n.type === "TFF" || n.type === "JKFF" || n.type === "COUNTER" || n.type === "DLATCH") {
      if (port !== "0") continue;
    }
    issues.push({
      level: "warn",
      code: "FLOAT",
      msg: `${nodeTitle(n, defs)} · input ${port} is undriven.`,
      nodeId: n.id,
    });
  }
  for (const id of sim.contention) {
    const n = circuit.nodes.find((x) => x.id === id);
    issues.push({
      level: "err",
      code: "BUSX",
      msg: `${n ? nodeTitle(n, defs) : id} has contended drivers (X).`,
      nodeId: id,
    });
  }
  for (const n of circuit.nodes.filter((x) => x.type === "CUSTOM" && !defs.find((d) => d.id === x.defId))) {
    issues.push({ level: "err", code: "DEF", msg: `Missing definition for ${n.id}.`, nodeId: n.id });
  }

  const fanout = new Map<string, number>();
  for (const w of circuit.wires) {
    const k = `${w.from.node}:${w.from.port}`;
    fanout.set(k, (fanout.get(k) ?? 0) + 1);
  }
  for (const [k, c] of fanout) {
    if (c < 6) continue;
    const id = k.split(":")[0];
    const n = circuit.nodes.find((x) => x.id === id);
    issues.push({
      level: "warn",
      code: "FANOUT",
      msg: `${n ? nodeTitle(n, defs) : id} drives ${c} loads.`,
      nodeId: id,
    });
  }

  for (const cyc of comboCycles(circuit)) {
    const names = cyc.map((id) => {
      const n = circuit.nodes.find((x) => x.id === id);
      return n ? nodeTitle(n, defs) : id;
    });
    issues.push({
      level: "err",
      code: "LOOP",
      msg: `Combinational loop: ${names.join(" → ")}`,
      nodeId: cyc[0],
    });
  }

  const domains = clockDomains(circuit, defs);
  const seqDomain = new Map<string, string>();
  for (const d of domains) for (const id of d.seq) seqDomain.set(id, d.domain);
  for (const w of circuit.wires) {
    const a = seqDomain.get(w.from.node);
    const bNode = circuit.nodes.find((n) => n.id === w.to.node);
    if (!a || !bNode || !isSequential(bNode.type)) continue;
    const b = seqDomain.get(bNode.id);
    if (b && a !== b && b !== "ungated") {
      issues.push({
        level: "warn",
        code: "CDC",
        msg: `Clock-domain crossing ${a} → ${b} at ${nodeTitle(bNode, defs)}.`,
        nodeId: bNode.id,
      });
    }
  }

  if (!issues.length) {
    issues.push({ level: "info", code: "OK", msg: "No structural issues. Netlist is driven and stable." });
  }
  return issues;
}

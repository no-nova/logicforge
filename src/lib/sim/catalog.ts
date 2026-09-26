import type { CNode, CompGroup, CompSpec, CustomDef, GateType, NodeKind } from "./types";

const letters = (n: number) =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

export const GATE_INFO: Record<
  GateType,
  { expr: (a: string[]) => string; minIn: number; maxIn: number; desc: string }
> = {
  AND: { expr: (a) => a.join(" · "), minIn: 2, maxIn: 8, desc: "HIGH only when every input is HIGH." },
  OR: { expr: (a) => a.join(" + "), minIn: 2, maxIn: 8, desc: "HIGH when at least one input is HIGH." },
  NOT: { expr: (a) => `¬${a[0] ?? "A"}`, minIn: 1, maxIn: 1, desc: "Inverts the input signal." },
  NAND: { expr: (a) => `¬(${a.join(" · ")})`, minIn: 2, maxIn: 8, desc: "Inverted AND. LOW only when all inputs HIGH." },
  NOR: { expr: (a) => `¬(${a.join(" + ")})`, minIn: 2, maxIn: 8, desc: "Inverted OR. HIGH only when all inputs LOW." },
  XOR: { expr: (a) => a.join(" ⊕ "), minIn: 2, maxIn: 8, desc: "HIGH when an odd number of inputs are HIGH." },
  XNOR: { expr: (a) => `¬(${a.join(" ⊕ ")})`, minIn: 2, maxIn: 8, desc: "HIGH when an even number of inputs are HIGH." },
  BUFFER: { expr: (a) => `${a[0] ?? "A"}`, minIn: 1, maxIn: 1, desc: "Passes the signal through unchanged." },
};

const gateSpec = (type: GateType): CompSpec => ({
  type,
  group: "gates",
  name: type,
  hint: GATE_INFO[type].desc,
  defaultDelay: 1,
  minIn: GATE_INFO[type].minIn,
  maxIn: GATE_INFO[type].maxIn,
  variableFanin: GATE_INFO[type].maxIn > 1,
  defaultInputs: GATE_INFO[type].minIn,
  ins: (n) => letters(Math.max(GATE_INFO[type].minIn, n.inputs || GATE_INFO[type].minIn)),
  outs: () => ["Y"],
});

export const CATALOG: Record<Exclude<NodeKind, "CUSTOM">, CompSpec> = {
  AND: gateSpec("AND"),
  OR: gateSpec("OR"),
  NOT: gateSpec("NOT"),
  NAND: gateSpec("NAND"),
  NOR: gateSpec("NOR"),
  XOR: gateSpec("XOR"),
  XNOR: gateSpec("XNOR"),
  BUFFER: gateSpec("BUFFER"),
  INPUT: {
    type: "INPUT", group: "io", name: "Switch", hint: "Toggleable HIGH / LOW source",
    defaultDelay: 0, minIn: 0, maxIn: 0, defaultInputs: 0, ins: () => [], outs: () => ["Y"],
  },
  CLOCK: {
    type: "CLOCK", group: "io", name: "Clock", hint: "Free-running square wave in its domain",
    defaultDelay: 0, minIn: 0, maxIn: 0, defaultInputs: 0, ins: () => [], outs: () => ["CLK"],
  },
  OUTPUT: {
    type: "OUTPUT", group: "io", name: "Probe", hint: "Named output / indicator",
    defaultDelay: 0, minIn: 1, maxIn: 1, defaultInputs: 1, ins: () => ["D"], outs: () => [],
  },
  LED: {
    type: "LED", group: "io", name: "LED", hint: "Glows when the input is HIGH",
    defaultDelay: 0, minIn: 1, maxIn: 1, defaultInputs: 1, ins: () => ["D"], outs: () => [],
  },
  VCC: {
    type: "VCC", group: "io", name: "VCC", hint: "Tied HIGH (logic 1)",
    defaultDelay: 0, minIn: 0, maxIn: 0, defaultInputs: 0, ins: () => [], outs: () => ["1"],
  },
  GND: {
    type: "GND", group: "io", name: "GND", hint: "Tied LOW (logic 0)",
    defaultDelay: 0, minIn: 0, maxIn: 0, defaultInputs: 0, ins: () => [], outs: () => ["0"],
  },
  TRI: {
    type: "TRI", group: "bus", name: "Tri-buf", hint: "Passes D when OE is HIGH, otherwise Hi-Z",
    defaultDelay: 1, minIn: 2, maxIn: 2, defaultInputs: 2, ins: () => ["D", "OE"], outs: () => ["Y"],
  },
  BUS: {
    type: "BUS", group: "bus", name: "Bus", hint: "Resolves multiple drivers (0/1/Z/X contention)",
    defaultDelay: 0, minIn: 2, maxIn: 8, variableFanin: true, defaultInputs: 2,
    ins: (n) => Array.from({ length: Math.max(2, n.inputs || 2) }, (_, i) => `D${i}`),
    outs: () => ["Y"],
  },
  PULLUP: {
    type: "PULLUP", group: "bus", name: "Pull-up", hint: "Weak HIGH: Z becomes 1",
    defaultDelay: 0, minIn: 1, maxIn: 1, defaultInputs: 1, ins: () => ["D"], outs: () => ["Y"],
  },
  PULLDOWN: {
    type: "PULLDOWN", group: "bus", name: "Pull-down", hint: "Weak LOW: Z becomes 0",
    defaultDelay: 0, minIn: 1, maxIn: 1, defaultInputs: 1, ins: () => ["D"], outs: () => ["Y"],
  },
  DFF: {
    type: "DFF", group: "seq", name: "DFF", hint: "Positive-edge D flip-flop with async reset",
    defaultDelay: 1, minIn: 3, maxIn: 3, defaultInputs: 3, ins: () => ["D", "CLK", "RST"], outs: () => ["Q", "Qn"],
  },
  DLATCH: {
    type: "DLATCH", group: "seq", name: "Latch", hint: "Level-sensitive D latch (transparent when EN)",
    defaultDelay: 1, minIn: 2, maxIn: 2, defaultInputs: 2, ins: () => ["D", "EN"], outs: () => ["Q", "Qn"],
  },
  TFF: {
    type: "TFF", group: "seq", name: "TFF", hint: "Toggle flip-flop. T=1 flips Q on rising CLK",
    defaultDelay: 1, minIn: 3, maxIn: 3, defaultInputs: 3, ins: () => ["T", "CLK", "RST"], outs: () => ["Q", "Qn"],
  },
  JKFF: {
    type: "JKFF", group: "seq", name: "JKFF", hint: "JK flip-flop with async reset",
    defaultDelay: 1, minIn: 4, maxIn: 4, defaultInputs: 4, ins: () => ["J", "K", "CLK", "RST"], outs: () => ["Q", "Qn"],
  },
  COUNTER: {
    type: "COUNTER", group: "seq", name: "Counter", hint: "Binary up-counter, rising CLK, async RST",
    defaultDelay: 1, minIn: 2, maxIn: 2, defaultInputs: 2, ins: () => ["CLK", "RST"],
    outs: (n) => Array.from({ length: Math.min(8, Math.max(2, n.bits ?? 4)) }, (_, i) => `Q${i}`),
  },
  MUX2: {
    type: "MUX2", group: "combo", name: "MUX 2:1", hint: "Selects I0 or I1 from S",
    defaultDelay: 1, minIn: 3, maxIn: 3, defaultInputs: 3, ins: () => ["I0", "I1", "S"], outs: () => ["Y"],
  },
  MUX4: {
    type: "MUX4", group: "combo", name: "MUX 4:1", hint: "Four-input mux, S1 S0 select",
    defaultDelay: 1, minIn: 6, maxIn: 6, defaultInputs: 6, ins: () => ["I0", "I1", "I2", "I3", "S0", "S1"], outs: () => ["Y"],
  },
  DEC2: {
    type: "DEC2", group: "combo", name: "DEC 2:4", hint: "One-hot decoder",
    defaultDelay: 1, minIn: 2, maxIn: 2, defaultInputs: 2, ins: () => ["A", "B"], outs: () => ["Y0", "Y1", "Y2", "Y3"],
  },
  ADDER: {
    type: "ADDER", group: "combo", name: "Adder", hint: "Full adder: S = A ⊕ B ⊕ Cin",
    defaultDelay: 1, minIn: 3, maxIn: 3, defaultInputs: 3, ins: () => ["A", "B", "Cin"], outs: () => ["S", "Cout"],
  },
  DELAY: {
    type: "DELAY", group: "timing", name: "Delay", hint: "Buffer with a longer propagation delay",
    defaultDelay: 4, minIn: 1, maxIn: 1, defaultInputs: 1, ins: () => ["D"], outs: () => ["Y"],
  },
  TEXT: {
    type: "TEXT", group: "io", name: "Note", hint: "Editable text annotation — double-click to edit",
    defaultDelay: 0, minIn: 0, maxIn: 0, defaultInputs: 0, ins: () => [], outs: () => [],
  },
};

export const GROUP_LABEL: Record<CompGroup, string> = {
  gates: "Logic gates",
  io: "I / O",
  seq: "Sequential",
  combo: "Combinational",
  bus: "Tri-state / bus",
  timing: "Timing",
};

export const isGate = (t: NodeKind): t is GateType => t in GATE_INFO;
export const isSequential = (t: NodeKind) =>
  t === "DFF" || t === "DLATCH" || t === "TFF" || t === "JKFF" || t === "COUNTER";

export function specOf(n: CNode, defs: CustomDef[]): { ins: string[]; outs: string[] } {
  if (n.type === "CUSTOM") {
    const d = defs.find((x) => x.id === n.defId);
    return {
      ins: d ? d.inputs.map((_, i) => `IN${i}`) : [],
      outs: d ? d.outputs.map((_, i) => `OUT${i}`) : [],
    };
  }
  const s = CATALOG[n.type];
  return { ins: s.ins(n), outs: s.outs(n) };
}

export function portCounts(n: CNode, defs: CustomDef[]) {
  const s = specOf(n, defs);
  return { ins: s.ins.length, outs: s.outs.length };
}

export function nodeTitle(n: CNode, defs: CustomDef[]): string {
  if (n.label) return n.label;
  if (n.type === "CUSTOM") return defs.find((d) => d.id === n.defId)?.name ?? "BLOCK";
  return CATALOG[n.type]?.name ?? n.type;
}

export function nodeDelay(n: CNode): number {
  if (n.delay != null) return Math.max(0, Math.round(n.delay));
  if (n.type === "CUSTOM") return 0;
  return CATALOG[n.type]?.defaultDelay ?? 1;
}

export type Val = 0 | 1 | "X" | "Z";

export type GateType =
  | "AND"
  | "OR"
  | "NOT"
  | "NAND"
  | "NOR"
  | "XOR"
  | "XNOR"
  | "BUFFER";

export type NodeKind =
  | GateType
  | "INPUT"
  | "OUTPUT"
  | "CLOCK"
  | "LED"
  | "VCC"
  | "GND"
  | "TRI"
  | "BUS"
  | "PULLUP"
  | "PULLDOWN"
  | "DFF"
  | "DLATCH"
  | "TFF"
  | "JKFF"
  | "COUNTER"
  | "MUX2"
  | "MUX4"
  | "DEC2"
  | "ADDER"
  | "DELAY"
  | "CUSTOM";

export type NodeType = NodeKind;

export interface CNode {
  id: string;
  type: NodeKind;
  label?: string;
  x: number;
  y: number;
  rot: 0 | 90 | 180 | 270;
  inputs: number;
  defId?: string;
  value?: 0 | 1;
  period?: number;
  delay?: number;
  domain?: string;
  bits?: number;
  watch?: boolean;
  locked?: boolean;
  /** Expected steady-state value for an OUTPUT/LED node, for quick pass/fail checking against the actual simulated value. */
  expected?: 0 | 1;
}

export interface Wire {
  id: string;
  from: { node: string; port: number };
  to: { node: string; port: number };
}

export interface CustomDef {
  id: string;
  name: string;
  color: string;
  nodes: CNode[];
  wires: Wire[];
  inputs: string[];
  outputs: string[];
}

export interface Circuit {
  nodes: CNode[];
  wires: Wire[];
}

export interface Doc extends Circuit {
  defs: CustomDef[];
  name?: string;
}

export type CompGroup = "gates" | "io" | "seq" | "combo" | "bus" | "timing";

export interface CompSpec {
  type: NodeKind;
  group: CompGroup;
  name: string;
  hint: string;
  defaultDelay: number;
  minIn: number;
  maxIn: number;
  variableFanin?: boolean;
  defaultInputs: number;
  ins: (n: CNode) => string[];
  outs: (n: CNode) => string[];
}

export type PrimitiveKind = NodeKind | "SOURCE" | "BUFFER";

export interface FlatNode {
  id: string;
  kind: PrimitiveKind;
  ins: (string | null)[];
  outCount: number;
  delay: number;
  src?: string;
  constVal?: 0 | 1;
  bits?: number;
  isClock?: boolean;
  period?: number;
  domain?: string;
  topId?: string;
}

export interface FlatNet {
  nodes: Map<string, FlatNode>;
  outAlias: Map<string, string | null>;
  inAlias: Map<string, string>;
}

export interface SeqCell {
  q: number;
  prevClk: Val;
}

export interface SimResult {
  values: Map<string, Val>;
  wireValues: Map<string, Val>;
  nodeOut: Map<string, Val>;
  nodeIn: Map<string, Val>;
  stable: boolean;
  iterations: number;
  floating: string[];
  contention: string[];
  time: number;
  /**
   * Tick at which an output last actually changed value, keyed the same way as
   * nodeOut (both "<nodeId>:out:<port>" and bare "<nodeId>" for port 0). Only
   * populated in timed (live) simulation — static/combinational solves leave it
   * empty since "tick" isn't meaningful there.
   */
  transitions: Map<string, number>;
}

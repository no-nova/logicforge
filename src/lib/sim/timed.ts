import {
  type Circuit,
  type CustomDef,
  type FlatNet,
  type SeqCell,
  type SimResult,
  type Val,
  clockAt,
  emptySim,
  evalPrimitive,
  flatten,
  floatDefault,
  packSimResult,
  valKey,
} from "./circuit";

export type TimingMode = "zero" | "unit";

export interface WaveSample {
  t: number;
  vals: Record<string, Val>;
}

export interface TimedEngine {
  net: FlatNet;
  values: Map<string, Val>;
  seq: Map<string, SeqCell>;
  events: { t: number; key: string; v: Val }[];
  time: number;
  wave: WaveSample[];
  last: SimResult;
  /** Tick at which each flat value key last actually changed value. */
  lastChange: Map<string, number>;
}

const WAVE_CAP = 720;

export function createEngine(circuit: Circuit, defs: CustomDef[]): TimedEngine {
  const net = flatten(circuit, defs);
  const values = new Map<string, Val>();
  for (const fn of net.nodes.values()) {
    for (let p = 0; p < fn.outCount; p++) {
      values.set(valKey(fn.id, p), fn.kind === "VCC" ? 1 : fn.kind === "GND" ? 0 : "X");
    }
  }
  return {
    net,
    values,
    seq: new Map(),
    events: [],
    time: 0,
    wave: [],
    last: emptySim(),
    lastChange: new Map(),
  };
}

function evalWorld(
  engine: TimedEngine,
  sources: Map<string, Val>,
): Map<string, Val> {
  const desired = new Map<string, Val>();
  for (const fn of engine.net.nodes.values()) {
    const ins: Val[] = fn.ins.map((s, i) =>
      s == null ? floatDefault(fn.kind, i) : (engine.values.get(s) ?? "X"),
    );
    let srcVal: Val | undefined;
    if (fn.kind === "SOURCE") {
      srcVal = fn.isClock ? clockAt(engine.time, fn.period ?? 12) : (sources.get(fn.src!) ?? 0);
    }
    const { outs, seq } = evalPrimitive(fn.kind, ins, engine.seq.get(fn.id), {
      constVal: fn.constVal,
      bits: fn.bits,
      srcVal,
    });
    if (seq) engine.seq.set(fn.id, seq);
    for (let p = 0; p < fn.outCount; p++) desired.set(valKey(fn.id, p), outs[p] ?? "X");
  }
  return desired;
}

function drain(engine: TimedEngine, sources: Map<string, Val>, mode: TimingMode) {
  let iterations = 0;
  let stable = false;
  const MAX = 160;
  while (iterations < MAX) {
    iterations++;
    const due = engine.events.filter((e) => e.t <= engine.time);
    if (due.length) {
      engine.events = engine.events.filter((e) => e.t > engine.time);
      for (const e of due) {
        if (engine.values.get(e.key) !== e.v) engine.lastChange.set(e.key, engine.time);
        engine.values.set(e.key, e.v);
      }
    }
    const desired = evalWorld(engine, sources);
    let scheduledNow = false;
    for (const [key, v] of desired) {
      const cur = engine.values.get(key);
      if (cur === v) {
        engine.events = engine.events.filter((e) => e.key !== key);
        continue;
      }
      const fnId = key.slice(0, key.lastIndexOf(":"));
      const fn = engine.net.nodes.get(fnId);
      const delay = mode === "zero" ? 0 : (fn?.delay ?? 0);
      engine.events = engine.events.filter((e) => e.key !== key);
      const fire = engine.time + delay;
      engine.events.push({ t: fire, key, v });
      if (fire <= engine.time) scheduledNow = true;
    }
    if (!scheduledNow && !engine.events.some((e) => e.t <= engine.time)) {
      stable = !engine.events.length;
      break;
    }
  }
  return { iterations, stable };
}

export function captureWave(engine: TimedEngine, keys: string[]) {
  const vals: Record<string, Val> = {};
  for (const k of keys) vals[k] = engine.last.nodeOut.get(k) ?? engine.last.nodeIn.get(k) ?? "X";
  engine.wave.push({ t: engine.time, vals });
  if (engine.wave.length > WAVE_CAP) engine.wave.splice(0, engine.wave.length - WAVE_CAP);
}

export function settle(
  circuit: Circuit,
  defs: CustomDef[],
  engine: TimedEngine,
  sources: Map<string, Val>,
  mode: TimingMode,
  watchKeys: string[],
) {
  const { iterations, stable } = drain(engine, sources, mode);
  engine.last = packSimResult(circuit, defs, engine.net, new Map(engine.values), iterations, stable, engine.time, engine.lastChange);
  captureWave(engine, watchKeys);
  return engine.last;
}

export function stepTime(
  circuit: Circuit,
  defs: CustomDef[],
  engine: TimedEngine,
  sources: Map<string, Val>,
  mode: TimingMode,
  watchKeys: string[],
) {
  engine.time += 1;
  return settle(circuit, defs, engine, sources, mode, watchKeys);
}

export function pokeNow(
  circuit: Circuit,
  defs: CustomDef[],
  engine: TimedEngine,
  sources: Map<string, Val>,
  mode: TimingMode,
  watchKeys: string[],
) {
  return settle(circuit, defs, engine, sources, mode, watchKeys);
}

export function resetEngine(
  circuit: Circuit,
  defs: CustomDef[],
  engine: TimedEngine,
  sources: Map<string, Val>,
  mode: TimingMode,
  watchKeys: string[],
) {
  const fresh = createEngine(circuit, defs);
  engine.net = fresh.net;
  engine.values = fresh.values;
  engine.seq = fresh.seq;
  engine.events = [];
  engine.time = 0;
  engine.wave = [];
  engine.lastChange = new Map();
  return settle(circuit, defs, engine, sources, mode, watchKeys);
}

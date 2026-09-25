import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { K as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as AlignHorizontalSpaceAround, C as Copy, D as CircleX, E as Circle, O as CircleDot, S as EyeOff, T as ClipboardPaste, _ as Maximize2, b as LockOpen, c as SkipForward, d as Redo2, f as Play, g as MousePointer2, h as PanelLeft, i as Undo2, j as Activity, k as AlignVerticalSpaceAround, l as Scissors, m as PanelRight, n as ZoomOut, o as Trash2, p as Pause, r as Waypoints, s as Spline, t as ZoomIn, u as RotateCw, v as Magnet, w as CopyPlus, x as Eye, y as Lock } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CHRrDzbU.js
var routes_CHRrDzbU_exports = /* @__PURE__ */ __exportAll({
	component: () => Home,
	i: () => emitVhdl,
	n: () => downloadText,
	r: () => emitVerilog,
	t: () => downloadJson
});
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var letters = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
var GATE_INFO = {
	AND: {
		expr: (a) => a.join(" · "),
		minIn: 2,
		maxIn: 8,
		desc: "HIGH only when every input is HIGH."
	},
	OR: {
		expr: (a) => a.join(" + "),
		minIn: 2,
		maxIn: 8,
		desc: "HIGH when at least one input is HIGH."
	},
	NOT: {
		expr: (a) => `¬${a[0] ?? "A"}`,
		minIn: 1,
		maxIn: 1,
		desc: "Inverts the input signal."
	},
	NAND: {
		expr: (a) => `¬(${a.join(" · ")})`,
		minIn: 2,
		maxIn: 8,
		desc: "Inverted AND. LOW only when all inputs HIGH."
	},
	NOR: {
		expr: (a) => `¬(${a.join(" + ")})`,
		minIn: 2,
		maxIn: 8,
		desc: "Inverted OR. HIGH only when all inputs LOW."
	},
	XOR: {
		expr: (a) => a.join(" ⊕ "),
		minIn: 2,
		maxIn: 8,
		desc: "HIGH when an odd number of inputs are HIGH."
	},
	XNOR: {
		expr: (a) => `¬(${a.join(" ⊕ ")})`,
		minIn: 2,
		maxIn: 8,
		desc: "HIGH when an even number of inputs are HIGH."
	},
	BUFFER: {
		expr: (a) => `${a[0] ?? "A"}`,
		minIn: 1,
		maxIn: 1,
		desc: "Passes the signal through unchanged."
	}
};
var gateSpec = (type) => ({
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
	outs: () => ["Y"]
});
var CATALOG = {
	AND: gateSpec("AND"),
	OR: gateSpec("OR"),
	NOT: gateSpec("NOT"),
	NAND: gateSpec("NAND"),
	NOR: gateSpec("NOR"),
	XOR: gateSpec("XOR"),
	XNOR: gateSpec("XNOR"),
	BUFFER: gateSpec("BUFFER"),
	INPUT: {
		type: "INPUT",
		group: "io",
		name: "Switch",
		hint: "Toggleable HIGH / LOW source",
		defaultDelay: 0,
		minIn: 0,
		maxIn: 0,
		defaultInputs: 0,
		ins: () => [],
		outs: () => ["Y"]
	},
	CLOCK: {
		type: "CLOCK",
		group: "io",
		name: "Clock",
		hint: "Free-running square wave in its domain",
		defaultDelay: 0,
		minIn: 0,
		maxIn: 0,
		defaultInputs: 0,
		ins: () => [],
		outs: () => ["CLK"]
	},
	OUTPUT: {
		type: "OUTPUT",
		group: "io",
		name: "Probe",
		hint: "Named output / indicator",
		defaultDelay: 0,
		minIn: 1,
		maxIn: 1,
		defaultInputs: 1,
		ins: () => ["D"],
		outs: () => []
	},
	LED: {
		type: "LED",
		group: "io",
		name: "LED",
		hint: "Glows when the input is HIGH",
		defaultDelay: 0,
		minIn: 1,
		maxIn: 1,
		defaultInputs: 1,
		ins: () => ["D"],
		outs: () => []
	},
	VCC: {
		type: "VCC",
		group: "io",
		name: "VCC",
		hint: "Tied HIGH (logic 1)",
		defaultDelay: 0,
		minIn: 0,
		maxIn: 0,
		defaultInputs: 0,
		ins: () => [],
		outs: () => ["1"]
	},
	GND: {
		type: "GND",
		group: "io",
		name: "GND",
		hint: "Tied LOW (logic 0)",
		defaultDelay: 0,
		minIn: 0,
		maxIn: 0,
		defaultInputs: 0,
		ins: () => [],
		outs: () => ["0"]
	},
	TRI: {
		type: "TRI",
		group: "bus",
		name: "Tri-buf",
		hint: "Passes D when OE is HIGH, otherwise Hi-Z",
		defaultDelay: 1,
		minIn: 2,
		maxIn: 2,
		defaultInputs: 2,
		ins: () => ["D", "OE"],
		outs: () => ["Y"]
	},
	BUS: {
		type: "BUS",
		group: "bus",
		name: "Bus",
		hint: "Resolves multiple drivers (0/1/Z/X contention)",
		defaultDelay: 0,
		minIn: 2,
		maxIn: 8,
		variableFanin: true,
		defaultInputs: 2,
		ins: (n) => Array.from({ length: Math.max(2, n.inputs || 2) }, (_, i) => `D${i}`),
		outs: () => ["Y"]
	},
	PULLUP: {
		type: "PULLUP",
		group: "bus",
		name: "Pull-up",
		hint: "Weak HIGH: Z becomes 1",
		defaultDelay: 0,
		minIn: 1,
		maxIn: 1,
		defaultInputs: 1,
		ins: () => ["D"],
		outs: () => ["Y"]
	},
	PULLDOWN: {
		type: "PULLDOWN",
		group: "bus",
		name: "Pull-down",
		hint: "Weak LOW: Z becomes 0",
		defaultDelay: 0,
		minIn: 1,
		maxIn: 1,
		defaultInputs: 1,
		ins: () => ["D"],
		outs: () => ["Y"]
	},
	DFF: {
		type: "DFF",
		group: "seq",
		name: "DFF",
		hint: "Positive-edge D flip-flop with async reset",
		defaultDelay: 1,
		minIn: 3,
		maxIn: 3,
		defaultInputs: 3,
		ins: () => [
			"D",
			"CLK",
			"RST"
		],
		outs: () => ["Q", "Qn"]
	},
	DLATCH: {
		type: "DLATCH",
		group: "seq",
		name: "Latch",
		hint: "Level-sensitive D latch (transparent when EN)",
		defaultDelay: 1,
		minIn: 2,
		maxIn: 2,
		defaultInputs: 2,
		ins: () => ["D", "EN"],
		outs: () => ["Q", "Qn"]
	},
	TFF: {
		type: "TFF",
		group: "seq",
		name: "TFF",
		hint: "Toggle flip-flop. T=1 flips Q on rising CLK",
		defaultDelay: 1,
		minIn: 3,
		maxIn: 3,
		defaultInputs: 3,
		ins: () => [
			"T",
			"CLK",
			"RST"
		],
		outs: () => ["Q", "Qn"]
	},
	JKFF: {
		type: "JKFF",
		group: "seq",
		name: "JKFF",
		hint: "JK flip-flop with async reset",
		defaultDelay: 1,
		minIn: 4,
		maxIn: 4,
		defaultInputs: 4,
		ins: () => [
			"J",
			"K",
			"CLK",
			"RST"
		],
		outs: () => ["Q", "Qn"]
	},
	COUNTER: {
		type: "COUNTER",
		group: "seq",
		name: "Counter",
		hint: "Binary up-counter, rising CLK, async RST",
		defaultDelay: 1,
		minIn: 2,
		maxIn: 2,
		defaultInputs: 2,
		ins: () => ["CLK", "RST"],
		outs: (n) => Array.from({ length: Math.min(8, Math.max(2, n.bits ?? 4)) }, (_, i) => `Q${i}`)
	},
	MUX2: {
		type: "MUX2",
		group: "combo",
		name: "MUX 2:1",
		hint: "Selects I0 or I1 from S",
		defaultDelay: 1,
		minIn: 3,
		maxIn: 3,
		defaultInputs: 3,
		ins: () => [
			"I0",
			"I1",
			"S"
		],
		outs: () => ["Y"]
	},
	MUX4: {
		type: "MUX4",
		group: "combo",
		name: "MUX 4:1",
		hint: "Four-input mux, S1 S0 select",
		defaultDelay: 1,
		minIn: 6,
		maxIn: 6,
		defaultInputs: 6,
		ins: () => [
			"I0",
			"I1",
			"I2",
			"I3",
			"S0",
			"S1"
		],
		outs: () => ["Y"]
	},
	DEC2: {
		type: "DEC2",
		group: "combo",
		name: "DEC 2:4",
		hint: "One-hot decoder",
		defaultDelay: 1,
		minIn: 2,
		maxIn: 2,
		defaultInputs: 2,
		ins: () => ["A", "B"],
		outs: () => [
			"Y0",
			"Y1",
			"Y2",
			"Y3"
		]
	},
	ADDER: {
		type: "ADDER",
		group: "combo",
		name: "Adder",
		hint: "Full adder: S = A ⊕ B ⊕ Cin",
		defaultDelay: 1,
		minIn: 3,
		maxIn: 3,
		defaultInputs: 3,
		ins: () => [
			"A",
			"B",
			"Cin"
		],
		outs: () => ["S", "Cout"]
	},
	DELAY: {
		type: "DELAY",
		group: "timing",
		name: "Delay",
		hint: "Buffer with a longer propagation delay",
		defaultDelay: 4,
		minIn: 1,
		maxIn: 1,
		defaultInputs: 1,
		ins: () => ["D"],
		outs: () => ["Y"]
	}
};
var GROUP_LABEL = {
	gates: "Logic gates",
	io: "I / O",
	seq: "Sequential",
	combo: "Combinational",
	bus: "Tri-state / bus",
	timing: "Timing"
};
var isGate = (t) => t in GATE_INFO;
var isSequential = (t) => t === "DFF" || t === "DLATCH" || t === "TFF" || t === "JKFF" || t === "COUNTER";
function specOf(n, defs) {
	if (n.type === "CUSTOM") {
		const d = defs.find((x) => x.id === n.defId);
		return {
			ins: d ? d.inputs.map((_, i) => `IN${i}`) : [],
			outs: d ? d.outputs.map((_, i) => `OUT${i}`) : []
		};
	}
	const s = CATALOG[n.type];
	return {
		ins: s.ins(n),
		outs: s.outs(n)
	};
}
function portCounts(n, defs) {
	const s = specOf(n, defs);
	return {
		ins: s.ins.length,
		outs: s.outs.length
	};
}
function nodeTitle(n, defs) {
	if (n.label) return n.label;
	if (n.type === "CUSTOM") return defs.find((d) => d.id === n.defId)?.name ?? "BLOCK";
	return CATALOG[n.type]?.name ?? n.type;
}
function nodeDelay(n) {
	if (n.delay != null) return Math.max(0, Math.round(n.delay));
	if (n.type === "CUSTOM") return 0;
	return CATALOG[n.type]?.defaultDelay ?? 1;
}
function resolveBus(vals) {
	const driven = vals.filter((v) => v !== "Z");
	if (!driven.length) return "Z";
	if (driven.some((v) => v === "X")) return "X";
	const first = driven[0];
	return driven.every((v) => v === first) ? first : "X";
}
function notVal(v) {
	if (v === 1) return 0;
	if (v === 0) return 1;
	return "X";
}
function as01X(v) {
	return v === "Z" ? "X" : v;
}
function evalGate(type, ins) {
	const xs = ins.map(as01X);
	const hasX = xs.some((v) => v === "X");
	const ones = xs.filter((v) => v === 1).length;
	switch (type) {
		case "AND": return xs.some((v) => v === 0) ? 0 : hasX ? "X" : 1;
		case "NAND": return xs.some((v) => v === 0) ? 1 : hasX ? "X" : 0;
		case "OR": return xs.some((v) => v === 1) ? 1 : hasX ? "X" : 0;
		case "NOR": return xs.some((v) => v === 1) ? 0 : hasX ? "X" : 1;
		case "XOR": return hasX ? "X" : ones % 2;
		case "XNOR": return hasX ? "X" : (ones + 1) % 2;
		case "NOT": return xs[0] === "X" || xs[0] === void 0 ? "X" : xs[0] === 1 ? 0 : 1;
		case "BUFFER": return xs[0] === void 0 ? "X" : xs[0];
	}
}
function bitOf(n, i) {
	return n >> i & 1;
}
function q01(cell) {
	if (!cell) return 0;
	if (cell.q === 0 || cell.q === 1) return cell.q;
	return "X";
}
function rising(prev, clk) {
	return prev === 0 && clk === 1;
}
function evalPrimitive(kind, ins, seq, opts) {
	const hold = seq ?? {
		q: 0,
		prevClk: 0
	};
	if (kind === "SOURCE") return { outs: [opts.srcVal ?? 0] };
	if (kind === "VCC") return { outs: [opts.constVal ?? 1] };
	if (kind === "GND") return { outs: [0] };
	if (isGate(kind)) return { outs: [evalGate(kind, ins)] };
	if (kind === "BUFFER" || kind === "DELAY" || kind === "OUTPUT" || kind === "LED") return { outs: [as01X(ins[0] ?? "X")] };
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
		return { outs: [ins[(s0 === 1 ? 1 : 0) + (s1 === 1 ? 2 : 0)] ?? "X"] };
	}
	if (kind === "DEC2") {
		const a = as01X(ins[0] ?? "X");
		const b = as01X(ins[1] ?? "X");
		if (a === "X" || b === "X") return { outs: [
			"X",
			"X",
			"X",
			"X"
		] };
		const idx = (a === 1 ? 1 : 0) + (b === 1 ? 2 : 0);
		return { outs: [
			0,
			1,
			2,
			3
		].map((i) => i === idx ? 1 : 0) };
	}
	if (kind === "ADDER") {
		const a = as01X(ins[0] ?? "X");
		const b = as01X(ins[1] ?? "X");
		const c = as01X(ins[2] ?? 0);
		if (a === "X" || b === "X" || c === "X") return { outs: ["X", "X"] };
		const sum = a + b + c;
		return { outs: [sum & 1, sum >> 1] };
	}
	if (kind === "DLATCH") {
		const d = as01X(ins[0] ?? "X");
		const en = as01X(ins[1] ?? 0);
		let q = q01(hold);
		if (en === 1) q = d;
		const next = {
			q: q === 1 ? 1 : q === 0 ? 0 : 2,
			prevClk: en
		};
		return {
			outs: [q, notVal(q)],
			seq: next
		};
	}
	if (kind === "DFF" || kind === "TFF" || kind === "JKFF" || kind === "COUNTER") {
		const bits = kind === "COUNTER" ? Math.min(8, Math.max(2, opts.bits ?? 4)) : 1;
		const clk = kind === "COUNTER" ? as01X(ins[0] ?? 0) : as01X(ins[kind === "JKFF" ? 2 : 1] ?? 0);
		const rst = kind === "COUNTER" ? as01X(ins[1] ?? 0) : kind === "JKFF" ? as01X(ins[3] ?? 0) : as01X(ins[2] ?? 0);
		const edge = rising(hold.prevClk, clk);
		let qn = hold.q || 0;
		if (rst === 1) qn = 0;
		else if (edge) {
			if (kind === "DFF") {
				const d = as01X(ins[0] ?? "X");
				qn = d === 1 ? 1 : d === 0 ? 0 : qn;
			} else if (kind === "TFF") {
				if (as01X(ins[0] ?? 0) === 1) qn = qn ? 0 : 1;
			} else if (kind === "JKFF") {
				const j = as01X(ins[0] ?? 0);
				const k = as01X(ins[1] ?? 0);
				const q = qn & 1;
				if (j === 1 && k === 1) qn = q ? 0 : 1;
				else if (j === 1) qn = 1;
				else if (k === 1) qn = 0;
			} else {
				const mask = (1 << bits) - 1;
				qn = qn + 1 & mask;
			}
		}
		const next = {
			q: qn,
			prevClk: clk
		};
		if (kind === "COUNTER") {
			const outs = [];
			for (let i = 0; i < bits; i++) outs.push(bitOf(qn, i));
			return {
				outs,
				seq: next
			};
		}
		const qv = qn & 1 ? 1 : 0;
		return {
			outs: [qv, notVal(qv)],
			seq: next
		};
	}
	return { outs: ["X"] };
}
function clockAt(time, period = 12) {
	const half = Math.max(2, period) / 2;
	return Math.floor(time / half) % 2 === 0 ? 0 : 1;
}
function floatDefault(kind, port) {
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
function portKey(n, dir, p) {
	return `${n}:${dir}:${p}`;
}
var outKey = (node, port) => portKey(node, "out", port);
var inKey = (node, port) => portKey(node, "in", port);
var valKey = (id, port) => `${id}:${port}`;
function flatten(circuit, defs) {
	const nodes = /* @__PURE__ */ new Map();
	const outAlias = /* @__PURE__ */ new Map();
	const inAlias = /* @__PURE__ */ new Map();
	const build = (c, prefix, isTop) => {
		const sinkOf = /* @__PURE__ */ new Map();
		const sourceOf = /* @__PURE__ */ new Map();
		const setSrc = (flatId, port, srcKey) => {
			const fn = nodes.get(flatId);
			if (fn && port < fn.ins.length) fn.ins[port] = srcKey;
		};
		for (const n of c.nodes) {
			const fid = prefix + n.id;
			if (n.type === "CUSTOM") {
				const def = defs.find((d) => d.id === n.defId);
				if (!def) continue;
				build({
					nodes: def.nodes,
					wires: def.wires
				}, fid + "/", false);
				def.inputs.forEach((inId, i) => {
					const innerFlat = fid + "/" + inId;
					if (!nodes.has(innerFlat)) nodes.set(innerFlat, {
						id: innerFlat,
						kind: "BUFFER",
						ins: [null],
						outCount: 1,
						delay: 0,
						topId: isTop ? n.id : void 0
					});
					sinkOf.set(portKey(n.id, "in", i), {
						id: innerFlat,
						port: 0
					});
				});
				def.outputs.forEach((outId, j) => {
					const innerFlat = fid + "/" + outId;
					if (!nodes.has(innerFlat)) nodes.set(innerFlat, {
						id: innerFlat,
						kind: "BUFFER",
						ins: [null],
						outCount: 1,
						delay: 0
					});
					sourceOf.set(portKey(n.id, "out", j), valKey(innerFlat, 0));
				});
				continue;
			}
			if (n.type === "INPUT" || n.type === "CLOCK") {
				if (isTop) nodes.set(fid, {
					id: fid,
					kind: "SOURCE",
					ins: [],
					outCount: 1,
					delay: 0,
					src: n.type === "INPUT" ? n.id : void 0,
					isClock: n.type === "CLOCK",
					period: n.period,
					domain: n.domain,
					topId: n.id
				});
				else nodes.set(fid, {
					id: fid,
					kind: "BUFFER",
					ins: [null],
					outCount: 1,
					delay: 0
				});
				sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
				continue;
			}
			if (n.type === "VCC" || n.type === "GND") {
				nodes.set(fid, {
					id: fid,
					kind: n.type,
					ins: [],
					outCount: 1,
					delay: 0,
					constVal: n.type === "VCC" ? 1 : 0,
					topId: isTop ? n.id : void 0
				});
				sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
				continue;
			}
			const names = specOf(n, defs);
			const kind = n.type === "OUTPUT" || n.type === "LED" ? "BUFFER" : n.type;
			nodes.set(fid, {
				id: fid,
				kind,
				ins: new Array(names.ins.length).fill(null),
				outCount: Math.max(1, names.outs.length),
				delay: nodeDelay(n),
				bits: n.bits,
				topId: isTop ? n.id : void 0,
				domain: n.domain
			});
			names.ins.forEach((_, i) => sinkOf.set(portKey(n.id, "in", i), {
				id: fid,
				port: i
			}));
			names.outs.forEach((_, j) => sourceOf.set(portKey(n.id, "out", j), valKey(fid, j)));
			if (n.type === "OUTPUT" || n.type === "LED") sourceOf.set(portKey(n.id, "out", 0), valKey(fid, 0));
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
	return {
		nodes,
		outAlias,
		inAlias
	};
}
function emptySim() {
	return {
		values: /* @__PURE__ */ new Map(),
		wireValues: /* @__PURE__ */ new Map(),
		nodeOut: /* @__PURE__ */ new Map(),
		nodeIn: /* @__PURE__ */ new Map(),
		stable: true,
		iterations: 0,
		floating: [],
		contention: [],
		time: 0,
		transitions: /* @__PURE__ */ new Map()
	};
}
function packSimResult(circuit, defs, net, values, iterations, stable, time, lastChange) {
	const nodeOut = /* @__PURE__ */ new Map();
	for (const [k, flat] of net.outAlias) {
		nodeOut.set(k, flat ? values.get(flat) ?? "X" : "X");
		const nodeId = k.split(":")[0];
		if (k.endsWith(":out:0") || !nodeOut.has(nodeId)) nodeOut.set(nodeId, flat ? values.get(flat) ?? "X" : "X");
	}
	const transitions = /* @__PURE__ */ new Map();
	if (lastChange) for (const [k, flat] of net.outAlias) {
		const t = flat ? lastChange.get(flat) : void 0;
		if (t === void 0) continue;
		transitions.set(k, t);
		const nodeId = k.split(":")[0];
		if (k.endsWith(":out:0") || !transitions.has(nodeId)) transitions.set(nodeId, t);
	}
	const wireValues = /* @__PURE__ */ new Map();
	for (const w of circuit.wires) wireValues.set(w.id, nodeOut.get(outKey(w.from.node, w.from.port)) ?? "X");
	const nodeIn = /* @__PURE__ */ new Map();
	const floating = [];
	for (const n of circuit.nodes) {
		const { ins } = portCounts(n, defs);
		for (let i = 0; i < ins; i++) {
			const w = circuit.wires.find((x) => x.to.node === n.id && x.to.port === i);
			const v = w ? wireValues.get(w.id) ?? "X" : "X";
			nodeIn.set(inKey(n.id, i), v);
			if (!w) floating.push(inKey(n.id, i));
		}
	}
	const contention = [];
	for (const n of circuit.nodes) {
		if (n.type !== "BUS") continue;
		if (nodeOut.get(outKey(n.id, 0)) === "X") contention.push(n.id);
	}
	return {
		values,
		wireValues,
		nodeOut,
		nodeIn,
		stable,
		iterations,
		floating,
		contention,
		time,
		transitions
	};
}
function simulate(circuit, defs, sourceValues, seq, time = 0) {
	const net = flatten(circuit, defs);
	const values = /* @__PURE__ */ new Map();
	const seqMap = seq ?? /* @__PURE__ */ new Map();
	for (const fn of net.nodes.values()) for (let p = 0; p < fn.outCount; p++) values.set(valKey(fn.id, p), fn.kind === "VCC" ? 1 : fn.kind === "GND" ? 0 : "X");
	let stable = false;
	let iterations = 0;
	const MAX = 120;
	while (iterations < MAX) {
		iterations++;
		let changed = false;
		for (const fn of net.nodes.values()) {
			const ins = fn.ins.map((s, i) => s == null ? floatDefault(fn.kind, i) : values.get(s) ?? "X");
			let srcVal;
			if (fn.kind === "SOURCE") srcVal = fn.isClock ? clockAt(time, fn.period ?? 12) : sourceValues.get(fn.src) ?? 0;
			const cell = seqMap.get(fn.id);
			const { outs, seq: next } = evalPrimitive(fn.kind, ins, cell, {
				constVal: fn.constVal,
				bits: fn.bits,
				srcVal
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
function gateTruthTable(type, nIn) {
	const rows = [];
	const n = Math.min(nIn, 4);
	for (let m = 0; m < 1 << n; m++) {
		const ins = [];
		for (let i = n - 1; i >= 0; i--) ins.push(m >> i & 1);
		rows.push({
			ins,
			out: evalGate(type, ins)
		});
	}
	return rows;
}
function circuitTruthTable(circuit, defs) {
	const switches = circuit.nodes.filter((n) => n.type === "INPUT");
	const probes = circuit.nodes.filter((n) => n.type === "OUTPUT" || n.type === "LED");
	if (!switches.length || !probes.length || switches.length > 8) return null;
	const rows = [];
	const n = switches.length;
	for (let m = 0; m < 1 << n; m++) {
		const sv = /* @__PURE__ */ new Map();
		const ins = [];
		switches.forEach((s, i) => {
			const bit = m >> n - 1 - i & 1;
			ins.push(bit);
			sv.set(s.id, bit);
		});
		const r = simulate(circuit, defs, sv);
		rows.push({
			ins,
			outs: probes.map((p) => r.nodeIn.get(inKey(p.id, 0)) ?? "X")
		});
	}
	return {
		switches,
		probes,
		rows
	};
}
function topologyKey(doc) {
	return [
		doc.nodes.map((n) => `${n.id}:${n.type}:${n.inputs}:${n.defId ?? ""}:${n.bits ?? ""}:${n.delay ?? ""}:${n.period ?? ""}`).join("|"),
		doc.wires.map((w) => `${w.from.node}.${w.from.port}>${w.to.node}.${w.to.port}`).join("|"),
		doc.defs.map((d) => d.id).join(",")
	].join("~");
}
var idc = 0;
var uid = (p = "n") => `${p}${Date.now().toString(36).slice(-5)}${(idc++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;
var snap = (v) => Math.round(v / 20) * 20;
function nodeSize(n, defs) {
	const { ins, outs } = portCounts(n, defs);
	if (n.type === "VCC" || n.type === "GND") return {
		w: 56,
		h: 40
	};
	if (n.type === "LED") return {
		w: 64,
		h: 64
	};
	if (n.type === "INPUT" || n.type === "OUTPUT" || n.type === "CLOCK") return {
		w: 80,
		h: 50
	};
	const rows = Math.max(ins, outs, 1);
	return {
		w: n.type === "CUSTOM" ? 118 : n.type === "COUNTER" || n.type === "MUX4" ? 108 : 96,
		h: Math.max(56, 26 + rows * 20)
	};
}
function localPort(n, defs, dir, i) {
	const { w, h } = nodeSize(n, defs);
	const { ins, outs } = portCounts(n, defs);
	const count = dir === "in" ? ins : outs;
	const y = count <= 1 ? h / 2 : 16 + (h - 28) * i / Math.max(1, count - 1);
	return {
		x: dir === "in" ? 0 : w,
		y
	};
}
function portPos(n, defs, dir, i) {
	const { w, h } = nodeSize(n, defs);
	const p = localPort(n, defs, dir, i);
	const cx = w / 2;
	const cy = h / 2;
	const a = n.rot * Math.PI / 180;
	const dx = p.x - cx;
	const dy = p.y - cy;
	return {
		x: n.x + cx + (dx * Math.cos(a) - dy * Math.sin(a)),
		y: n.y + cy + (dx * Math.sin(a) + dy * Math.cos(a))
	};
}
function portDir(n, dir) {
	const base = dir === "in" ? -1 : 1;
	const a = n.rot * Math.PI / 180;
	return {
		x: base * Math.cos(a),
		y: base * Math.sin(a)
	};
}
function ident(raw) {
	let t = raw.replace(/[^A-Za-z0-9_]/g, "_");
	if (!t) t = "n";
	if (/^[0-9]/.test(t)) t = "n_" + t;
	return t;
}
function uniq(base, used) {
	let s = ident(base);
	let i = 2;
	while (used.has(s)) s = `${ident(base)}_${i++}`;
	used.add(s);
	return s;
}
function netId(nodeId, port, used, cache, hint) {
	const k = `${nodeId}:${port}`;
	const hit = cache.get(k);
	if (hit) return hit;
	const name = uniq(hint, used);
	cache.set(k, name);
	return name;
}
function emitVerilog(doc) {
	const { nodes, wires, defs } = doc;
	const used = /* @__PURE__ */ new Set([
		"module",
		"input",
		"output",
		"wire",
		"assign",
		"always",
		"begin",
		"end",
		"posedge"
	]);
	const cache = /* @__PURE__ */ new Map();
	const title = (nId) => {
		const n = nodes.find((x) => x.id === nId);
		return n ? nodeTitle(n, defs) : nId;
	};
	const inputs = nodes.filter((n) => n.type === "INPUT" || n.type === "CLOCK");
	const outputs = nodes.filter((n) => n.type === "OUTPUT" || n.type === "LED");
	for (const n of nodes) {
		specOf(n, defs).outs.forEach((nm, i) => netId(n.id, i, used, cache, `${title(n.id)}_${nm}`));
		if (n.type === "INPUT" || n.type === "CLOCK") netId(n.id, 0, used, cache, title(n.id));
	}
	const inPorts = inputs.map((n) => netId(n.id, 0, used, cache, title(n.id)));
	const outPorts = outputs.map((n) => {
		const nm = uniq(title(n.id) + "_o", used);
		cache.set(`probe:${n.id}`, nm);
		return nm;
	});
	const portList = [...inPorts.map((p) => `  input  ${p}`), ...outPorts.map((p) => `  output ${p}`)].join(",\n");
	const lines = [];
	const mod = ident(doc.name || "LogicForge");
	lines.push(`// Generated by LogicForge`);
	lines.push(`module ${mod} (`);
	lines.push(portList || "  // no ports");
	lines.push(");");
	lines.push("");
	const driven = new Set(inPorts);
	for (const n of nodes) {
		const sp = specOf(n, defs);
		for (let i = 0; i < sp.outs.length; i++) {
			const nm = netId(n.id, i, used, cache, `${title(n.id)}_${sp.outs[i]}`);
			if (!driven.has(nm) && !inPorts.includes(nm)) {
				lines.push(`  wire ${nm};`);
				driven.add(nm);
			}
		}
	}
	lines.push("");
	const srcOf = (node, port) => {
		const w = wires.find((x) => x.to.node === node && x.to.port === port);
		if (!w) return "1'bx";
		return netId(w.from.node, w.from.port, used, cache, title(w.from.node));
	};
	for (const n of nodes) {
		const sp = specOf(n, defs);
		const y = (i = 0) => netId(n.id, i, used, cache, `${title(n.id)}_${sp.outs[i] ?? "Y"}`);
		const a = (i) => srcOf(n.id, i);
		if (n.type === "INPUT" || n.type === "CLOCK") continue;
		if (n.type === "VCC") {
			lines.push(`  assign ${y()} = 1'b1;`);
			continue;
		}
		if (n.type === "GND") {
			lines.push(`  assign ${y()} = 1'b0;`);
			continue;
		}
		if (n.type === "OUTPUT" || n.type === "LED") {
			const p = cache.get(`probe:${n.id}`);
			if (p) lines.push(`  assign ${p} = ${a(0)};`);
			continue;
		}
		if (isGate(n.type) || n.type === "DELAY") {
			const ins = sp.ins.map((_, i) => a(i));
			const expr = n.type === "AND" || n.type === "NAND" ? ins.join(" & ") : n.type === "OR" || n.type === "NOR" ? ins.join(" | ") : n.type === "XOR" || n.type === "XNOR" ? ins.join(" ^ ") : ins[0] ?? "1'bx";
			const wrap = n.type === "NAND" || n.type === "NOR" || n.type === "XNOR" || n.type === "NOT" ? `~(${expr})` : expr;
			lines.push(`  assign ${y()} = ${wrap};`);
			continue;
		}
		if (n.type === "TRI") {
			lines.push(`  assign ${y()} = ${a(1)} ? ${a(0)} : 1'bz;`);
			continue;
		}
		if (n.type === "BUS") {
			lines.push(`  assign ${y()} = ${sp.ins.map((_, i) => a(i)).join(" | ")};`);
			continue;
		}
		if (n.type === "PULLUP") {
			lines.push(`  assign ${y()} = ${a(0)};`);
			continue;
		}
		if (n.type === "PULLDOWN") {
			lines.push(`  assign ${y()} = ${a(0)};`);
			continue;
		}
		if (n.type === "MUX2") {
			lines.push(`  assign ${y()} = ${a(2)} ? ${a(1)} : ${a(0)};`);
			continue;
		}
		if (n.type === "MUX4") {
			lines.push(`  assign ${y()} = ({${a(5)},${a(4)}} == 2'b00) ? ${a(0)} : ({${a(5)},${a(4)}} == 2'b01) ? ${a(1)} : ({${a(5)},${a(4)}} == 2'b10) ? ${a(2)} : ${a(3)};`);
			continue;
		}
		if (n.type === "DEC2") {
			for (let i = 0; i < 4; i++) {
				const aa = i & 1 ? a(0) : `~${a(0)}`;
				const bb = i & 2 ? a(1) : `~${a(1)}`;
				lines.push(`  assign ${y(i)} = ${aa} & ${bb};`);
			}
			continue;
		}
		if (n.type === "ADDER") {
			lines.push(`  assign ${y(0)} = ${a(0)} ^ ${a(1)} ^ ${a(2)};`);
			lines.push(`  assign ${y(1)} = (${a(0)} & ${a(1)}) | (${a(2)} & (${a(0)} ^ ${a(1)}));`);
			continue;
		}
		if (n.type === "DFF") {
			lines.push(`  always @(posedge ${a(1)} or posedge ${a(2)}) begin`);
			lines.push(`    if (${a(2)}) ${y(0)} <= 1'b0; else ${y(0)} <= ${a(0)};`);
			lines.push(`  end`);
			lines.push(`  assign ${y(1)} = ~${y(0)};`);
			continue;
		}
		if (n.type === "TFF") {
			lines.push(`  always @(posedge ${a(1)} or posedge ${a(2)}) begin`);
			lines.push(`    if (${a(2)}) ${y(0)} <= 1'b0; else if (${a(0)}) ${y(0)} <= ~${y(0)};`);
			lines.push(`  end`);
			lines.push(`  assign ${y(1)} = ~${y(0)};`);
			continue;
		}
		if (n.type === "JKFF") {
			lines.push(`  always @(posedge ${a(2)} or posedge ${a(3)}) begin`);
			lines.push(`    if (${a(3)}) ${y(0)} <= 1'b0;`);
			lines.push(`    else case ({${a(0)}, ${a(1)}})`);
			lines.push(`      2'b10: ${y(0)} <= 1'b1; 2'b01: ${y(0)} <= 1'b0; 2'b11: ${y(0)} <= ~${y(0)};`);
			lines.push(`    endcase`);
			lines.push(`  end`);
			lines.push(`  assign ${y(1)} = ~${y(0)};`);
			continue;
		}
		if (n.type === "DLATCH") {
			lines.push(`  always @(*) if (${a(1)}) ${y(0)} = ${a(0)};`);
			lines.push(`  assign ${y(1)} = ~${y(0)};`);
			continue;
		}
		if (n.type === "COUNTER") {
			const bits = Math.min(8, Math.max(2, n.bits ?? 4));
			const qn = uniq(title(n.id) + "_reg", used);
			lines.push(`  reg [${bits - 1}:0] ${qn};`);
			lines.push(`  always @(posedge ${a(0)} or posedge ${a(1)}) begin`);
			lines.push(`    if (${a(1)}) ${qn} <= ${bits}'d0; else ${qn} <= ${qn} + 1'b1;`);
			lines.push(`  end`);
			for (let i = 0; i < bits; i++) lines.push(`  assign ${y(i)} = ${qn}[${i}];`);
			continue;
		}
		if (n.type === "CUSTOM") lines.push(`  // hierarchical ${title(n.id)}`);
	}
	if (nodes.some((n) => isSequential(n.type))) lines.splice(5, 0, "  // Sequential Q ports are driven from always blocks.");
	lines.push("");
	lines.push("endmodule");
	lines.push("");
	return lines.join("\n");
}
function emitVhdl(doc) {
	const v = emitVerilog(doc);
	const mod = ident(doc.name || "LogicForge");
	const ins = doc.nodes.filter((n) => n.type === "INPUT" || n.type === "CLOCK");
	const outs = doc.nodes.filter((n) => n.type === "OUTPUT" || n.type === "LED");
	const ports = [...ins.map((n) => `    ${ident(nodeTitle(n, doc.defs))} : in  std_logic`), ...outs.map((n) => `    ${ident(nodeTitle(n, doc.defs))} : out std_logic`)].join(";\n");
	return [
		`-- Generated by LogicForge`,
		`library ieee;`,
		`use ieee.std_logic_1164.all;`,
		`use ieee.numeric_std.all;`,
		``,
		`entity ${mod} is`,
		`  port (`,
		ports || "    -- no ports",
		`  );`,
		`end entity;`,
		``,
		`-- See Verilog companion for the synthesizable netlist.`,
		v.split("\n").map((l) => "-- " + l).join("\n"),
		``,
		`architecture rtl of ${mod} is`,
		`begin`,
		`end architecture;`,
		``
	].join("\n");
}
function downloadText(filename, text, mime = "text/plain") {
	const blob = new Blob([text], { type: mime });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
	URL.revokeObjectURL(a.href);
}
function downloadJson(filename, data) {
	downloadText(filename, JSON.stringify(data, null, 2), "application/json");
}
/**
* Small floating action menu used for right-click (and two-finger-tap, on a
* trackpad) context actions on the canvas. Positioned at a fixed screen
* point and clamped to stay on-screen; a full-viewport transparent overlay
* behind it closes the menu on any outside click or a second right-click.
*/
function ContextMenu({ x, y, items, onClose }) {
	if (!items.length) return null;
	const W = 190;
	const H = items.length * 30 + items.filter((i) => i.divider).length * 9 + 8;
	const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : x + W) - W - 8);
	const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : y + H) - H - 8);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40",
		onPointerDown: (e) => {
			e.stopPropagation();
			onClose();
		},
		onContextMenu: (e) => {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		}
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 text-xs shadow-[var(--shadow)]",
		style: {
			left: Math.max(8, left),
			top: Math.max(8, top),
			width: W
		},
		onContextMenu: (e) => e.preventDefault(),
		onPointerDown: (e) => {
			e.stopPropagation();
		},
		children: items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [it.divider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-1 h-px bg-[var(--border)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			disabled: it.disabled,
			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel2)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
			style: it.danger && !it.disabled ? { color: "var(--xx)" } : void 0,
			onClick: () => {
				it.onSelect();
				onClose();
			},
			children: [it.icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: it.label })]
		})] }, i))
	})] });
}
var n = (partial) => ({
	rot: 0,
	inputs: 0,
	...partial
});
var w = (f, fp, t, tp) => ({
	id: uid("w"),
	from: {
		node: f,
		port: fp
	},
	to: {
		node: t,
		port: tp
	}
});
function emptyDoc() {
	return {
		nodes: [],
		wires: [],
		defs: [],
		name: "Untitled"
	};
}
/** XOR from NAND+OR+AND — the classic first circuit. */
function demoXor() {
	return {
		name: "XOR from gates",
		nodes: [
			n({
				id: "sw_a",
				type: "INPUT",
				label: "A",
				x: 80,
				y: 180,
				value: 1
			}),
			n({
				id: "sw_b",
				type: "INPUT",
				label: "B",
				x: 80,
				y: 300,
				value: 0
			}),
			n({
				id: "g_nand",
				type: "NAND",
				x: 280,
				y: 200,
				inputs: 2
			}),
			n({
				id: "g_or",
				type: "OR",
				x: 280,
				y: 320,
				inputs: 2
			}),
			n({
				id: "g_and",
				type: "AND",
				x: 460,
				y: 250,
				inputs: 2
			}),
			n({
				id: "p_out",
				type: "OUTPUT",
				label: "A ⊕ B",
				x: 640,
				y: 262,
				inputs: 1
			})
		],
		wires: [
			w("sw_a", 0, "g_nand", 0),
			w("sw_b", 0, "g_nand", 1),
			w("sw_a", 0, "g_or", 0),
			w("sw_b", 0, "g_or", 1),
			w("g_nand", 0, "g_and", 0),
			w("g_or", 0, "g_and", 1),
			w("g_and", 0, "p_out", 0)
		],
		defs: []
	};
}
/** Full adder — good truth-table demo. */
function demoAdder() {
	return {
		name: "Full adder",
		nodes: [
			n({
				id: "sw_a",
				type: "INPUT",
				label: "A",
				x: 60,
				y: 140,
				value: 1
			}),
			n({
				id: "sw_b",
				type: "INPUT",
				label: "B",
				x: 60,
				y: 240,
				value: 1
			}),
			n({
				id: "sw_c",
				type: "INPUT",
				label: "Cin",
				x: 60,
				y: 340,
				value: 0
			}),
			n({
				id: "add",
				type: "ADDER",
				x: 280,
				y: 220
			}),
			n({
				id: "p_s",
				type: "OUTPUT",
				label: "Sum",
				x: 500,
				y: 200,
				inputs: 1
			}),
			n({
				id: "p_co",
				type: "OUTPUT",
				label: "Cout",
				x: 500,
				y: 300,
				inputs: 1
			})
		],
		wires: [
			w("sw_a", 0, "add", 0),
			w("sw_b", 0, "add", 1),
			w("sw_c", 0, "add", 2),
			w("add", 0, "p_s", 0),
			w("add", 1, "p_co", 0)
		],
		defs: []
	};
}
/** 2-bit ripple counter — clocks, DFFs, waveform. */
function demoCounter() {
	return {
		name: "Ripple counter",
		nodes: [
			n({
				id: "clk",
				type: "CLOCK",
				label: "CLK",
				x: 60,
				y: 210,
				period: 12,
				domain: "clk"
			}),
			n({
				id: "rst",
				type: "INPUT",
				label: "RST",
				x: 60,
				y: 320,
				value: 0
			}),
			n({
				id: "vcc",
				type: "VCC",
				x: 60,
				y: 110
			}),
			n({
				id: "t0",
				type: "TFF",
				label: "÷2",
				x: 280,
				y: 180
			}),
			n({
				id: "t1",
				type: "TFF",
				label: "÷4",
				x: 500,
				y: 180
			}),
			n({
				id: "p0",
				type: "LED",
				label: "Q0",
				x: 280,
				y: 360,
				inputs: 1,
				watch: true
			}),
			n({
				id: "p1",
				type: "LED",
				label: "Q1",
				x: 500,
				y: 360,
				inputs: 1,
				watch: true
			})
		],
		wires: [
			w("vcc", 0, "t0", 0),
			w("clk", 0, "t0", 1),
			w("rst", 0, "t0", 2),
			w("vcc", 0, "t1", 0),
			w("t0", 0, "t1", 1),
			w("rst", 0, "t1", 2),
			w("t0", 0, "p0", 0),
			w("t1", 0, "p1", 0)
		],
		defs: []
	};
}
/** Two tri-state drivers onto a shared bus. */
function demoBus() {
	return {
		name: "Tri-state bus",
		nodes: [
			n({
				id: "sw_a",
				type: "INPUT",
				label: "A",
				x: 40,
				y: 80,
				value: 1
			}),
			n({
				id: "oe1",
				type: "INPUT",
				label: "OE1",
				x: 40,
				y: 180,
				value: 1
			}),
			n({
				id: "sw_b",
				type: "INPUT",
				label: "B",
				x: 40,
				y: 300,
				value: 0
			}),
			n({
				id: "oe2",
				type: "INPUT",
				label: "OE2",
				x: 40,
				y: 400,
				value: 0
			}),
			n({
				id: "tri1",
				type: "TRI",
				x: 240,
				y: 110
			}),
			n({
				id: "tri2",
				type: "TRI",
				x: 240,
				y: 330
			}),
			n({
				id: "bus",
				type: "BUS",
				x: 460,
				y: 220,
				inputs: 2
			}),
			n({
				id: "pu",
				type: "PULLUP",
				x: 640,
				y: 220
			}),
			n({
				id: "out",
				type: "OUTPUT",
				label: "BUS",
				x: 820,
				y: 232,
				inputs: 1
			})
		],
		wires: [
			w("sw_a", 0, "tri1", 0),
			w("oe1", 0, "tri1", 1),
			w("sw_b", 0, "tri2", 0),
			w("oe2", 0, "tri2", 1),
			w("tri1", 0, "bus", 0),
			w("tri2", 0, "bus", 1),
			w("bus", 0, "pu", 0),
			w("pu", 0, "out", 0)
		],
		defs: []
	};
}
var SAMPLES = [
	{
		id: "xor",
		name: "XOR from gates",
		hint: "NAND · OR · AND",
		build: demoXor
	},
	{
		id: "adder",
		name: "Full adder",
		hint: "A, B, Cin → Sum, Cout",
		build: demoAdder
	},
	{
		id: "counter",
		name: "Ripple counter",
		hint: "Clocked TFFs + LEDs",
		build: demoCounter
	},
	{
		id: "bus",
		name: "Tri-state bus",
		hint: "Contention and pull-up",
		build: demoBus
	}
];
var LS_DOC = "logicforge.doc.v2";
var LS_FILES = "logicforge.projects.v2";
var LS_CURRENT = "logicforge.current.v2";
var LS_PREFS = "logicforge.prefs.v2";
var defaultPrefs = () => ({
	themeId: "blue-dark",
	wireStyle: "ortho",
	snapOn: true,
	wheelZoom: false,
	waveformOpen: true,
	timingMode: "zero",
	leftOpen: true,
	rightOpen: true,
	reduceGlow: false,
	glossy: false
});
function lsGet(key) {
	try {
		if (typeof window === "undefined") return null;
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}
function lsSet(key, v) {
	try {
		if (typeof window === "undefined") return;
		localStorage.setItem(key, v);
	} catch {}
}
function loadPrefs() {
	try {
		const raw = lsGet(LS_PREFS);
		if (raw) return {
			...defaultPrefs(),
			...JSON.parse(raw)
		};
	} catch {}
	return defaultPrefs();
}
function savePrefs(p) {
	lsSet(LS_PREFS, JSON.stringify(p));
}
function readProjects() {
	try {
		const raw = lsGet(LS_FILES);
		if (raw) {
			const list = JSON.parse(raw);
			if (Array.isArray(list)) return list.slice(0, 40);
		}
	} catch {}
	return [];
}
function writeProjects(list) {
	lsSet(LS_FILES, JSON.stringify(list.slice(0, 40)));
}
function defaultInputs(type) {
	if (type === "CUSTOM") return 0;
	return CATALOG[type].defaultInputs;
}
function cloneChunk(d, ids, dx, dy) {
	const map = /* @__PURE__ */ new Map();
	return {
		nodes: d.nodes.filter((n) => ids.includes(n.id)).map((n) => {
			const nid = uid("c");
			map.set(n.id, nid);
			return {
				...n,
				id: nid,
				x: snap(n.x + dx),
				y: snap(n.y + dy)
			};
		}),
		wires: d.wires.filter((w) => map.has(w.from.node) && map.has(w.to.node)).map((w) => ({
			id: uid("w"),
			from: {
				node: map.get(w.from.node),
				port: w.from.port
			},
			to: {
				node: map.get(w.to.node),
				port: w.to.port
			}
		})),
		map
	};
}
function hydrateInitial() {
	const projects = readProjects();
	const currentId = lsGet(LS_CURRENT);
	if (currentId) {
		const hit = projects.find((p) => p.id === currentId);
		if (hit) return {
			doc: hit.doc,
			currentId: hit.id,
			projects
		};
	}
	try {
		const raw = lsGet(LS_DOC);
		if (raw) {
			const d = JSON.parse(raw);
			if (Array.isArray(d.nodes)) {
				const id = uid("f");
				const p = {
					id,
					name: d.name || "Untitled",
					updatedAt: Date.now(),
					doc: {
						...d,
						defs: d.defs ?? [],
						name: d.name || "Untitled"
					}
				};
				return {
					doc: p.doc,
					currentId: id,
					projects: [p, ...projects]
				};
			}
		}
	} catch {}
	if (projects[0]) return {
		doc: projects[0].doc,
		currentId: projects[0].id,
		projects
	};
	const demo = demoXor();
	const id = uid("f");
	return {
		doc: demo,
		currentId: id,
		projects: [{
			id,
			name: demo.name || "XOR from gates",
			updatedAt: Date.now(),
			doc: demo
		}]
	};
}
function useEditor() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [doc, setDoc] = (0, import_react.useState)(emptyDoc);
	const [currentId, setCurrentId] = (0, import_react.useState)("");
	const [projects, setProjects] = (0, import_react.useState)([]);
	const [past, setPast] = (0, import_react.useState)([]);
	const [future, setFuture] = (0, import_react.useState)([]);
	const [selection, setSelection] = (0, import_react.useState)([]);
	const [selectedWires, setSelectedWires] = (0, import_react.useState)([]);
	const [clipRev, setClipRev] = (0, import_react.useState)(0);
	const clip = (0, import_react.useRef)(null);
	const docRef = (0, import_react.useRef)(doc);
	docRef.current = doc;
	const currentRef = (0, import_react.useRef)(currentId);
	currentRef.current = currentId;
	(0, import_react.useEffect)(() => {
		const h = hydrateInitial();
		setDoc(h.doc);
		setCurrentId(h.currentId);
		setProjects(h.projects);
		writeProjects(h.projects);
		lsSet(LS_CURRENT, h.currentId);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const t = setTimeout(() => {
			setProjects((list) => {
				const next = list.map((p) => p.id === currentRef.current ? {
					...p,
					doc: docRef.current,
					name: docRef.current.name || p.name,
					updatedAt: Date.now()
				} : p);
				writeProjects(next);
				lsSet(LS_DOC, JSON.stringify(docRef.current));
				return next;
			});
		}, 450);
		return () => clearTimeout(t);
	}, [doc, ready]);
	const pushHistory = (0, import_react.useCallback)((label = "edit") => {
		setPast((p) => [...p.slice(-80), {
			doc: docRef.current,
			label
		}]);
		setFuture([]);
	}, []);
	const commit = (0, import_react.useCallback)((updater, label = "edit") => {
		setPast((p) => [...p.slice(-80), {
			doc: docRef.current,
			label
		}]);
		setFuture([]);
		setDoc((d) => updater(d));
	}, []);
	const live = (0, import_react.useCallback)((updater) => setDoc((d) => updater(d)), []);
	const undo = (0, import_react.useCallback)(() => {
		setPast((p) => {
			if (!p.length) return p;
			const prev = p[p.length - 1];
			setFuture((f) => [{
				doc: docRef.current,
				label: prev.label
			}, ...f]);
			setDoc(prev.doc);
			return p.slice(0, -1);
		});
	}, []);
	const redo = (0, import_react.useCallback)(() => {
		setFuture((f) => {
			if (!f.length) return f;
			setPast((p) => [...p, {
				doc: docRef.current,
				label: f[0].label
			}]);
			setDoc(f[0].doc);
			return f.slice(1);
		});
	}, []);
	const AUTO_PREFIX = {
		INPUT: "SW",
		CLOCK: "CLK",
		OUTPUT: "OUT",
		LED: "LED"
	};
	const addNode = (0, import_react.useCallback)((type, x, y, defId) => {
		const id = uid(type.toLowerCase().slice(0, 3) + "_");
		const spec = type === "CUSTOM" ? null : CATALOG[type];
		const prefix = AUTO_PREFIX[type];
		const label = prefix ? `${prefix}${docRef.current.nodes.filter((n) => n.type === type).length + 1}` : void 0;
		const node = {
			id,
			type,
			x: snap(x),
			y: snap(y),
			rot: 0,
			inputs: defaultInputs(type),
			defId,
			...label ? { label } : {},
			...type === "INPUT" ? { value: 0 } : {},
			...type === "CLOCK" ? {
				period: 12,
				domain: "clk"
			} : {},
			...type === "COUNTER" ? { bits: 4 } : {},
			...spec ? { delay: spec.defaultDelay } : {}
		};
		commit((d) => ({
			...d,
			nodes: [...d.nodes, node]
		}), `add ${spec?.name ?? type}`);
		setSelection([id]);
		setSelectedWires([]);
		return id;
	}, [commit]);
	const deleteSelected = (0, import_react.useCallback)(() => {
		if (!selection.length && !selectedWires.length) return;
		commit((d) => ({
			...d,
			nodes: d.nodes.filter((n) => !selection.includes(n.id)),
			wires: d.wires.filter((w) => !selectedWires.includes(w.id) && !selection.includes(w.from.node) && !selection.includes(w.to.node))
		}), "delete");
		setSelection([]);
		setSelectedWires([]);
	}, [
		selection,
		selectedWires,
		commit
	]);
	const duplicateSelected = (0, import_react.useCallback)((dx = 40, dy = 40) => {
		if (!selection.length) return [];
		const { nodes, wires } = cloneChunk(docRef.current, selection, dx, dy);
		commit((d) => ({
			...d,
			nodes: [...d.nodes, ...nodes],
			wires: [...d.wires, ...wires]
		}), "duplicate");
		const ids = nodes.map((n) => n.id);
		setSelection(ids);
		return ids;
	}, [selection, commit]);
	const rotateSelected = (0, import_react.useCallback)(() => {
		if (!selection.length) return;
		commit((d) => ({
			...d,
			nodes: d.nodes.map((n) => selection.includes(n.id) ? {
				...n,
				rot: (n.rot + 90) % 360
			} : n)
		}), "rotate");
	}, [selection, commit]);
	const nudge = (0, import_react.useCallback)((dx, dy) => {
		if (!selection.length) return;
		commit((d) => ({
			...d,
			nodes: d.nodes.map((n) => selection.includes(n.id) && !n.locked ? {
				...n,
				x: n.x + dx,
				y: n.y + dy
			} : n)
		}), "nudge");
	}, [selection, commit]);
	const toggleLock = (0, import_react.useCallback)(() => {
		if (!selection.length) return;
		const d = docRef.current;
		const allLocked = selection.every((id) => d.nodes.find((n) => n.id === id)?.locked);
		commit((doc0) => ({
			...doc0,
			nodes: doc0.nodes.map((n) => selection.includes(n.id) ? {
				...n,
				locked: !allLocked
			} : n)
		}), allLocked ? "unlock" : "lock");
	}, [selection, commit]);
	const setExpected = (0, import_react.useCallback)((id, v) => {
		commit((d) => ({
			...d,
			nodes: d.nodes.map((n) => n.id === id ? {
				...n,
				expected: v
			} : n)
		}), v == null ? "clear expected output" : "set expected output");
	}, [commit]);
	const copy = (0, import_react.useCallback)(() => {
		if (!selection.length) return;
		const d = docRef.current;
		const payload = {
			nodes: d.nodes.filter((n) => selection.includes(n.id)),
			wires: d.wires.filter((w) => selection.includes(w.from.node) && selection.includes(w.to.node))
		};
		clip.current = payload;
		setClipRev((n) => n + 1);
		try {
			navigator.clipboard.writeText(JSON.stringify({
				logicforge: 1,
				...payload
			}));
		} catch {}
	}, [selection]);
	const cut = (0, import_react.useCallback)(() => {
		copy();
		deleteSelected();
	}, [copy, deleteSelected]);
	const paste = (0, import_react.useCallback)((x, y) => {
		const apply = (c) => {
			if (!c.nodes.length) return;
			const minX = Math.min(...c.nodes.map((n) => n.x));
			const minY = Math.min(...c.nodes.map((n) => n.y));
			const dx = x != null ? x - minX : 40;
			const dy = y != null ? y - minY : 40;
			const map = /* @__PURE__ */ new Map();
			const nodes = c.nodes.map((n) => {
				const nid = uid("p");
				map.set(n.id, nid);
				return {
					...n,
					id: nid,
					x: snap(n.x + dx),
					y: snap(n.y + dy)
				};
			});
			const wires = c.wires.map((w) => ({
				id: uid("w"),
				from: {
					node: map.get(w.from.node),
					port: w.from.port
				},
				to: {
					node: map.get(w.to.node),
					port: w.to.port
				}
			}));
			commit((d) => ({
				...d,
				nodes: [...d.nodes, ...nodes],
				wires: [...d.wires, ...wires]
			}), "paste");
			setSelection(nodes.map((n) => n.id));
		};
		const local = clip.current;
		if (local?.nodes.length) {
			apply(local);
			return;
		}
		navigator.clipboard.readText().then((t) => {
			try {
				const j = JSON.parse(t);
				if (j.logicforge && Array.isArray(j.nodes)) apply(j);
			} catch {}
		});
	}, [commit]);
	const alignSelected = (0, import_react.useCallback)((mode) => {
		if (selection.length < 2) return;
		commit((d) => {
			const sel = d.nodes.filter((n) => selection.includes(n.id));
			const xs = sel.map((n) => n.x);
			const ys = sel.map((n) => n.y);
			let update = (n) => n;
			if (mode === "left") {
				const v = Math.min(...xs);
				update = (n) => ({
					...n,
					x: v
				});
			}
			if (mode === "right") {
				const v = Math.max(...xs);
				update = (n) => ({
					...n,
					x: v
				});
			}
			if (mode === "top") {
				const v = Math.min(...ys);
				update = (n) => ({
					...n,
					y: v
				});
			}
			if (mode === "bottom") {
				const v = Math.max(...ys);
				update = (n) => ({
					...n,
					y: v
				});
			}
			if (mode === "vspace") {
				const sorted = [...sel].sort((a, b) => a.y - b.y);
				const sizes = sorted.map((n) => nodeSize(n, d.defs));
				const first = sorted[0];
				const last = sorted[sorted.length - 1];
				const lastH = sizes[sizes.length - 1].h;
				const span = last.y + lastH - first.y;
				const sumH = sizes.reduce((s, sz) => s + sz.h, 0);
				const gap = sorted.length > 1 ? (span - sumH) / (sorted.length - 1) : 0;
				const order = /* @__PURE__ */ new Map();
				let cursor = first.y;
				sorted.forEach((n, i) => {
					order.set(n.id, cursor);
					cursor += sizes[i].h + gap;
				});
				update = (n) => ({
					...n,
					y: order.get(n.id) ?? n.y
				});
			}
			if (mode === "hspace") {
				const sorted = [...sel].sort((a, b) => a.x - b.x);
				const sizes = sorted.map((n) => nodeSize(n, d.defs));
				const first = sorted[0];
				const last = sorted[sorted.length - 1];
				const lastW = sizes[sizes.length - 1].w;
				const span = last.x + lastW - first.x;
				const sumW = sizes.reduce((s, sz) => s + sz.w, 0);
				const gap = sorted.length > 1 ? (span - sumW) / (sorted.length - 1) : 0;
				const order = /* @__PURE__ */ new Map();
				let cursor = first.x;
				sorted.forEach((n, i) => {
					order.set(n.id, cursor);
					cursor += sizes[i].w + gap;
				});
				update = (n) => ({
					...n,
					x: order.get(n.id) ?? n.x
				});
			}
			return {
				...d,
				nodes: d.nodes.map((n) => selection.includes(n.id) ? update(n) : n)
			};
		}, "align");
	}, [selection, commit]);
	const connect = (0, import_react.useCallback)((from, to) => {
		if (from.node === to.node) return;
		commit((d) => ({
			...d,
			wires: [...d.wires.filter((w) => !(w.to.node === to.node && w.to.port === to.port)), {
				id: uid("w"),
				from,
				to
			}]
		}), "connect");
	}, [commit]);
	const makeCustom = (0, import_react.useCallback)((name) => {
		const d = docRef.current;
		const sel = d.nodes.filter((n) => selection.includes(n.id));
		if (sel.length < 2) return;
		const inputs = sel.filter((n) => n.type === "INPUT").map((n) => n.id);
		const outputs = sel.filter((n) => n.type === "OUTPUT" || n.type === "LED").map((n) => n.id);
		if (!inputs.length || !outputs.length) return;
		const wires = d.wires.filter((w) => selection.includes(w.from.node) && selection.includes(w.to.node));
		const minX = Math.min(...sel.map((n) => n.x));
		const minY = Math.min(...sel.map((n) => n.y));
		const palette = [
			"#4d9fff",
			"#34d399",
			"#38bdf8",
			"#64748b",
			"#2dd4bf"
		];
		const def = {
			id: uid("def"),
			name: name.toUpperCase().slice(0, 12) || "BLOCK",
			color: palette[d.defs.length % palette.length],
			nodes: sel.map((n) => ({
				...n,
				x: n.x - minX + 40,
				y: n.y - minY + 40
			})),
			wires: wires.map((w) => ({ ...w })),
			inputs,
			outputs
		};
		const inst = {
			id: uid("cus_"),
			type: "CUSTOM",
			x: snap(minX),
			y: snap(minY),
			rot: 0,
			inputs: inputs.length,
			defId: def.id
		};
		commit((doc0) => ({
			defs: [...doc0.defs, def],
			nodes: [...doc0.nodes.filter((n) => !selection.includes(n.id)), inst],
			wires: doc0.wires.filter((w) => !(selection.includes(w.from.node) || selection.includes(w.to.node))),
			name: doc0.name
		}), "pack component");
		setSelection([inst.id]);
	}, [selection, commit]);
	const reset = (0, import_react.useCallback)(() => {
		commit(() => emptyDoc(), "new circuit");
		setSelection([]);
		setSelectedWires([]);
	}, [commit]);
	const load = (0, import_react.useCallback)((d) => {
		commit(() => ({
			...d,
			defs: d.defs ?? []
		}), "load");
		setSelection([]);
		setSelectedWires([]);
	}, [commit]);
	const persistList = (list, id) => {
		writeProjects(list);
		lsSet(LS_CURRENT, id);
		setProjects(list);
		setCurrentId(id);
	};
	const newFile = (0, import_react.useCallback)(() => {
		const id = uid("f");
		const doc0 = emptyDoc();
		persistList([{
			id,
			name: "Untitled",
			updatedAt: Date.now(),
			doc: doc0
		}, ...readProjects()], id);
		setDoc(doc0);
		setPast([]);
		setFuture([]);
		setSelection([]);
		setSelectedWires([]);
	}, []);
	const openFile = (0, import_react.useCallback)((id) => {
		const hit = readProjects().find((p) => p.id === id);
		if (!hit) return;
		lsSet(LS_CURRENT, id);
		setCurrentId(id);
		setDoc(hit.doc);
		setPast([]);
		setFuture([]);
		setSelection([]);
		setSelectedWires([]);
	}, []);
	const saveAs = (0, import_react.useCallback)((name) => {
		const id = uid("f");
		const copyDoc = {
			...docRef.current,
			name
		};
		persistList([{
			id,
			name,
			updatedAt: Date.now(),
			doc: copyDoc
		}, ...readProjects()], id);
		setDoc(copyDoc);
	}, []);
	const renameFile = (0, import_react.useCallback)((name) => {
		setDoc((d) => ({
			...d,
			name
		}));
		setProjects((list) => {
			const next = list.map((p) => p.id === currentRef.current ? {
				...p,
				name,
				doc: {
					...p.doc,
					name
				}
			} : p);
			writeProjects(next);
			return next;
		});
	}, []);
	const deleteFile = (0, import_react.useCallback)((id) => {
		const list = readProjects().filter((p) => p.id !== id);
		if (!list.length) {
			const nid = uid("f");
			const doc0 = emptyDoc();
			persistList([{
				id: nid,
				name: "Untitled",
				updatedAt: Date.now(),
				doc: doc0
			}], nid);
			setDoc(doc0);
			return;
		}
		const nextId = id === currentRef.current ? list[0].id : currentRef.current;
		persistList(list, nextId);
		const hit = list.find((p) => p.id === nextId);
		setDoc(hit.doc);
	}, []);
	const duplicateFile = (0, import_react.useCallback)(() => {
		const id = uid("f");
		const name = `${docRef.current.name || "Untitled"} copy`;
		const copyDoc = {
			...docRef.current,
			name
		};
		persistList([{
			id,
			name,
			updatedAt: Date.now(),
			doc: copyDoc
		}, ...readProjects()], id);
		setDoc(copyDoc);
	}, []);
	const metas = (0, import_react.useMemo)(() => projects.map(({ id, name, updatedAt }) => ({
		id,
		name,
		updatedAt
	})), [projects]);
	return (0, import_react.useMemo)(() => ({
		doc,
		selection,
		selectedWires,
		setSelection,
		setSelectedWires,
		commit,
		live,
		pushHistory,
		undo,
		redo,
		canUndo: past.length > 0,
		canRedo: future.length > 0,
		undoLabel: past.length ? past[past.length - 1].label : null,
		redoLabel: future.length ? future[0].label : null,
		addNode,
		deleteSelected,
		duplicateSelected,
		rotateSelected,
		nudge,
		toggleLock,
		setExpected,
		copy,
		cut,
		paste,
		hasClipboard: clipRev >= 0 && !!clip.current,
		alignSelected,
		connect,
		makeCustom,
		reset,
		load,
		projects: metas,
		currentId,
		fileName: doc.name || projects.find((p) => p.id === currentId)?.name || "Untitled",
		newFile,
		openFile,
		saveAs,
		renameFile,
		deleteFile,
		duplicateFile,
		ready
	}), [
		doc,
		selection,
		selectedWires,
		commit,
		live,
		pushHistory,
		undo,
		redo,
		past,
		future,
		addNode,
		deleteSelected,
		duplicateSelected,
		rotateSelected,
		nudge,
		toggleLock,
		setExpected,
		copy,
		cut,
		paste,
		clipRev,
		alignSelected,
		connect,
		makeCustom,
		reset,
		load,
		metas,
		currentId,
		projects,
		newFile,
		openFile,
		saveAs,
		renameFile,
		deleteFile,
		duplicateFile,
		ready
	]);
}
var MIN_Z = .18;
var MAX_Z = 3.2;
function clampZ(z) {
	return Math.min(MAX_Z, Math.max(MIN_Z, z));
}
function zoomToward(view, mx, my, nextZ) {
	const z = clampZ(nextZ);
	const k = z / view.z;
	return {
		z,
		x: mx - (mx - view.x) * k,
		y: my - (my - view.y) * k
	};
}
function useViewport(initial) {
	const [view, setViewState] = (0, import_react.useState)(initial ?? {
		x: 72,
		y: 48,
		z: 1
	});
	const viewRef = (0, import_react.useRef)(view);
	viewRef.current = view;
	const vel = (0, import_react.useRef)({
		x: 0,
		y: 0,
		on: false
	});
	const raf = (0, import_react.useRef)(0);
	const stopInertia = (0, import_react.useCallback)(() => {
		vel.current.on = false;
		cancelAnimationFrame(raf.current);
	}, []);
	const apply = (0, import_react.useCallback)((v) => {
		viewRef.current = v;
		setViewState(v);
	}, []);
	const setView = (0, import_react.useCallback)((u) => {
		stopInertia();
		const cur = viewRef.current;
		apply(typeof u === "function" ? u(cur) : u);
	}, [apply, stopInertia]);
	const startInertia = (0, import_react.useCallback)((vx, vy) => {
		if (Math.hypot(vx, vy) < .45) return;
		vel.current = {
			x: vx,
			y: vy,
			on: true
		};
		const tick = () => {
			if (!vel.current.on) return;
			const v = viewRef.current;
			apply({
				...v,
				x: v.x + vel.current.x,
				y: v.y + vel.current.y
			});
			vel.current.x *= .9;
			vel.current.y *= .9;
			if (Math.hypot(vel.current.x, vel.current.y) < .18) {
				vel.current.on = false;
				return;
			}
			raf.current = requestAnimationFrame(tick);
		};
		cancelAnimationFrame(raf.current);
		raf.current = requestAnimationFrame(tick);
	}, [apply]);
	(0, import_react.useEffect)(() => () => cancelAnimationFrame(raf.current), []);
	return {
		view,
		setView,
		viewRef,
		startInertia,
		stopInertia,
		apply
	};
}
var valColor = (v) => v === 1 ? "var(--hi)" : v === 0 ? "var(--lo)" : v === "Z" ? "var(--zz)" : "var(--xx)";
function Canvas(props) {
	const { ed, sim, view, setView, startInertia, stopInertia, running, wireStyle, snapOn, wheelZoom, spacePan, reduceGlow, glossy, onToggleSwitch, onCursor, fit } = props;
	const { doc, selection, selectedWires } = ed;
	const defs = doc.defs;
	const ref = (0, import_react.useRef)(null);
	const [drag, setDrag] = (0, import_react.useState)(null);
	const dragRef = (0, import_react.useRef)(null);
	dragRef.current = drag;
	const [guides, setGuides] = (0, import_react.useState)({
		v: [],
		h: []
	});
	const [hoverPort, setHoverPort] = (0, import_react.useState)(null);
	const [hoverScreenPos, setHoverScreenPos] = (0, import_react.useState)(null);
	const [menu, setMenu] = (0, import_react.useState)(null);
	const HOVER_DELAY_MS = 2e3;
	const [rawHover, setRawHover] = (0, import_react.useState)(null);
	const [netTarget, setNetTarget] = (0, import_react.useState)(null);
	const [netPinned, setNetPinned] = (0, import_react.useState)(false);
	const sameTarget = (a, b) => !!a && !!b && a.kind === b.kind && a.id === b.id;
	(0, import_react.useEffect)(() => {
		setRawHover(hoverPort ? {
			kind: "port",
			id: hoverPort
		} : null);
	}, [hoverPort]);
	const handleHoverPort = (0, import_react.useCallback)((k, e) => {
		setHoverPort(k);
		if (k && e) setHoverScreenPos({
			x: e.clientX,
			y: e.clientY
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (netPinned) return;
		if (!rawHover) {
			setNetTarget(null);
			return;
		}
		const t = setTimeout(() => setNetTarget(rawHover), HOVER_DELAY_MS);
		return () => clearTimeout(t);
	}, [rawHover, netPinned]);
	const clearNetHighlight = () => {
		setNetPinned(false);
		setNetTarget(null);
		setRawHover(null);
	};
	(0, import_react.useEffect)(() => {
		if (!netPinned) return;
		const onKey = (e) => {
			if (e.key === "Escape") clearNetHighlight();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [netPinned]);
	const pointers = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const viewRef = (0, import_react.useRef)(view);
	viewRef.current = view;
	const toWorld = (0, import_react.useCallback)((cx, cy, v = viewRef.current) => {
		const r = ref.current.getBoundingClientRect();
		return {
			x: (cx - r.left - v.x) / v.z,
			y: (cy - r.top - v.y) / v.z
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const onWheel = (e) => {
			e.preventDefault();
			stopInertia();
			const r = el.getBoundingClientRect();
			const mx = e.clientX - r.left;
			const my = e.clientY - r.top;
			const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
			const clamp = (v, m) => Math.max(-m, Math.min(m, v));
			const dx = clamp(e.deltaX * unit, 400);
			const dy = clamp(e.deltaY * unit, 400);
			if (e.ctrlKey || e.metaKey || wheelZoom && !e.shiftKey && Math.abs(dy) > 0 && Math.abs(dx) < 1) setView((v) => zoomToward(v, mx, my, v.z * Math.exp(-dy * .0018)));
			else setView((v) => ({
				...v,
				x: v.x - dx,
				y: v.y - dy
			}));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [
		setView,
		stopInertia,
		wheelZoom
	]);
	const onDrop = (e) => {
		e.preventDefault();
		const raw = e.dataTransfer.getData("application/x-node");
		if (!raw) return;
		const { type, defId } = JSON.parse(raw);
		const p = toWorld(e.clientX, e.clientY);
		ed.addNode(type, p.x - 45, p.y - 25, defId);
	};
	const startNodeDrag = (e, id) => {
		e.stopPropagation();
		setMenu(null);
		e.currentTarget.setPointerCapture?.(e.pointerId);
		const clickedLocked = !!doc.nodes.find((n) => n.id === id)?.locked;
		const add = e.shiftKey || e.metaKey || e.ctrlKey;
		let sel = selection;
		if (add) sel = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id];
		else if (!selection.includes(id)) sel = [id];
		ed.setSelection(sel);
		ed.setSelectedWires([]);
		const p = toWorld(e.clientX, e.clientY);
		if (e.altKey && !clickedLocked) {
			const chunk = cloneChunk(doc, sel, 0, 0);
			ed.pushHistory("duplicate");
			ed.live((d) => ({
				...d,
				nodes: [...d.nodes, ...chunk.nodes],
				wires: [...d.wires, ...chunk.wires]
			}));
			sel = chunk.nodes.map((n) => n.id);
			ed.setSelection(sel);
			const start = new Map(chunk.nodes.map((n) => [n.id, {
				x: n.x,
				y: n.y
			}]));
			setDrag({
				kind: "node",
				sx: p.x,
				sy: p.y,
				start
			});
			return;
		}
		ed.pushHistory("move");
		const start = new Map(doc.nodes.filter((n) => sel.includes(n.id) && !n.locked).map((n) => [n.id, {
			x: n.x,
			y: n.y
		}]));
		setDrag({
			kind: "node",
			sx: p.x,
			sy: p.y,
			start
		});
	};
	const startPortDrag = (e, node, dir, port) => {
		e.stopPropagation();
		setMenu(null);
		const p = toWorld(e.clientX, e.clientY);
		if (dir === "out") setDrag({
			kind: "wire",
			from: {
				node,
				port
			},
			to: null,
			x: p.x,
			y: p.y
		});
		else {
			const existing = doc.wires.find((w) => w.to.node === node && w.to.port === port);
			if (existing) {
				ed.commit((d) => ({
					...d,
					wires: d.wires.filter((w) => w.id !== existing.id)
				}), "detach");
				setDrag({
					kind: "wire",
					from: existing.from,
					to: null,
					x: p.x,
					y: p.y
				});
			} else setDrag({
				kind: "wire",
				from: null,
				to: {
					node,
					port
				},
				x: p.x,
				y: p.y
			});
		}
	};
	const beginPan = (e) => {
		stopInertia();
		setDrag({
			kind: "pan",
			sx: e.clientX,
			sy: e.clientY,
			ox: view.x,
			oy: view.y,
			lastX: e.clientX,
			lastY: e.clientY,
			lastT: performance.now(),
			vx: 0,
			vy: 0
		});
	};
	const onPointerDown = (e) => {
		setMenu(null);
		pointers.current.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		if (pointers.current.size === 2) {
			const pts = [...pointers.current.values()];
			const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			const mx = (pts[0].x + pts[1].x) / 2;
			const my = (pts[0].y + pts[1].y) / 2;
			const r = ref.current.getBoundingClientRect();
			setDrag({
				kind: "pinch",
				d0: Math.max(1, d0),
				z0: view.z,
				mx0: mx - r.left,
				my0: my - r.top,
				vx0: view.x,
				vy0: view.y
			});
			return;
		}
		if (e.button === 1 || e.altKey || spacePan || e.buttons === 4) {
			e.preventDefault();
			beginPan(e);
			return;
		}
		if (e.button !== 0) return;
		const p = toWorld(e.clientX, e.clientY);
		if (!e.shiftKey) {
			ed.setSelection([]);
			ed.setSelectedWires([]);
		}
		setDrag({
			kind: "marquee",
			sx: p.x,
			sy: p.y,
			x: p.x,
			y: p.y
		});
	};
	const onPointerMove = (e) => {
		pointers.current.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		const p = toWorld(e.clientX, e.clientY);
		onCursor(p);
		if (rawHover) setHoverScreenPos({
			x: e.clientX,
			y: e.clientY
		});
		const d = dragRef.current;
		if (!d) return;
		if (d.kind === "pinch" && pointers.current.size >= 2) {
			const pts = [...pointers.current.values()];
			const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			const r = ref.current.getBoundingClientRect();
			const mx = (pts[0].x + pts[1].x) / 2 - r.left;
			const my = (pts[0].y + pts[1].y) / 2 - r.top;
			const z = clampZ(d.z0 * (dist / d.d0));
			const k = z / d.z0;
			setView({
				z,
				x: mx - (d.mx0 - d.vx0) * k + (mx - d.mx0),
				y: my - (d.my0 - d.vy0) * k + (my - d.my0)
			});
			return;
		}
		if (d.kind === "pan") {
			const now = performance.now();
			const dt = Math.max(8, now - d.lastT);
			const vx = (e.clientX - d.lastX) / dt * 16;
			const vy = (e.clientY - d.lastY) / dt * 16;
			setView({
				x: d.ox + (e.clientX - d.sx),
				y: d.oy + (e.clientY - d.sy),
				z: viewRef.current.z
			});
			setDrag({
				...d,
				lastX: e.clientX,
				lastY: e.clientY,
				lastT: now,
				vx,
				vy
			});
			return;
		}
		if (d.kind === "node") {
			const dx = p.x - d.sx;
			const dy = p.y - d.sy;
			const gv = [];
			const gh = [];
			ed.live((doc0) => ({
				...doc0,
				nodes: doc0.nodes.map((n) => {
					const s = d.start.get(n.id);
					if (!s) return n;
					let nx = s.x + dx;
					let ny = s.y + dy;
					if (snapOn) {
						nx = snap(nx);
						ny = snap(ny);
					}
					for (const o of doc0.nodes) {
						if (d.start.has(o.id)) continue;
						if (Math.abs(o.x - nx) < 8) {
							nx = o.x;
							gv.push(o.x);
						}
						if (Math.abs(o.y - ny) < 8) {
							ny = o.y;
							gh.push(o.y);
						}
					}
					return {
						...n,
						x: nx,
						y: ny
					};
				})
			}));
			setGuides({
				v: gv,
				h: gh
			});
		} else if (d.kind === "wire") {
			let x = p.x;
			let y = p.y;
			for (const n of doc.nodes) {
				const { ins, outs } = portCounts(n, defs);
				for (const dir of ["in", "out"]) {
					const count = dir === "in" ? ins : outs;
					for (let i = 0; i < count; i++) {
						const q = portPos(n, defs, dir, i);
						if (Math.hypot(q.x - p.x, q.y - p.y) < 16) {
							x = q.x;
							y = q.y;
							setHoverPort(`${n.id}|${dir}|${i}`);
						}
					}
				}
			}
			setDrag({
				...d,
				x,
				y
			});
		} else if (d.kind === "marquee") setDrag({
			...d,
			x: p.x,
			y: p.y
		});
	};
	const onPointerUp = (e) => {
		pointers.current.delete(e.pointerId);
		const d = dragRef.current;
		if (d?.kind === "pan") startInertia(d.vx, d.vy);
		if (d?.kind === "marquee") {
			const x1 = Math.min(d.sx, d.x);
			const x2 = Math.max(d.sx, d.x);
			const y1 = Math.min(d.sy, d.y);
			const y2 = Math.max(d.sy, d.y);
			if (Math.abs(x2 - x1) > 4 || Math.abs(y2 - y1) > 4) {
				const hit = doc.nodes.filter((n) => {
					const { w, h } = nodeSize(n, defs);
					return n.x < x2 && n.x + w > x1 && n.y < y2 && n.y + h > y1;
				}).map((n) => n.id);
				ed.setSelection(e.shiftKey ? [.../* @__PURE__ */ new Set([...selection, ...hit])] : hit);
			} else if (e.detail === 2) fit();
		}
		if (d?.kind === "wire") {
			let hp = hoverPort;
			if (!hp) for (const n of doc.nodes) {
				const { ins, outs } = portCounts(n, defs);
				for (const dir of ["in", "out"]) {
					const count = dir === "in" ? ins : outs;
					for (let i = 0; i < count; i++) {
						const q = portPos(n, defs, dir, i);
						if (Math.hypot(q.x - d.x, q.y - d.y) < 18) hp = `${n.id}|${dir}|${i}`;
					}
				}
			}
			if (hp) {
				const [nid, dir, pi] = hp.split("|");
				if (d.from && dir === "in") ed.connect(d.from, {
					node: nid,
					port: +pi
				});
				else if (d.to && dir === "out") ed.connect({
					node: nid,
					port: +pi
				}, d.to);
			}
		}
		setGuides({
			v: [],
			h: []
		});
		setDrag(null);
	};
	const onCanvasContext = (e) => {
		e.preventDefault();
		setDrag(null);
		const p = toWorld(e.clientX, e.clientY);
		setMenu({
			x: e.clientX,
			y: e.clientY,
			wx: p.x,
			wy: p.y
		});
	};
	const onNodeContext = (e, id) => {
		e.preventDefault();
		e.stopPropagation();
		setDrag(null);
		if (!selection.includes(id)) {
			ed.setSelection([id]);
			ed.setSelectedWires([]);
		}
		const p = toWorld(e.clientX, e.clientY);
		setMenu({
			x: e.clientX,
			y: e.clientY,
			wx: p.x,
			wy: p.y,
			node: id
		});
	};
	const onRenameNode = (e, id) => {
		e.stopPropagation();
		e.preventDefault();
		const node = doc.nodes.find((x) => x.id === id);
		if (!node) return;
		const current = node.label ?? nodeTitle(node, defs);
		const next = window.prompt("Rename module", current);
		if (next == null) return;
		const trimmed = next.trim();
		ed.commit((d) => ({
			...d,
			nodes: d.nodes.map((x) => x.id === id ? {
				...x,
				label: trimmed || void 0
			} : x)
		}), "rename");
	};
	const onWireContext = (e, id) => {
		e.preventDefault();
		e.stopPropagation();
		setDrag(null);
		ed.setSelectedWires([id]);
		ed.setSelection([]);
		const p = toWorld(e.clientX, e.clientY);
		setMenu({
			x: e.clientX,
			y: e.clientY,
			wx: p.x,
			wy: p.y,
			wire: id
		});
	};
	const wirePath = (a, b, da, db) => {
		const dist = Math.hypot(b.x - a.x, b.y - a.y);
		const k = Math.min(170, Math.max(36, dist * .45));
		if (wireStyle === "ortho") {
			const m = a.x + (b.x - a.x) / 2;
			if (!(b.x < a.x + 40)) return `M${a.x},${a.y} L${m},${a.y} L${m},${b.y} L${b.x},${b.y}`;
			const off = 46;
			const my = (a.y + b.y) / 2 + (Math.abs(b.y - a.y) < 20 ? 70 : 0);
			return `M${a.x},${a.y} L${a.x + off},${a.y} L${a.x + off},${my} L${b.x - off},${my} L${b.x - off},${b.y} L${b.x},${b.y}`;
		}
		const c1 = {
			x: a.x + da.x * k,
			y: a.y + da.y * k
		};
		const c2 = {
			x: b.x + db.x * k,
			y: b.y + db.y * k
		};
		return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
	};
	const nodeMap = (0, import_react.useMemo)(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);
	const wireGeo = doc.wires.map((w) => {
		const a = nodeMap.get(w.from.node);
		const b = nodeMap.get(w.to.node);
		if (!a || !b) return null;
		if (w.from.port >= portCounts(a, defs).outs || w.to.port >= portCounts(b, defs).ins) return null;
		const pa = portPos(a, defs, "out", w.from.port);
		const pb = portPos(b, defs, "in", w.to.port);
		return {
			w,
			d: wirePath(pa, pb, portDir(a, "out"), portDir(b, "in")),
			v: sim.wireValues.get(w.id) ?? "X",
			pa,
			pb
		};
	}).filter(Boolean);
	const gridSize = 20 * view.z;
	const showFine = view.z > .45;
	const activeNet = (0, import_react.useMemo)(() => {
		if (drag || !netTarget) return null;
		if (netTarget.kind === "wire") {
			const w = doc.wires.find((x) => x.id === netTarget.id);
			if (!w) return null;
			return {
				wires: /* @__PURE__ */ new Set([netTarget.id]),
				nodes: /* @__PURE__ */ new Set([w.from.node, w.to.node])
			};
		}
		if (netTarget.kind === "port") {
			const [nid, dir, pStr] = netTarget.id.split("|");
			const port = Number(pStr);
			const wires = doc.wires.filter((w) => dir === "out" ? w.from.node === nid && w.from.port === port : w.to.node === nid && w.to.port === port);
			const nodes = /* @__PURE__ */ new Set([nid]);
			wires.forEach((w) => {
				nodes.add(w.from.node);
				nodes.add(w.to.node);
			});
			return {
				wires: new Set(wires.map((w) => w.id)),
				nodes
			};
		}
		if (netTarget.kind === "node") {
			const nid = netTarget.id;
			const wires = doc.wires.filter((w) => w.from.node === nid || w.to.node === nid);
			const nodes = /* @__PURE__ */ new Set([nid]);
			wires.forEach((w) => {
				nodes.add(w.from.node);
				nodes.add(w.to.node);
			});
			return {
				wires: new Set(wires.map((w) => w.id)),
				nodes
			};
		}
		const nodes = /* @__PURE__ */ new Set([netTarget.id]);
		const wires = /* @__PURE__ */ new Set();
		const queue = [netTarget.id];
		while (queue.length) {
			const cur = queue.shift();
			for (const w of doc.wires) {
				if (w.from.node !== cur && w.to.node !== cur) continue;
				wires.add(w.id);
				const other = w.from.node === cur ? w.to.node : w.from.node;
				if (!nodes.has(other)) {
					nodes.add(other);
					queue.push(other);
				}
			}
		}
		return {
			wires,
			nodes
		};
	}, [
		netTarget,
		doc.wires,
		drag
	]);
	const debugWire = selectedWires.length === 1 && !selection.length ? wireGeo.find((g) => g.w.id === selectedWires[0]) : void 0;
	const debugWireExtra = (0, import_react.useMemo)(() => {
		if (!debugWire) return null;
		const { w, v } = debugWire;
		const driver = nodeMap.get(w.from.node);
		if (!driver) return null;
		const fanout = doc.wires.filter((x) => x.from.node === w.from.node && x.from.port === w.from.port).length;
		const t = sim.transitions.get(outKey(w.from.node, w.from.port));
		return {
			label: `NET ${w.id.slice(-4).toUpperCase()}`,
			driver: nodeTitle(driver, defs),
			value: v,
			t,
			fanout,
			anchor: {
				x: (debugWire.pa.x + debugWire.pb.x) / 2,
				y: (debugWire.pa.y + debugWire.pb.y) / 2
			}
		};
	}, [
		debugWire,
		doc.wires,
		sim.transitions,
		defs,
		nodeMap
	]);
	const debugNode = selection.length === 1 && !selectedWires.length ? nodeMap.get(selection[0]) : void 0;
	const debugNodeExtra = (0, import_react.useMemo)(() => {
		if (!debugNode) return null;
		const names = specOf(debugNode, defs);
		const ins = names.ins.map((nm, i) => ({
			nm,
			v: sim.nodeIn.get(inKey(debugNode.id, i)) ?? "X"
		}));
		const outs = names.outs.map((nm, i) => ({
			nm,
			v: sim.nodeOut.get(outKey(debugNode.id, i)) ?? "X"
		}));
		if (!ins.length && !outs.length) return null;
		const delay = nodeDelay(debugNode);
		const tOut = sim.transitions.get(outKey(debugNode.id, 0));
		const { w } = nodeSize(debugNode, defs);
		return {
			title: nodeTitle(debugNode, defs),
			ins,
			outs,
			delay,
			from: tOut !== void 0 ? Math.max(0, tOut - delay) : void 0,
			to: tOut,
			anchor: {
				x: debugNode.x + w,
				y: debugNode.y
			}
		};
	}, [
		debugNode,
		defs,
		sim.nodeIn,
		sim.nodeOut,
		sim.transitions
	]);
	const menuItems = (0, import_react.useMemo)(() => {
		if (!menu) return [];
		if (menu.wire) {
			const id = menu.wire;
			return [netPinned && sameTarget(netTarget, {
				kind: "wire",
				id
			}) ? {
				label: "Clear highlight",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-3.5" }),
				onSelect: clearNetHighlight
			} : {
				label: "Highlight network",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3.5" }),
				onSelect: () => {
					setNetTarget({
						kind: "wire",
						id
					});
					setNetPinned(true);
				}
			}, {
				label: "Delete wire",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" }),
				danger: true,
				divider: true,
				onSelect: () => ed.commit((d) => ({
					...d,
					wires: d.wires.filter((w) => w.id !== id)
				}), "delete wire")
			}];
		}
		if (menu.node) {
			const id = menu.node;
			const node = nodeMap.get(id);
			const selLocked = selection.length > 0 && selection.every((sid) => nodeMap.get(sid)?.locked);
			const pinnedHere = netPinned && netTarget?.id === id && (netTarget.kind === "node" || netTarget.kind === "trace");
			const expectItems = node && (node.type === "OUTPUT" || node.type === "LED") ? [
				{
					label: node.expected === 1 ? "Expected: HIGH ✓" : "Expect HIGH",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, { className: "size-3.5" }),
					divider: true,
					onSelect: () => ed.setExpected(id, node.expected === 1 ? void 0 : 1)
				},
				{
					label: node.expected === 0 ? "Expected: LOW ✓" : "Expect LOW",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "size-3.5" }),
					onSelect: () => ed.setExpected(id, node.expected === 0 ? void 0 : 0)
				},
				...node.expected != null ? [{
					label: "Clear expected value",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "size-3.5" }),
					onSelect: () => ed.setExpected(id, void 0)
				}] : []
			] : [];
			return [
				pinnedHere ? {
					label: "Clear highlight",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-3.5" }),
					onSelect: clearNetHighlight
				} : {
					label: "Highlight network",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3.5" }),
					onSelect: () => {
						setNetTarget({
							kind: "node",
							id
						});
						setNetPinned(true);
					}
				},
				{
					label: "Trace full network",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waypoints, { className: "size-3.5" }),
					onSelect: () => {
						setNetTarget({
							kind: "trace",
							id
						});
						setNetPinned(true);
					}
				},
				...expectItems,
				{
					label: "Cut",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, { className: "size-3.5" }),
					divider: true,
					onSelect: () => ed.cut()
				},
				{
					label: "Copy",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" }),
					onSelect: () => ed.copy()
				},
				{
					label: "Duplicate",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyPlus, { className: "size-3.5" }),
					onSelect: () => ed.duplicateSelected()
				},
				{
					label: "Rotate",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, { className: "size-3.5" }),
					onSelect: () => ed.rotateSelected()
				},
				{
					label: selLocked ? "Unlock" : "Lock",
					icon: selLocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3.5" }),
					divider: true,
					onSelect: () => ed.toggleLock()
				},
				{
					label: "Delete",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" }),
					danger: true,
					divider: true,
					onSelect: () => ed.deleteSelected()
				}
			];
		}
		const wx = menu.wx;
		const wy = menu.wy;
		return [
			{
				label: "Paste",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardPaste, { className: "size-3.5" }),
				disabled: !ed.hasClipboard,
				onSelect: () => ed.paste(wx, wy)
			},
			{
				label: "Select all",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MousePointer2, { className: "size-3.5" }),
				divider: true,
				disabled: !doc.nodes.length,
				onSelect: () => ed.setSelection(doc.nodes.map((n) => n.id))
			},
			{
				label: "Fit view",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-3.5" }),
				onSelect: () => fit()
			}
		];
	}, [
		menu,
		ed,
		selection,
		nodeMap,
		doc.nodes,
		fit,
		netPinned,
		netTarget,
		clearNetHighlight
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "relative h-full w-full overflow-hidden select-none",
		style: {
			background: "var(--bg)",
			backgroundImage: showFine ? `linear-gradient(to right, var(--grid) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
             linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)` : `linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)`,
			backgroundSize: showFine ? `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px` : `${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px`,
			backgroundPosition: `${view.x}px ${view.y}px`,
			cursor: drag?.kind === "pan" || spacePan ? "grab" : "default",
			touchAction: "none"
		},
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onPointerCancel: onPointerUp,
		onContextMenu: onCanvasContext,
		onDragOver: (e) => e.preventDefault(),
		onDrop,
		onPointerLeave: () => onCursor(null),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "absolute inset-0 h-full w-full",
				style: { touchAction: "none" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("filter", {
						id: "glow",
						x: "-60%",
						y: "-60%",
						width: "220%",
						height: "220%",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("feGaussianBlur", {
							stdDeviation: "3",
							result: "b"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("feMerge", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("feMergeNode", { in: "b" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("feMergeNode", { in: "SourceGraphic" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("filter", {
						id: "nodeShadow",
						x: "-40%",
						y: "-40%",
						width: "180%",
						height: "200%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("feDropShadow", {
							dx: "0",
							dy: "2.5",
							stdDeviation: "3",
							floodColor: "#000000",
							floodOpacity: "0.30"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: "nodeBevel",
						x1: "0",
						y1: "0",
						x2: "0",
						y2: "1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0",
								stopColor: "#ffffff",
								stopOpacity: "0.12"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0.45",
								stopColor: "#ffffff",
								stopOpacity: "0"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "1",
								stopColor: "#000000",
								stopOpacity: "0.18"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("radialGradient", {
						id: "domeGloss",
						cx: "35%",
						cy: "28%",
						r: "75%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0",
								stopColor: "#ffffff",
								stopOpacity: "0.6"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0.5",
								stopColor: "#ffffff",
								stopOpacity: "0.1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "1",
								stopColor: "#ffffff",
								stopOpacity: "0"
							})
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					transform: `translate(${view.x},${view.y}) scale(${view.z})`,
					children: [
						guides.v.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: x,
							y1: -9e3,
							x2: x,
							y2: 9e3,
							stroke: "var(--accent)",
							strokeWidth: 1 / view.z,
							strokeDasharray: "6 6",
							opacity: .7
						}, "gv" + i)),
						guides.h.map((y, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: -9e3,
							y1: y,
							x2: 9e3,
							y2: y,
							stroke: "var(--accent)",
							strokeWidth: 1 / view.z,
							strokeDasharray: "6 6",
							opacity: .7
						}, "gh" + i)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [wireGeo.map(({ w, d, v, pa, pb }) => {
							const sel = selectedWires.includes(w.id);
							const col = valColor(v);
							const dim = activeNet && !activeNet.wires.has(w.id);
							const baseOp = (v === "X" || v === "Z" ? .55 : .95) * (dim ? .2 : 1);
							const mx = (pa.x + pb.x) / 2;
							const my = (pa.y + pb.y) / 2;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
									d,
									fill: "none",
									stroke: "transparent",
									strokeWidth: 14,
									style: { cursor: "pointer" },
									onPointerDown: (e) => {
										e.stopPropagation();
										setMenu(null);
										ed.setSelectedWires([w.id]);
										ed.setSelection([]);
									},
									onContextMenu: (e) => onWireContext(e, w.id),
									onPointerEnter: () => setRawHover({
										kind: "wire",
										id: w.id
									}),
									onPointerLeave: () => setRawHover((cur) => sameTarget(cur, {
										kind: "wire",
										id: w.id
									}) ? null : cur)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
									d,
									fill: "none",
									stroke: col,
									strokeWidth: sel ? 3.6 : 2.2,
									strokeLinecap: "round",
									opacity: baseOp,
									strokeDasharray: v === "X" ? "5 5" : v === "Z" ? "2 6" : void 0,
									filter: v === 1 && !reduceGlow ? "url(#glow)" : void 0,
									style: { pointerEvents: "none" }
								}),
								sel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
									d,
									fill: "none",
									stroke: "var(--accent)",
									strokeWidth: 7,
									opacity: .25 * (dim ? .2 : 1),
									strokeLinecap: "round",
									style: { pointerEvents: "none" }
								}),
								running && v === 1 && !dim && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									r: 3.2,
									fill: "#fff",
									opacity: .9,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animateMotion", {
										dur: "1.1s",
										repeatCount: "indefinite",
										path: d
									})
								}),
								showFine && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
									x: mx,
									y: my - 4,
									textAnchor: "middle",
									fontSize: 7,
									fontWeight: 700,
									fill: col,
									stroke: "var(--bg)",
									strokeWidth: 2.5,
									paintOrder: "stroke",
									opacity: dim ? .25 : .9,
									style: { pointerEvents: "none" },
									children: v
								})
							] }, w.id);
						}), drag?.kind === "wire" && (() => {
							const anchorId = drag.from?.node ?? drag.to.node;
							const an = nodeMap.get(anchorId);
							if (!an) return null;
							const dir = drag.from ? "out" : "in";
							const pa = portPos(an, defs, dir, (drag.from ?? drag.to).port);
							const d = drag.from ? wirePath(pa, {
								x: drag.x,
								y: drag.y
							}, portDir(an, "out"), {
								x: -1,
								y: 0
							}) : wirePath({
								x: drag.x,
								y: drag.y
							}, pa, {
								x: 1,
								y: 0
							}, portDir(an, "in"));
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d,
								fill: "none",
								stroke: "var(--accent)",
								strokeWidth: 2.4,
								strokeDasharray: "6 4"
							});
						})()] }),
						doc.nodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeView, {
							n,
							defs,
							sim,
							selected: selection.includes(n.id),
							onBodyDown: (e) => startNodeDrag(e, n.id),
							onContextMenu: (e) => onNodeContext(e, n.id),
							onDoubleClick: (e) => onRenameNode(e, n.id),
							onPortDown: startPortDrag,
							onHoverPort: handleHoverPort,
							hoverPort,
							onToggle: () => onToggleSwitch(n.id),
							dimmed: !!activeNet && !activeNet.nodes.has(n.id),
							reduceGlow,
							glossy,
							onHoverStart: () => setRawHover({
								kind: "node",
								id: n.id
							}),
							onHoverEnd: () => setRawHover((cur) => sameTarget(cur, {
								kind: "node",
								id: n.id
							}) ? null : cur)
						}, n.id))
					]
				})]
			}),
			drag?.kind === "marquee" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute border bg-[var(--accent)]/10",
				style: {
					borderColor: "var(--accent)",
					left: Math.min(drag.sx, drag.x) * view.z + view.x,
					top: Math.min(drag.sy, drag.y) * view.z + view.y,
					width: Math.abs(drag.x - drag.sx) * view.z,
					height: Math.abs(drag.y - drag.sy) * view.z
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimap, {
				doc,
				defs,
				view,
				setView,
				host: ref
			}),
			debugWireExtra && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-2.5 py-2 text-micro shadow-[var(--shadow)]",
				style: {
					left: debugWireExtra.anchor.x * view.z + view.x,
					top: debugWireExtra.anchor.y * view.z + view.y - 10
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 font-bold uppercase tracking-[0.1em] text-[var(--text)]",
						children: debugWireExtra.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px bg-[var(--border)]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 space-y-0.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Driver" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--text)]",
									children: debugWireExtra.driver
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Value" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: valColor(debugWireExtra.value) },
									className: "font-bold",
									children: debugWireExtra.value
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Transition" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--text)] tabular-nums",
									children: debugWireExtra.t !== void 0 ? `t=${debugWireExtra.t}` : "—"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Fanout" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--text)] tabular-nums",
									children: debugWireExtra.fanout
								})]
							})
						]
					})
				]
			}),
			debugNodeExtra && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute z-10 min-w-36 translate-x-2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-2.5 py-2 text-micro shadow-[var(--shadow)]",
				style: {
					left: debugNodeExtra.anchor.x * view.z + view.x,
					top: debugNodeExtra.anchor.y * view.z + view.y
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 font-bold uppercase tracking-[0.1em] text-[var(--text)]",
						children: debugNodeExtra.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px bg-[var(--border)]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 space-y-0.5",
						children: [
							debugNodeExtra.ins.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.nm }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: valColor(p.v) },
									className: "font-bold",
									children: p.v
								})]
							}, "i" + i)),
							debugNodeExtra.outs.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.nm }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: valColor(p.v) },
									className: "font-bold",
									children: p.v
								})]
							}, "o" + i)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Propagation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[var(--text)] tabular-nums",
									children: [debugNodeExtra.delay, " ticks"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-3 text-[var(--muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Last transition" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--text)] tabular-nums",
									children: debugNodeExtra.to !== void 0 ? `t=${debugNodeExtra.from} → ${debugNodeExtra.to}` : "—"
								})]
							})
						]
					})
				]
			}),
			!doc.nodes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 flex items-center justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center text-[var(--muted)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ui-kicker",
						children: "empty workspace"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 text-xs",
						children: "Drag from the library · pinch or ctrl-scroll to zoom · two-finger pan · right-click for actions"
					})]
				})
			}),
			rawHover && !netPinned && !netTarget && !drag && hoverScreenPos && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none fixed z-30",
				style: {
					left: hoverScreenPos.x - 10,
					top: hoverScreenPos.y - 10
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes netcharge { from { stroke-dashoffset: 50.27; } to { stroke-dashoffset: 0; } }` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: 20,
					height: 20,
					viewBox: "0 0 20 20",
					style: { transform: "rotate(-90deg)" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: 10,
						cy: 10,
						r: 8,
						fill: "none",
						stroke: "var(--border)",
						strokeWidth: 2,
						opacity: .5
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: 10,
						cy: 10,
						r: 8,
						fill: "none",
						stroke: "var(--accent)",
						strokeWidth: 2,
						strokeDasharray: 50.27,
						style: { animation: `netcharge ${HOVER_DELAY_MS}ms linear forwards` }
					})]
				})]
			}, `${rawHover.kind}:${rawHover.id}`),
			menu && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContextMenu, {
				x: menu.x,
				y: menu.y,
				items: menuItems,
				onClose: () => setMenu(null)
			})
		]
	});
}
function Minimap({ doc, defs, view, setView, host }) {
	if (!doc.nodes.length) return null;
	let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
	for (const n of doc.nodes) {
		const { w, h } = nodeSize(n, defs);
		x1 = Math.min(x1, n.x - 40);
		y1 = Math.min(y1, n.y - 40);
		x2 = Math.max(x2, n.x + w + 40);
		y2 = Math.max(y2, n.y + h + 40);
	}
	const bw = Math.max(1, x2 - x1);
	const bh = Math.max(1, y2 - y1);
	const W = 132;
	const H = 88;
	const s = Math.min(W / bw, H / bh);
	const r = host.current?.getBoundingClientRect();
	const vw = r ? r.width / view.z : 800;
	const vh = r ? r.height / view.z : 500;
	const vx = -view.x / view.z;
	const vy = -view.y / view.z;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "absolute bottom-3 left-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 shadow-[var(--shadow)]",
		style: {
			width: W,
			height: H
		},
		onPointerDown: (e) => {
			e.stopPropagation();
			const box = e.currentTarget.getBoundingClientRect();
			const wx = x1 + (e.clientX - box.left) / s;
			const wy = y1 + (e.clientY - box.top) / s;
			setView((v) => ({
				...v,
				x: (r?.width ?? 800) / 2 - wx * v.z,
				y: (r?.height ?? 500) / 2 - wy * v.z
			}));
		},
		title: "Minimap — click to center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: W,
			height: H,
			children: [doc.nodes.map((n) => {
				const { w, h } = nodeSize(n, defs);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: (n.x - x1) * s,
					y: (n.y - y1) * s,
					width: Math.max(2, w * s),
					height: Math.max(2, h * s),
					fill: "var(--accent)",
					opacity: .7,
					rx: 1
				}, n.id);
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: (vx - x1) * s,
				y: (vy - y1) * s,
				width: vw * s,
				height: vh * s,
				fill: "none",
				stroke: "var(--text)",
				strokeWidth: 1,
				opacity: .7
			})]
		})
	});
}
/** Small pass/fail/unknown badge for a Probe/LED's preset expected value. */
function ExpectBadge({ x, y, pass }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
		transform: `translate(${x},${y})`,
		style: { pointerEvents: "none" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				r: 6.5,
				fill: pass === true ? "var(--hi)" : pass === false ? "var(--xx)" : "var(--muted)",
				stroke: "var(--node)",
				strokeWidth: 1.5
			}),
			pass === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M-2.8,0.2 L-0.8,2.2 L2.8,-2.2",
				fill: "none",
				stroke: "#fff",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			pass === false && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M-2.2,-2.2 L2.2,2.2",
				stroke: "#fff",
				strokeWidth: 1.5,
				strokeLinecap: "round"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M-2.2,2.2 L2.2,-2.2",
				stroke: "#fff",
				strokeWidth: 1.5,
				strokeLinecap: "round"
			})] }),
			pass === null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: 0,
				y: 2.6,
				textAnchor: "middle",
				fontSize: 7.5,
				fontWeight: 700,
				fill: "#fff",
				children: "?"
			})
		]
	});
}
function NodeView({ n, defs, sim, selected, onBodyDown, onContextMenu, onDoubleClick, onPortDown, onHoverPort, hoverPort, onToggle, dimmed, reduceGlow, glossy, onHoverStart, onHoverEnd }) {
	const { w, h } = nodeSize(n, defs);
	const { ins, outs } = portCounts(n, defs);
	const names = specOf(n, defs);
	const out = sim.nodeOut.get(n.type === "OUTPUT" || n.type === "LED" ? n.id : outKey(n.id, 0)) ?? sim.nodeOut.get(n.id) ?? "X";
	const title = nodeTitle(n, defs);
	const isSwitch = n.type === "INPUT" || n.type === "CLOCK";
	const isProbe = n.type === "OUTPUT";
	const isLed = n.type === "LED";
	const probeVal = isProbe || isLed ? sim.nodeIn.get(inKey(n.id, 0)) ?? "X" : out;
	const state = isProbe || isLed ? probeVal : out;
	const col = valColor(state);
	const floating = Array.from({ length: ins }).some((_, i) => sim.floating.includes(inKey(n.id, i)));
	const expectPass = n.expected == null ? null : state !== 0 && state !== 1 ? null : state === n.expected;
	const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: 0,
			y: 0,
			width: w,
			height: h,
			rx: n.type === "LED" ? h / 2 : 10,
			fill: "var(--node)",
			stroke: selected ? "var(--accent)" : "var(--border)",
			strokeWidth: selected ? 2 : 1.2,
			filter: reduceGlow ? void 0 : "url(#nodeShadow)"
		}),
		glossy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: .6,
			y: .6,
			width: Math.max(0, w - 1.2),
			height: Math.max(0, h - 1.2),
			rx: n.type === "LED" ? h / 2 - .6 : 9.4,
			fill: "url(#nodeBevel)",
			style: { pointerEvents: "none" }
		}),
		selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: -3,
			y: -3,
			width: w + 6,
			height: h + 6,
			rx: n.type === "LED" ? (h + 6) / 2 : 13,
			fill: "none",
			stroke: "var(--accent)",
			opacity: .3,
			strokeWidth: 2
		}),
		n.type === "CUSTOM" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: 0,
			y: 0,
			width: w,
			height: 4,
			rx: 2,
			fill: "var(--accent)",
			opacity: .8
		}),
		floating && !isSwitch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: 0,
			y: 0,
			width: w,
			height: h,
			rx: 10,
			fill: "none",
			stroke: "var(--xx)",
			strokeWidth: 1.4,
			strokeDasharray: "4 4",
			opacity: .85
		}),
		n.locked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
			transform: "translate(6,6)",
			opacity: .9,
			style: { pointerEvents: "none" },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: 0,
				y: 3.2,
				width: 9,
				height: 6.8,
				rx: 1.4,
				fill: "var(--muted)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M1.6 3.2 V1.9 a2.9 2.9 0 0 1 5.8 0 V3.2",
				fill: "none",
				stroke: "var(--muted)",
				strokeWidth: 1.3
			})]
		}),
		!isLed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
			x: w / 2,
			y: isSwitch || isProbe ? 16 : n.type === "VCC" || n.type === "GND" ? h / 2 + 4 : 16,
			textAnchor: "middle",
			fontSize: n.type === "CUSTOM" ? 11 : 12,
			fontWeight: 700,
			fill: "var(--text)",
			style: {
				letterSpacing: "0.04em",
				pointerEvents: "none"
			},
			children: title
		}),
		!isSwitch && !isProbe && !isLed && n.type !== "VCC" && n.type !== "GND" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: w - 11,
			cy: 10,
			r: 3.5,
			fill: col,
			filter: state === 1 && !reduceGlow ? "url(#glow)" : void 0
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
			x: w / 2,
			y: h - 6,
			textAnchor: "middle",
			fontSize: 7.5,
			fontWeight: 600,
			fill: "var(--muted)",
			stroke: "var(--node)",
			strokeWidth: 3,
			paintOrder: "stroke",
			style: { pointerEvents: "none" },
			children: n.delay != null && n.delay > 0 ? `Δ${n.delay}` : n.type === "CUSTOM" ? "BLOCK" : `${ins}→${outs}`
		})] }),
		isSwitch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
			onPointerDown: (e) => {
				e.stopPropagation();
				onToggle();
			},
			style: { cursor: "pointer" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: 16,
					y: 24,
					width: 48,
					height: 18,
					rx: 9,
					fill: state === 1 ? "var(--hi)" : "var(--lo)",
					opacity: .85
				}),
				glossy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: 16,
					y: 24,
					width: 48,
					height: 9,
					rx: 9,
					fill: "url(#nodeBevel)",
					style: { pointerEvents: "none" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: state === 1 ? 55 : 25,
					cy: 33,
					r: 7,
					fill: "#fff",
					filter: reduceGlow ? void 0 : "url(#nodeShadow)"
				}),
				glossy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: state === 1 ? 55 : 25,
					cy: 33,
					r: 7,
					fill: "url(#domeGloss)",
					style: { pointerEvents: "none" }
				})
			]
		}),
		isProbe && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: w / 2,
				cy: 34,
				r: 9,
				fill: col,
				opacity: state === "X" || state === "Z" ? .45 : 1,
				filter: state === 1 && !reduceGlow ? "url(#glow)" : void 0
			}),
			glossy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: w / 2,
				cy: 34,
				r: 9,
				fill: "url(#domeGloss)",
				style: { pointerEvents: "none" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: w / 2,
				y: 38,
				textAnchor: "middle",
				fontSize: 9,
				fontWeight: 700,
				fill: "var(--node)",
				children: state
			}),
			n.expected != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpectBadge, {
				x: w - 9,
				y: 9,
				pass: expectPass
			})
		] }),
		isLed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: w / 2,
				cy: h / 2,
				r: 18,
				fill: col,
				opacity: state === 1 ? 1 : .25,
				filter: state === 1 && !reduceGlow ? "url(#glow)" : void 0
			}),
			glossy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: w / 2,
				cy: h / 2,
				r: 18,
				fill: "url(#domeGloss)",
				opacity: state === 1 ? 1 : .6,
				style: { pointerEvents: "none" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: w / 2,
				y: h - 6,
				textAnchor: "middle",
				fontSize: 8,
				fill: "var(--muted)",
				children: title
			}),
			n.expected != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpectBadge, {
				x: w - 6,
				y: 6,
				pass: expectPass
			})
		] })
	] });
	const ports = [];
	for (let i = 0; i < ins; i++) {
		const p = localPort(n, defs, "in", i);
		const v = sim.nodeIn.get(inKey(n.id, i)) ?? "X";
		const k = `${n.id}|in|${i}`;
		const label = names.ins[i];
		ports.push(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
			onPointerDown: (e) => onPortDown(e, n.id, "in", i),
			onPointerEnter: (e) => onHoverPort(k, e),
			onPointerLeave: () => onHoverPort(null),
			style: { cursor: "crosshair" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: p.x,
					cy: p.y,
					r: 10,
					fill: "transparent"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: p.x,
					cy: p.y,
					r: hoverPort === k ? 6.5 : 5,
					fill: valColor(v),
					stroke: "var(--panel)",
					strokeWidth: 1.4
				}),
				label && ins > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: p.x + 7,
					y: p.y + 3,
					fontSize: 7,
					fontWeight: 600,
					fill: "var(--muted)",
					stroke: "var(--node)",
					strokeWidth: 2.5,
					paintOrder: "stroke",
					style: { pointerEvents: "none" },
					children: label
				})
			]
		}, k));
	}
	for (let i = 0; i < outs; i++) {
		const p = localPort(n, defs, "out", i);
		const v = sim.nodeOut.get(outKey(n.id, i)) ?? "X";
		const k = `${n.id}|out|${i}`;
		const label = names.outs[i];
		ports.push(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
			onPointerDown: (e) => onPortDown(e, n.id, "out", i),
			onPointerEnter: (e) => onHoverPort(k, e),
			onPointerLeave: () => onHoverPort(null),
			style: { cursor: "crosshair" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: p.x,
					cy: p.y,
					r: 10,
					fill: "transparent"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: p.x,
					cy: p.y,
					r: hoverPort === k ? 6.5 : 5,
					fill: valColor(v),
					stroke: "var(--panel)",
					strokeWidth: 1.4
				}),
				label && outs > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: p.x - 7,
					y: p.y + 3,
					textAnchor: "end",
					fontSize: 7,
					fontWeight: 600,
					fill: "var(--muted)",
					stroke: "var(--node)",
					strokeWidth: 2.5,
					paintOrder: "stroke",
					style: { pointerEvents: "none" },
					children: label
				})
			]
		}, k));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
		transform: `translate(${n.x},${n.y}) rotate(${n.rot},${w / 2},${h / 2})`,
		opacity: dimmed ? .22 : 1,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {
			onPointerDown: onBodyDown,
			onContextMenu,
			onDoubleClick,
			onPointerEnter: onHoverStart,
			onPointerLeave: onHoverEnd,
			style: { cursor: n.locked ? "not-allowed" : "move" },
			children: body
		}), ports]
	});
}
function clockDriver(circuit, nodeId, seen = /* @__PURE__ */ new Set()) {
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
function clockDomains(circuit, defs) {
	const map = /* @__PURE__ */ new Map();
	for (const n of circuit.nodes.filter((x) => x.type === "CLOCK")) {
		const d = n.domain || n.label || "clk";
		const cur = map.get(d) ?? {
			domain: d,
			clocks: [],
			seq: []
		};
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
		const cur = map.get(d) ?? {
			domain: d,
			clocks: [],
			seq: []
		};
		cur.seq.push(n.id);
		map.set(d, cur);
	}
	return [...map.values()];
}
function comboCycles(circuit) {
	const seq = new Set(circuit.nodes.filter((n) => isSequential(n.type) || n.type === "CLOCK" || n.type === "INPUT").map((n) => n.id));
	const adj = /* @__PURE__ */ new Map();
	for (const n of circuit.nodes) adj.set(n.id, []);
	for (const w of circuit.wires) {
		if (seq.has(w.to.node)) continue;
		adj.get(w.from.node)?.push(w.to.node);
	}
	const cycles = [];
	const color = /* @__PURE__ */ new Map();
	const stack = [];
	const visit = (id) => {
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
function criticalPath(circuit, defs) {
	const seqBreak = new Set(circuit.nodes.filter((n) => isSequential(n.type) || n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC" || n.type === "GND").map((n) => n.id));
	const adj = /* @__PURE__ */ new Map();
	for (const n of circuit.nodes) adj.set(n.id, []);
	for (const w of circuit.wires) adj.get(w.from.node)?.push(w.to.node);
	const memo = /* @__PURE__ */ new Map();
	const walk = (id, seen) => {
		if (memo.has(id)) return memo.get(id);
		if (seen.has(id)) return {
			delay: 0,
			path: [id]
		};
		const n = circuit.nodes.find((x) => x.id === id);
		if (!n) return {
			delay: 0,
			path: []
		};
		const self = seqBreak.has(id) ? 0 : nodeDelay(n);
		const nextSeen = new Set(seen);
		nextSeen.add(id);
		let best = {
			delay: self,
			path: [id]
		};
		for (const nxt of adj.get(id) ?? []) {
			const child = walk(nxt, nextSeen);
			if (self + child.delay > best.delay) best = {
				delay: self + child.delay,
				path: [id, ...child.path]
			};
		}
		memo.set(id, best);
		return best;
	};
	let best = {
		delay: 0,
		path: []
	};
	for (const n of circuit.nodes) {
		if (!(n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC")) continue;
		const r = walk(n.id, /* @__PURE__ */ new Set());
		if (r.delay > best.delay) best = r;
	}
	return best;
}
function inspectCircuit(circuit, defs, sim) {
	const issues = [];
	if (!sim.stable) issues.push({
		level: "err",
		code: "OSC",
		msg: "Netlist did not settle — combinational loop or bus fight."
	});
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
			nodeId: n.id
		});
	}
	for (const id of sim.contention) {
		const n = circuit.nodes.find((x) => x.id === id);
		issues.push({
			level: "err",
			code: "BUSX",
			msg: `${n ? nodeTitle(n, defs) : id} has contended drivers (X).`,
			nodeId: id
		});
	}
	for (const n of circuit.nodes.filter((x) => x.type === "CUSTOM" && !defs.find((d) => d.id === x.defId))) issues.push({
		level: "err",
		code: "DEF",
		msg: `Missing definition for ${n.id}.`,
		nodeId: n.id
	});
	const fanout = /* @__PURE__ */ new Map();
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
			nodeId: id
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
			nodeId: cyc[0]
		});
	}
	const domains = clockDomains(circuit, defs);
	const seqDomain = /* @__PURE__ */ new Map();
	for (const d of domains) for (const id of d.seq) seqDomain.set(id, d.domain);
	for (const w of circuit.wires) {
		const a = seqDomain.get(w.from.node);
		const bNode = circuit.nodes.find((n) => n.id === w.to.node);
		if (!a || !bNode || !isSequential(bNode.type)) continue;
		const b = seqDomain.get(bNode.id);
		if (b && a !== b && b !== "ungated") issues.push({
			level: "warn",
			code: "CDC",
			msg: `Clock-domain crossing ${a} → ${b} at ${nodeTitle(bNode, defs)}.`,
			nodeId: bNode.id
		});
	}
	if (!issues.length) issues.push({
		level: "info",
		code: "OK",
		msg: "No structural issues. Netlist is driven and stable."
	});
	return issues;
}
var chip = (v) => v === 1 ? "text-[var(--hi)] ring-[var(--hi)]/40 bg-[var(--hi)]/10" : v === 0 ? "text-[var(--muted)] ring-[var(--border)] bg-[var(--panel2)]" : v === "Z" ? "text-[var(--zz)] ring-[var(--zz)]/40 bg-[var(--zz)]/10" : "text-[var(--xx)] ring-[var(--xx)]/40 bg-[var(--xx)]/10";
function ValChip({ v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-grid h-5 min-w-5 place-items-center rounded px-1 text-micro font-bold ring-1 ${chip(v)}`,
		children: v
	});
}
function Inspector({ ed, sim }) {
	const [tab, setTab] = (0, import_react.useState)("props");
	const [packName, setPackName] = (0, import_react.useState)("");
	const { doc, selection } = ed;
	const node = selection.length === 1 ? doc.nodes.find((n) => n.id === selection[0]) ?? null : null;
	const expectSummary = (0, import_react.useMemo)(() => {
		let pass = 0;
		let fail = 0;
		let pending = 0;
		for (const n of doc.nodes) {
			if (n.expected == null || n.type !== "OUTPUT" && n.type !== "LED") continue;
			const v = sim.nodeIn.get(inKey(n.id, 0)) ?? "X";
			if (v !== 0 && v !== 1) pending++;
			else if (v === n.expected) pass++;
			else fail++;
		}
		const total = pass + fail + pending;
		return total ? {
			pass,
			fail,
			pending,
			total
		} : null;
	}, [doc.nodes, sim.nodeIn]);
	const update = (patch) => node && ed.commit((d) => ({
		...d,
		nodes: d.nodes.map((n) => n.id === node.id ? {
			...n,
			...patch
		} : n)
	}), "property");
	const ctt = (0, import_react.useMemo)(() => tab === "truth" && !node ? circuitTruthTable(doc, doc.defs) : null, [
		tab,
		node,
		doc
	]);
	const issues = (0, import_react.useMemo)(() => inspectCircuit(doc, doc.defs, sim), [doc, sim]);
	const path = (0, import_react.useMemo)(() => criticalPath(doc, doc.defs), [doc]);
	const domains = (0, import_react.useMemo)(() => clockDomains(doc, doc.defs), [doc]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-1 border-b border-[var(--border)] p-2",
			children: [
				"props",
				"truth",
				"timing",
				"lint"
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setTab(t),
				className: `flex-1 rounded-md px-1.5 py-1.5 text-micro font-bold uppercase tracking-[0.12em] transition ${tab === t ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--panel2)]"}`,
				children: t === "props" ? "Inspect" : t === "truth" ? "Truth" : t === "timing" ? "Timing" : "Lint"
			}, t))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 space-y-4 overflow-y-auto p-3",
			children: [
				tab === "props" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [!node && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: selection.length > 1 ? `${selection.length} nodes selected` : "No selection" }),
					selection.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Pack into component",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: packName,
								onChange: (e) => setPackName(e.target.value),
								placeholder: "NAME",
								className: "ui-input min-w-0 flex-1"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									ed.makeCustom(packName || "BLOCK");
									setPackName("");
								},
								className: "ui-btn-primary",
								children: "Pack"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-micro leading-relaxed text-[var(--muted)]",
							children: "Need switches (inputs) and probes or LEDs (outputs)."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Circuit",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Name",
								v: doc.name || "Untitled"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Nodes",
								v: String(doc.nodes.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Wires",
								v: String(doc.wires.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 py-0.5 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--muted)]",
									children: "Floating"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--text)]",
										children: sim.floating.length
									}), sim.floating.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--panel2)]",
										onClick: () => {
											const ids = Array.from(new Set(sim.floating.map((k) => k.split(":")[0])));
											ed.setSelection(ids);
											ed.setSelectedWires([]);
										},
										children: "Locate"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Settled",
								v: sim.stable ? `yes · ${sim.iterations} it` : "oscillating"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Time",
								v: `t=${sim.time}`
							}),
							expectSummary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Tests",
								v: expectSummary.fail > 0 ? `${expectSummary.pass}/${expectSummary.total} passing · ${expectSummary.fail} failing` : expectSummary.pending > 0 ? `${expectSummary.pass}/${expectSummary.total} passing · ${expectSummary.pending} pending` : `${expectSummary.pass}/${expectSummary.total} passing`
							})
						]
					})
				] }), node && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Identity",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Type",
								v: node.type
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "ID",
								v: node.id,
								mono: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-2 block text-micro uppercase tracking-wider text-[var(--muted)]",
								children: "Label"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: node.label ?? "",
								onChange: (e) => update({ label: e.target.value }),
								placeholder: nodeTitle(node, doc.defs),
								className: "ui-input mt-1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-3 flex items-center gap-2 text-xs text-[var(--text)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: !!node.watch,
									onChange: (e) => update({ watch: e.target.checked })
								}), "Pin on waveform"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Geometry",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
								label: "X",
								value: node.x,
								onChange: (v) => update({ x: v })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
								label: "Y",
								value: node.y,
								onChange: (v) => update({ y: v })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs text-[var(--muted)]",
								children: [
									"Rotation ",
									node.rot,
									"°"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: ed.rotateSelected,
								className: "ui-btn-ghost",
								children: "Rotate 90°"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Delay",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
							label: "Propagation (ticks)",
							value: node.delay ?? (node.type === "CUSTOM" ? 0 : CATALOG[node.type]?.defaultDelay ?? 0),
							onChange: (v) => update({ delay: Math.max(0, v) })
						})
					}),
					isGate(node.type) && GATE_INFO[node.type].maxIn > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Fan-in",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fanin, {
							node,
							update
						})
					}),
					node.type === "BUS" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Drivers",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fanin, {
							node,
							update,
							min: 2,
							max: 8
						})
					}),
					node.type === "CLOCK" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Clock",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
								label: "Period (ticks)",
								value: node.period ?? 12,
								onChange: (v) => update({ period: Math.max(2, v) })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-2 block text-micro uppercase tracking-wider text-[var(--muted)]",
								children: "Domain"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: node.domain ?? "clk",
								onChange: (e) => update({ domain: e.target.value }),
								className: "ui-input mt-1"
							})
						]
					}),
					node.type === "COUNTER" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Width",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
							label: "Bits",
							value: node.bits ?? 4,
							onChange: (v) => update({ bits: Math.min(8, Math.max(2, v)) })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Ports",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortStates, {
							node,
							ed,
							sim
						})
					}),
					isGate(node.type) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Boolean",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs leading-relaxed text-[var(--muted)]",
							children: GATE_INFO[node.type].desc
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", {
							className: "mt-2 block rounded-md bg-[var(--panel2)] px-2 py-1.5 text-xs text-[var(--accent)]",
							children: ["Y = ", GATE_INFO[node.type].expr(Array.from({ length: node.inputs }, (_, i) => String.fromCharCode(65 + i)))]
						})]
					})
				] })] }),
				tab === "truth" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					node && isGate(node.type) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: `${node.type} truth table`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateTable, {
							type: node.type,
							n: node.inputs,
							live: Array.from({ length: node.inputs }, (_, i) => sim.nodeIn.get(inKey(node.id, i)) ?? "X")
						})
					}),
					!node && ctt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Circuit truth table",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full border-collapse text-micro",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "text-[var(--muted)]",
									children: [ctt.switches.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "border-b border-[var(--border)] px-1.5 py-1 font-semibold",
										children: nodeTitle(s, doc.defs)
									}, s.id)), ctt.probes.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "border-b border-[var(--border)] bg-[var(--panel2)] px-1.5 py-1 font-semibold text-[var(--accent)]",
										children: nodeTitle(p, doc.defs)
									}, p.id))]
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: ctt.rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "text-center",
									children: [r.ins.map((v, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-1.5 py-0.5 text-[var(--text)]",
										children: v
									}, j)), r.outs.map((v, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-1.5 py-0.5 font-bold",
										style: { color: v === 1 ? "var(--hi)" : v === "X" || v === "Z" ? "var(--xx)" : "var(--muted)" },
										children: v
									}, j))]
								}, i)) })]
							})
						})
					}),
					!node && !ctt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "Add switches and probes (≤ 8 switches) to generate a truth table." }),
					node && !isGate(node.type) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "Select a logic gate, or deselect to view the circuit table." })
				] }),
				tab === "timing" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Critical path",
						children: path.path.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Delay",
							v: `${path.delay} ticks`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs leading-relaxed text-[var(--text)]",
							children: path.path.map((id) => {
								const n = doc.nodes.find((x) => x.id === id);
								return n ? nodeTitle(n, doc.defs) : id;
							}).join(" → ")
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[var(--muted)]",
							children: "Add driven logic to measure a path."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Clock domains",
						children: [!domains.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[var(--muted)]",
							children: "No clocks in this circuit."
						}), domains.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold text-[var(--text)]",
								children: d.domain
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[var(--muted)]",
								children: [
									d.clocks.length,
									" clock · ",
									d.seq.length,
									" sequential"
								]
							})]
						}, d.domain))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: "Engine",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Time",
								v: String(sim.time)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Iterations",
								v: String(sim.iterations)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Flat nodes",
								v: String(sim.values.size)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								k: "Contention",
								v: String(sim.contention.length)
							})
						]
					})
				] }),
				tab === "lint" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Diagnostics",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-1",
							children: issues.slice(0, 24).map((i, k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2 rounded-md bg-[var(--panel2)] px-2 py-1.5 text-micro leading-snug",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: i.level === "err" ? "var(--xx)" : i.level === "info" ? "var(--hi)" : "var(--muted)" },
									children: i.level === "err" ? "×" : i.level === "info" ? "✓" : "!"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--text)]",
									children: i.msg
								})]
							}, k))
						})
					}),
					node && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Trace",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trace, {
							ed,
							sim,
							node
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						title: "Verilog preview",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "max-h-48 overflow-auto rounded-md bg-[var(--panel2)] p-2 text-micro text-[var(--text)]",
							children: emitVerilog(doc).slice(0, 1200)
						})
					})
				] })
			]
		})]
	});
}
function Fanin({ node, update, min, max }) {
	const spec = isGate(node.type) ? GATE_INFO[node.type] : {
		minIn: min ?? 2,
		maxIn: max ?? 8
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: node.inputs <= spec.minIn,
				onClick: () => update({ inputs: node.inputs - 1 }),
				className: "h-8 w-8 rounded-md border border-[var(--border)] text-[var(--text)] disabled:opacity-30",
				children: "−"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-8 text-center text-sm font-bold text-[var(--text)]",
				children: node.inputs
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: node.inputs >= spec.maxIn,
				onClick: () => update({ inputs: node.inputs + 1 }),
				className: "h-8 w-8 rounded-md border border-[var(--border)] text-[var(--text)] disabled:opacity-30",
				children: "+"
			})
		]
	});
}
function PortStates({ node, ed, sim }) {
	const names = specOf(node, ed.doc.defs);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [names.ins.map((nm, i) => {
			const v = sim.nodeIn.get(inKey(node.id, i)) ?? "X";
			const floating = sim.floating.includes(inKey(node.id, i));
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-14 text-[var(--muted)]",
						children: nm
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ValChip, { v }),
					floating && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-micro text-[var(--xx)]",
						children: "float"
					})
				]
			}, i);
		}), names.outs.map((nm, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-xs",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-14 text-[var(--muted)]",
				children: nm
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ValChip, { v: sim.nodeOut.get(outKey(node.id, i)) ?? "X" })]
		}, "o" + i))]
	});
}
function GateTable({ type, n, live }) {
	const rows = gateTruthTable(type, n);
	const cur = live.map((v) => v === "X" || v === "Z" ? null : v);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
		className: "w-full border-collapse text-xs",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
			className: "text-[var(--muted)]",
			children: [Array.from({ length: Math.min(n, 4) }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
				className: "border-b border-[var(--border)] px-2 py-1 font-semibold",
				children: String.fromCharCode(65 + i)
			}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
				className: "border-b border-[var(--border)] bg-[var(--panel2)] px-2 py-1 font-semibold text-[var(--accent)]",
				children: "Y"
			})]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => {
			const match = cur.every((c, j) => c === null || c === r.ins[j]) && !cur.includes(null);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: `text-center ${match ? "bg-[var(--accent)]/12" : ""}`,
				children: [r.ins.map((v, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: "px-2 py-0.5 text-[var(--text)]",
					children: v
				}, j)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: "px-2 py-0.5 font-bold",
					style: { color: r.out === 1 ? "var(--hi)" : "var(--muted)" },
					children: r.out
				})]
			}, i);
		}) })]
	});
}
function Trace({ ed, sim, node }) {
	const { doc } = ed;
	const trace = [];
	const seen = /* @__PURE__ */ new Set();
	const walk = (id, depth) => {
		if (depth > 6 || seen.has(id)) return;
		seen.add(id);
		const n = doc.nodes.find((x) => x.id === id);
		if (!n) return;
		trace.push({
			depth,
			label: nodeTitle(n, doc.defs),
			val: sim.nodeOut.get(outKey(n.id, 0)) ?? "X"
		});
		doc.wires.filter((w) => w.to.node === id).forEach((w) => walk(w.from.node, depth + 1));
	};
	walk(node.id, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: trace.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 py-0.5 text-xs",
		style: { paddingLeft: t.depth * 12 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[var(--muted)]",
				children: t.depth ? "└" : "●"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[var(--text)]",
				children: t.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ValChip, { v: t.val })
		]
	}, i)) });
}
function Card({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
			className: "ui-kicker mb-2",
			children: title
		}), children]
	});
}
function Row({ k, v, mono }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-2 py-0.5 text-xs",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[var(--muted)]",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `truncate text-[var(--text)] ${mono ? "font-mono text-micro" : ""}`,
			children: v
		})]
	});
}
function NumField({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-micro uppercase tracking-wider text-[var(--muted)]",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "number",
			value,
			onChange: (e) => onChange(Number(e.target.value)),
			className: "ui-input mt-1"
		})]
	});
}
function Empty({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--muted)]",
		children: text
	});
}
var ORDER = [
	"gates",
	"io",
	"seq",
	"combo",
	"bus",
	"timing"
];
function Tile({ label, hint, payload, onAdd, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		draggable: true,
		onDragStart: (e) => {
			e.dataTransfer.setData("application/x-node", payload);
			e.dataTransfer.effectAllowed = "copy";
		},
		onClick: onAdd,
		title: hint,
		className: "group flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel2)] px-2.5 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--panel)] active:scale-[0.98]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid h-8 w-8 shrink-0 place-items-center rounded-md text-micro font-bold tracking-tight",
			style: {
				background: accent ? "var(--accent)" : "color-mix(in srgb, var(--accent) 16%, transparent)",
				color: accent ? "var(--accent-fg)" : "var(--accent)"
			},
			children: label.slice(0, 4)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate text-xs font-semibold text-[var(--text)]",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate text-micro text-[var(--muted)]",
				children: hint
			})]
		})]
	});
}
function Library({ ed, centerWorld }) {
	const [q, setQ] = (0, import_react.useState)("");
	const add = (type, defId) => {
		const c = centerWorld();
		ed.addNode(type, c.x + (Math.random() * 60 - 30), c.y + (Math.random() * 60 - 30), defId);
	};
	const items = (0, import_react.useMemo)(() => {
		const all = Object.values(CATALOG);
		const needle = q.trim().toLowerCase();
		return ORDER.map((g) => ({
			g,
			list: all.filter((s) => s.group === g && (!needle || `${s.name} ${s.hint} ${s.type}`.toLowerCase().includes(needle)))
		})).filter((x) => x.list.length);
	}, [q]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-b border-[var(--border)] p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "ui-kicker",
				children: "Library"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: q,
				onChange: (e) => setQ(e.target.value),
				placeholder: "Search components",
				className: "ui-input mt-2"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 space-y-4 overflow-y-auto p-3",
			children: [items.map(({ g, list }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between px-0.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "ui-kicker",
						children: GROUP_LABEL[g]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded px-1.5 py-0.5 text-micro font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]",
						children: list.length
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 gap-1.5",
					children: list.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
						label: s.name,
						hint: s.hint,
						payload: JSON.stringify({ type: s.type }),
						onAdd: () => add(s.type),
						accent: g === "io"
					}, s.type))
				})]
			}, g)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "flex items-center justify-between px-0.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "ui-kicker",
							children: "Custom"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded px-1.5 py-0.5 text-micro font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]",
							children: ed.doc.defs.length
						})]
					}),
					!ed.doc.defs.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-3 text-micro leading-relaxed text-[var(--muted)]",
						children: "Select a subcircuit with switches and probes, then Pack in the inspector."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 gap-1.5",
						children: ed.doc.defs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "min-w-0 flex-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
									label: d.name,
									hint: `${d.inputs.length} in · ${d.outputs.length} out`,
									payload: JSON.stringify({
										type: "CUSTOM",
										defId: d.id
									}),
									onAdd: () => add("CUSTOM", d.id)
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => ed.commit((doc) => ({
									...doc,
									defs: doc.defs.filter((x) => x.id !== d.id),
									nodes: doc.nodes.filter((n) => n.defId !== d.id)
								}), "remove component"),
								className: "grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--xx)] hover:text-[var(--xx)]",
								title: "Delete component",
								children: "×"
							})]
						}, d.id))
					})
				]
			})]
		})]
	});
}
function B({ children, onClick, active, disabled, title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		disabled,
		title,
		className: `inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 disabled:opacity-30 ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-[var(--border)] bg-[var(--panel2)] text-[var(--text)] hover:border-[var(--accent)]"}`,
		children
	});
}
var Div = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" });
function Toolbar(p) {
	const { ed, sim } = p;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: () => p.setRunning(!p.running),
				active: p.running,
				title: "Run / pause (P)",
				children: [p.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline",
					children: p.running ? "Pause" : "Run"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: p.step,
				title: "Step one tick (.)",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden md:inline",
					children: "Step"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: p.resetSim,
				title: "Reset simulation",
				children: "Reset"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 px-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden text-micro uppercase tracking-wider text-[var(--muted)] sm:inline",
					children: "Speed"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 1,
					max: 20,
					value: p.speed,
					onChange: (e) => p.setSpeed(+e.target.value),
					className: "h-1 w-16 accent-[var(--accent)] sm:w-20"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => p.setTimingMode(p.timingMode === "zero" ? "unit" : "zero"),
				active: p.timingMode === "unit",
				title: "Unit-delay propagation",
				children: "Δt"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Div, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: ed.undo,
				disabled: !ed.canUndo,
				title: ed.undoLabel ? `Undo ${ed.undoLabel}` : "Undo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: ed.redo,
				disabled: !ed.canRedo,
				title: ed.redoLabel ? `Redo ${ed.redoLabel}` : "Redo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Redo2, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => ed.duplicateSelected(),
				disabled: !ed.selection.length,
				title: "Duplicate",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: ed.rotateSelected,
				disabled: !ed.selection.length,
				title: "Rotate",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: ed.deleteSelected,
				disabled: !ed.selection.length && !ed.selectedWires.length,
				title: "Delete",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Div, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => ed.alignSelected("vspace"),
				disabled: ed.selection.length < 2,
				title: "Distribute vertically",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignVerticalSpaceAround, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => ed.alignSelected("hspace"),
				disabled: ed.selection.length < 2,
				title: "Distribute horizontally",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignHorizontalSpaceAround, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => p.setSnapOn(!p.snapOn),
				active: p.snapOn,
				title: "Snap to grid",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Magnet, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: () => p.setWireStyle(p.wireStyle === "curve" ? "ortho" : "curve"),
				title: "Wire routing",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spline, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden lg:inline",
					children: p.wireStyle === "curve" ? "Curve" : "Ortho"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => p.setWheelZoom(!p.wheelZoom),
				active: p.wheelZoom,
				title: "Mouse wheel zooms",
				children: "Wheel z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: () => p.setReduceGlow(!p.reduceGlow),
				active: p.reduceGlow,
				title: "Turn off glow/shadow effects — helps performance and clarity on dense circuits",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "lg:hidden",
					children: "Glow"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden lg:inline",
					children: p.reduceGlow ? "Glow off" : "Glow on"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: () => p.setGlossy(!p.glossy),
				active: p.glossy,
				title: "Glossy bevel/highlight look on components — off is flat",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "lg:hidden",
					children: "Gloss"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden lg:inline",
					children: p.glossy ? "Glossy" : "Flat"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Div, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => p.setView((v) => ({
					...v,
					z: clampZ(v.z / 1.2)
				})),
				title: "Zoom out",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomOut, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "w-12 text-center text-xs font-semibold tabular-nums text-[var(--muted)]",
				children: [Math.round(p.view.z * 100), "%"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(B, {
				onClick: () => p.setView((v) => ({
					...v,
					z: clampZ(v.z * 1.2)
				})),
				title: "Zoom in",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomIn, { className: "size-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(B, {
				onClick: p.fit,
				title: "Fit (0 / F / double-click)",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline",
					children: "Fit"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-3 pr-1 text-micro uppercase tracking-wider text-[var(--muted)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:inline",
						children: ["t ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "tabular-nums text-[var(--text)]",
							children: p.tick
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["nodes ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "tabular-nums text-[var(--text)]",
						children: ed.doc.nodes.length
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden md:inline",
						children: ["nets ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "tabular-nums text-[var(--text)]",
							children: ed.doc.wires.length
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "inline-block h-2 w-2 rounded-full",
							style: { background: sim.stable ? "var(--hi)" : "var(--xx)" }
						}), sim.stable ? "stable" : "unstable"]
					})
				]
			})
		]
	});
}
var col = (v) => v === 1 ? "var(--hi)" : v === 0 ? "var(--lo)" : v === "Z" ? "var(--zz)" : "var(--xx)";
function Waveform({ wave, probes, time, onClose, onClear, onSelect }) {
	const canvasRef = (0, import_react.useRef)(null);
	const wrapRef = (0, import_react.useRef)(null);
	const [cursor, setCursor] = (0, import_react.useState)(null);
	const [span, setSpan] = (0, import_react.useState)(160);
	const [follow, setFollow] = (0, import_react.useState)(true);
	const start = (0, import_react.useMemo)(() => {
		if (!wave.length) return 0;
		const last = wave[wave.length - 1].t;
		if (follow) return Math.max(0, last - span + 1);
		return Math.max(0, (cursor ?? last) - Math.floor(span / 2));
	}, [
		wave,
		span,
		follow,
		cursor
	]);
	const tracks = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const p of probes) m.set(p.key, []);
		for (const s of wave) for (const p of probes) {
			const v = s.vals[p.key];
			if (v === void 0) continue;
			const arr = m.get(p.key);
			if (arr.length && arr[arr.length - 1].t === s.t) arr[arr.length - 1].v = v;
			else arr.push({
				t: s.t,
				v
			});
		}
		return m;
	}, [wave, probes]);
	const sampleAt = (0, import_react.useMemo)(() => (key, t) => {
		const arr = tracks.get(key);
		if (!arr || !arr.length) return "X";
		let lo = 0;
		let hi = arr.length - 1;
		if (t < arr[0].t) return "X";
		while (lo < hi) {
			const mid = lo + hi + 1 >> 1;
			if (arr[mid].t <= t) lo = mid;
			else hi = mid - 1;
		}
		return arr[lo].v;
	}, [tracks]);
	(0, import_react.useEffect)(() => {
		const c = canvasRef.current;
		const wrap = wrapRef.current;
		if (!c || !wrap) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const w = wrap.clientWidth;
		const rowH = 28;
		const h = Math.max(rowH, probes.length * rowH);
		c.width = Math.max(1, Math.floor(w * dpr));
		c.height = Math.max(1, Math.floor(h * dpr));
		c.style.width = `${w}px`;
		c.style.height = `${h}px`;
		const ctx = c.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		const px = w / Math.max(1, span);
		probes.forEach((p, i) => {
			const y0 = i * rowH;
			ctx.fillStyle = i % 2 ? "color-mix(in srgb, var(--panel2) 55%, transparent)" : "transparent";
			ctx.fillRect(0, y0, w, rowH);
			const hi = y0 + 6;
			const lo = y0 + rowH - 6;
			const mid = y0 + rowH / 2;
			let prev = sampleAt(p.key, start);
			for (let t = start; t <= start + span; t++) {
				const v = sampleAt(p.key, t);
				const x0 = (t - start) * px;
				const yPrev = prev === 1 ? hi : prev === 0 ? lo : mid;
				const yCur = v === 1 ? hi : v === 0 ? lo : mid;
				ctx.beginPath();
				ctx.strokeStyle = col(v === "X" || v === "Z" ? v : prev);
				ctx.lineWidth = 1.6;
				if (v !== prev) {
					ctx.moveTo(x0, yPrev);
					ctx.lineTo(x0, yCur);
				} else ctx.moveTo(x0, yCur);
				ctx.lineTo(x0 + px + .4, yCur);
				if (v === "X") ctx.setLineDash([3, 3]);
				else if (v === "Z") ctx.setLineDash([1, 4]);
				else ctx.setLineDash([]);
				ctx.stroke();
				ctx.setLineDash([]);
				prev = v;
			}
		});
		const cx = ((cursor ?? time) - start) * px;
		ctx.beginPath();
		ctx.strokeStyle = "var(--accent)";
		ctx.lineWidth = 1;
		ctx.moveTo(cx, 0);
		ctx.lineTo(cx, h);
		ctx.stroke();
	}, [
		wave,
		probes,
		start,
		span,
		cursor,
		time,
		sampleAt
	]);
	const onWheel = (e) => {
		e.stopPropagation();
		if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
			setFollow(false);
			setSpan((s) => Math.min(640, Math.max(24, Math.round(s * (e.deltaY > 0 ? 1.12 : .88)))));
		} else {
			setFollow(false);
			setCursor((c) => Math.max(0, (c ?? time) + Math.round(e.deltaX / 8)));
		}
	};
	const onClick = (e) => {
		const r = wrapRef.current?.getBoundingClientRect();
		if (!r) return;
		const x = e.clientX - r.left;
		const t = start + Math.round(x / r.width * span);
		setFollow(false);
		setCursor(t);
	};
	const cur = cursor ?? time;
	const readout = (key) => sampleAt(key, cur);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col border-t border-[var(--border)] bg-[var(--panel)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-9 shrink-0 items-center gap-2 px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ui-kicker",
						children: "Waveform"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs tabular-nums text-[var(--muted)]",
						children: ["t=", time]
					}),
					cursor != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs tabular-nums text-[var(--accent)]",
						children: ["cursor ", cursor]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "ml-2 flex items-center gap-1.5 text-xs text-[var(--muted)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: follow,
							onChange: (e) => setFollow(e.target.checked)
						}), "follow"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ui-btn-ghost ml-auto",
						onClick: onClear,
						children: "Clear"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ui-btn-ghost",
						onClick: onClose,
						"aria-label": "Close waveform",
						children: "Close"
					})
				]
			}),
			!probes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-3 pb-3 text-xs text-[var(--muted)]",
				children: "Pin a node in the inspector or select I/O to plot traces."
			}),
			!!probes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "w-28 shrink-0 overflow-y-auto border-r border-[var(--border)]",
					children: probes.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex h-7 items-center justify-between px-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "truncate text-left text-[var(--text)] hover:text-[var(--accent)]",
							title: "Select on canvas",
							onClick: () => onSelect?.(p.key.split(":")[0]),
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							style: { color: col(readout(p.key)) },
							children: readout(p.key)
						})]
					}, p.key))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: wrapRef,
					className: "min-w-0 flex-1 overflow-hidden",
					onWheel,
					onClick,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						className: "block"
					})
				})]
			})
		]
	});
}
var SHORTCUTS = [
	{
		keys: "⌘ Z",
		action: "Undo"
	},
	{
		keys: "⌘ ⇧ Z / ⌘ Y",
		action: "Redo"
	},
	{
		keys: "⌘ C / X / V",
		action: "Copy / cut / paste"
	},
	{
		keys: "⌘ D",
		action: "Duplicate"
	},
	{
		keys: "⌘ A",
		action: "Select all"
	},
	{
		keys: "⌘ S",
		action: "Save as JSON"
	},
	{
		keys: "⌘ O",
		action: "Open files"
	},
	{
		keys: "⌘ G",
		action: "Pack selection"
	},
	{
		keys: "Delete",
		action: "Delete"
	},
	{
		keys: "R",
		action: "Rotate"
	},
	{
		keys: "L",
		action: "Lock / unlock selection"
	},
	{
		keys: "Right-click",
		action: "Context menu (copy · paste · lock · …)"
	},
	{
		keys: "Arrows",
		action: "Nudge · ⇧ for 5×"
	},
	{
		keys: "Alt-drag",
		action: "Duplicate while moving"
	},
	{
		keys: "Space-drag / middle-drag",
		action: "Pan canvas"
	},
	{
		keys: "Two-finger",
		action: "Pan (trackpad)"
	},
	{
		keys: "Pinch / ⌘-scroll",
		action: "Zoom to cursor"
	},
	{
		keys: "P",
		action: "Run / pause"
	},
	{
		keys: ". ",
		action: "Step tick"
	},
	{
		keys: "F / 0",
		action: "Fit view"
	},
	{
		keys: "1",
		action: "100% zoom"
	},
	{
		keys: "?",
		action: "This list"
	},
	{
		keys: "Esc",
		action: "Clear selection"
	}
];
function ShortcutsModal({ open, onClose }) {
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-center bg-black/50 p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]",
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-semibold tracking-tight text-[var(--text)]",
					children: "Keyboard & gestures"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ui-btn-ghost",
					onClick: onClose,
					children: "Close"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1.5",
				children: SHORTCUTS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-3 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[var(--muted)]",
						children: s.action
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "rounded-md border border-[var(--border)] bg-[var(--panel2)] px-2 py-0.5 font-mono text-micro text-[var(--text)]",
						children: s.keys
					})]
				}, s.keys))
			})]
		})
	});
}
function FileDialog({ open, ed, onClose }) {
	const [name, setName] = (0, import_react.useState)(ed.fileName);
	(0, import_react.useEffect)(() => {
		if (open) setName(ed.fileName);
	}, [open, ed.fileName]);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-center bg-black/50 p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)]",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-[var(--border)] px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold text-[var(--text)]",
						children: "Files"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ui-btn-ghost",
						onClick: onClose,
						children: "Close"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: name,
							onChange: (e) => setName(e.target.value),
							className: "ui-input flex-1"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "ui-btn-primary",
							onClick: () => ed.renameFile(name.trim() || "Untitled"),
							children: "Rename"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ui-btn-ghost",
								onClick: () => {
									ed.newFile();
									onClose();
								},
								children: "New"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ui-btn-ghost",
								onClick: () => {
									ed.saveAs(name.trim() || "Untitled");
									toast.success("Saved a copy");
								},
								children: "Save as"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ui-btn-ghost",
								onClick: () => {
									ed.duplicateFile();
									toast.success("Duplicated");
								},
								children: "Duplicate"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "min-h-0 flex-1 overflow-y-auto px-2 pb-3",
					children: ed.projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							ed.openFile(p.id);
							onClose();
						},
						className: `flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${p.id === ed.currentId ? "bg-[var(--panel2)] text-[var(--accent)]" : "text-[var(--text)] hover:bg-[var(--panel2)]"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate font-semibold",
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 shrink-0 text-micro text-[var(--muted)]",
							children: new Date(p.updatedAt).toLocaleDateString()
						})]
					}) }, p.id))
				})
			]
		})
	});
}
function FileMenu({ ed, onOpenFiles, fileRef }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [samples, setSamples] = (0, import_react.useState)(false);
	const exportJson = () => {
		downloadJson(`${(ed.doc.name || "circuit").replace(/\s+/g, "-")}.logicforge.json`, ed.doc);
		toast.success("Exported JSON");
	};
	const exportV = () => {
		downloadText(`${(ed.doc.name || "circuit").replace(/\s+/g, "-")}.v`, emitVerilog(ed.doc));
		toast.success("Exported Verilog");
	};
	const exportVhdl = () => {
		downloadText(`${(ed.doc.name || "circuit").replace(/\s+/g, "-")}.vhd`, emitVhdl(ed.doc));
		toast.success("Exported VHDL");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "ui-btn-ghost",
			onClick: () => setOpen((o) => !o),
			children: "File"
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "fixed inset-0 z-30 cursor-default",
			onClick: () => {
				setOpen(false);
				setSamples(false);
			},
			"aria-label": "Close menu"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "absolute left-0 top-9 z-40 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: () => {
						ed.newFile();
						setOpen(false);
					},
					children: "New"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: () => {
						onOpenFiles();
						setOpen(false);
					},
					children: "Open…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: () => {
						ed.renameFile(ed.fileName);
						toast.success("Saved");
						setOpen(false);
					},
					children: "Save"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: () => {
						onOpenFiles();
						setOpen(false);
					},
					children: "Save as…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-1 h-px bg-[var(--border)]" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: exportJson,
					children: "Export JSON"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: exportV,
					children: "Export Verilog"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: exportVhdl,
					children: "Export VHDL"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
					onClick: () => fileRef.current?.click(),
					children: "Import JSON"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-1 h-px bg-[var(--border)]" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
						onClick: () => setSamples((s) => !s),
						children: "Samples"
					}), samples && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute left-full top-0 ml-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow)]",
						children: SAMPLES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
							onClick: () => {
								ed.load(s.build());
								setOpen(false);
								setSamples(false);
								toast.success(s.name);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block",
								children: [s.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-micro font-normal text-[var(--muted)]",
									children: s.hint
								})]
							})
						}, s.id))
					})]
				})
			]
		})] })]
	});
}
function MenuItem({ children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: "flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--panel2)]",
		children
	});
}
function importJsonFile(file, load) {
	const r = new FileReader();
	r.onload = () => {
		try {
			const d = JSON.parse(String(r.result));
			if (Array.isArray(d.nodes) && Array.isArray(d.wires)) {
				load({
					...d,
					defs: d.defs ?? []
				});
				toast.success("Imported circuit");
			} else toast.error("Not a LogicForge file");
		} catch {
			toast.error("Could not parse JSON");
		}
	};
	r.readAsText(file);
}
var base = (dark) => dark ? {
	"--shadow": "0 10px 40px rgba(0,0,0,.48)",
	"--hi": "#34d399",
	"--lo": "#94a3b8",
	"--xx": "#f59e0b",
	"--zz": "#67e8f9"
} : {
	"--shadow": "0 10px 28px rgba(15,23,42,.10)",
	"--hi": "#059669",
	"--lo": "#94a3b8",
	"--xx": "#d97706",
	"--zz": "#0891b2"
};
var THEMES = [
	{
		id: "blue-dark",
		name: "Navy · Dark",
		dark: true,
		vars: {
			...base(true),
			"--bg": "#0b1220",
			"--panel": "#0f1829",
			"--panel2": "#131f33",
			"--border": "#1e2c46",
			"--text": "#dbe6f6",
			"--muted": "#7d90ad",
			"--accent": "#4d9fff",
			"--accent2": "#1e6fd9",
			"--grid": "#16233a",
			"--grid2": "#1d2e4b",
			"--node": "#152238",
			"--accent-fg": "#0b1220"
		}
	},
	{
		id: "blue-light",
		name: "Navy · Light",
		dark: false,
		vars: {
			...base(false),
			"--bg": "#eef3fb",
			"--panel": "#ffffff",
			"--panel2": "#f4f8ff",
			"--border": "#d3e0f2",
			"--text": "#16263d",
			"--muted": "#60789a",
			"--accent": "#2f7fe0",
			"--accent2": "#1a63bd",
			"--grid": "#dde7f5",
			"--grid2": "#cbdaee",
			"--node": "#ffffff",
			"--accent-fg": "#ffffff"
		}
	},
	{
		id: "gray-dark",
		name: "Graphite · Dark",
		dark: true,
		vars: {
			...base(true),
			"--bg": "#0e0f11",
			"--panel": "#141618",
			"--panel2": "#1a1d20",
			"--border": "#26292e",
			"--text": "#e2e5e9",
			"--muted": "#8b9199",
			"--accent": "#9aa7b4",
			"--accent2": "#6e7b89",
			"--grid": "#1b1e22",
			"--grid2": "#24282d",
			"--node": "#17191c",
			"--accent-fg": "#0e0f11"
		}
	},
	{
		id: "gray-light",
		name: "Graphite · Light",
		dark: false,
		vars: {
			...base(false),
			"--bg": "#f2f3f5",
			"--panel": "#ffffff",
			"--panel2": "#f7f8fa",
			"--border": "#dfe2e6",
			"--text": "#20242a",
			"--muted": "#6b7280",
			"--accent": "#55606d",
			"--accent2": "#39424d",
			"--grid": "#e6e8eb",
			"--grid2": "#d8dbdf",
			"--node": "#ffffff",
			"--accent-fg": "#ffffff"
		}
	},
	{
		id: "teal-dark",
		name: "Teal · Dark",
		dark: true,
		vars: {
			...base(true),
			"--bg": "#071413",
			"--panel": "#0c1c1b",
			"--panel2": "#122624",
			"--border": "#1d3a37",
			"--text": "#d7eeea",
			"--muted": "#7aa39c",
			"--accent": "#2dd4bf",
			"--accent2": "#0f766e",
			"--grid": "#102422",
			"--grid2": "#183330",
			"--node": "#0e201e",
			"--accent-fg": "#071413"
		}
	},
	{
		id: "teal-light",
		name: "Teal · Light",
		dark: false,
		vars: {
			...base(false),
			"--bg": "#eef7f5",
			"--panel": "#ffffff",
			"--panel2": "#f3fbf9",
			"--border": "#cfe3de",
			"--text": "#14302c",
			"--muted": "#5b7f79",
			"--accent": "#0f766e",
			"--accent2": "#115e59",
			"--grid": "#dceee9",
			"--grid2": "#c9e3dc",
			"--node": "#ffffff",
			"--accent-fg": "#ffffff"
		}
	},
	{
		id: "pink-dark",
		name: "Pink · Dark",
		dark: true,
		vars: {
			...base(true),
			"--bg": "#170b13",
			"--panel": "#20101b",
			"--panel2": "#2a1523",
			"--border": "#452038",
			"--text": "#fbe3f0",
			"--muted": "#b07c98",
			"--accent": "#f472b6",
			"--accent2": "#db2777",
			"--grid": "#25121e",
			"--grid2": "#301727",
			"--node": "#1c0f18",
			"--accent-fg": "#170b13"
		}
	},
	{
		id: "pink-light",
		name: "Pink · Light",
		dark: false,
		vars: {
			...base(false),
			"--bg": "#fdf1f7",
			"--panel": "#ffffff",
			"--panel2": "#fff5fa",
			"--border": "#f4d3e6",
			"--text": "#4a1130",
			"--muted": "#a5688f",
			"--accent": "#ec4899",
			"--accent2": "#db2777",
			"--grid": "#fbe5f1",
			"--grid2": "#f6d2e6",
			"--node": "#ffffff",
			"--accent-fg": "#ffffff"
		}
	}
];
function applyTheme(t) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
	root.style.colorScheme = t.dark ? "dark" : "light";
}
var WAVE_CAP = 720;
function createEngine(circuit, defs) {
	const net = flatten(circuit, defs);
	const values = /* @__PURE__ */ new Map();
	for (const fn of net.nodes.values()) for (let p = 0; p < fn.outCount; p++) values.set(valKey(fn.id, p), fn.kind === "VCC" ? 1 : fn.kind === "GND" ? 0 : "X");
	return {
		net,
		values,
		seq: /* @__PURE__ */ new Map(),
		events: [],
		time: 0,
		wave: [],
		last: emptySim(),
		lastChange: /* @__PURE__ */ new Map()
	};
}
function evalWorld(engine, sources) {
	const desired = /* @__PURE__ */ new Map();
	for (const fn of engine.net.nodes.values()) {
		const ins = fn.ins.map((s, i) => s == null ? floatDefault(fn.kind, i) : engine.values.get(s) ?? "X");
		let srcVal;
		if (fn.kind === "SOURCE") srcVal = fn.isClock ? clockAt(engine.time, fn.period ?? 12) : sources.get(fn.src) ?? 0;
		const { outs, seq } = evalPrimitive(fn.kind, ins, engine.seq.get(fn.id), {
			constVal: fn.constVal,
			bits: fn.bits,
			srcVal
		});
		if (seq) engine.seq.set(fn.id, seq);
		for (let p = 0; p < fn.outCount; p++) desired.set(valKey(fn.id, p), outs[p] ?? "X");
	}
	return desired;
}
function drain(engine, sources, mode) {
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
			if (engine.values.get(key) === v) {
				engine.events = engine.events.filter((e) => e.key !== key);
				continue;
			}
			const fnId = key.slice(0, key.lastIndexOf(":"));
			const fn = engine.net.nodes.get(fnId);
			const delay = mode === "zero" ? 0 : fn?.delay ?? 0;
			engine.events = engine.events.filter((e) => e.key !== key);
			const fire = engine.time + delay;
			engine.events.push({
				t: fire,
				key,
				v
			});
			if (fire <= engine.time) scheduledNow = true;
		}
		if (!scheduledNow && !engine.events.some((e) => e.t <= engine.time)) {
			stable = !engine.events.length;
			break;
		}
	}
	return {
		iterations,
		stable
	};
}
function captureWave(engine, keys) {
	const vals = {};
	for (const k of keys) vals[k] = engine.last.nodeOut.get(k) ?? engine.last.nodeIn.get(k) ?? "X";
	engine.wave.push({
		t: engine.time,
		vals
	});
	if (engine.wave.length > WAVE_CAP) engine.wave.splice(0, engine.wave.length - WAVE_CAP);
}
function settle(circuit, defs, engine, sources, mode, watchKeys) {
	const { iterations, stable } = drain(engine, sources, mode);
	engine.last = packSimResult(circuit, defs, engine.net, new Map(engine.values), iterations, stable, engine.time, engine.lastChange);
	captureWave(engine, watchKeys);
	return engine.last;
}
function stepTime(circuit, defs, engine, sources, mode, watchKeys) {
	engine.time += 1;
	return settle(circuit, defs, engine, sources, mode, watchKeys);
}
function pokeNow(circuit, defs, engine, sources, mode, watchKeys) {
	return settle(circuit, defs, engine, sources, mode, watchKeys);
}
function resetEngine(circuit, defs, engine, sources, mode, watchKeys) {
	const fresh = createEngine(circuit, defs);
	engine.net = fresh.net;
	engine.values = fresh.values;
	engine.seq = fresh.seq;
	engine.events = [];
	engine.time = 0;
	engine.wave = [];
	engine.lastChange = /* @__PURE__ */ new Map();
	return settle(circuit, defs, engine, sources, mode, watchKeys);
}
function AppShell() {
	const ed = useEditor();
	const prefs0 = (0, import_react.useMemo)(() => loadPrefs(), []);
	const [themeId, setThemeId] = (0, import_react.useState)(prefs0.themeId);
	const { view, setView, startInertia, stopInertia } = useViewport();
	const [running, setRunning] = (0, import_react.useState)(false);
	const [speed, setSpeed] = (0, import_react.useState)(8);
	const [wireStyle, setWireStyle] = (0, import_react.useState)(prefs0.wireStyle);
	const [snapOn, setSnapOn] = (0, import_react.useState)(prefs0.snapOn);
	const [wheelZoom, setWheelZoom] = (0, import_react.useState)(prefs0.wheelZoom);
	const [reduceGlow, setReduceGlow] = (0, import_react.useState)(prefs0.reduceGlow);
	const [glossy, setGlossy] = (0, import_react.useState)(prefs0.glossy);
	const [timingMode, setTimingMode] = (0, import_react.useState)(prefs0.timingMode);
	const [leftOpen, setLeftOpen] = (0, import_react.useState)(prefs0.leftOpen);
	const [rightOpen, setRightOpen] = (0, import_react.useState)(prefs0.rightOpen);
	const [waveOpen, setWaveOpen] = (0, import_react.useState)(prefs0.waveformOpen);
	const [spacePan, setSpacePan] = (0, import_react.useState)(false);
	const [help, setHelp] = (0, import_react.useState)(false);
	const [filesOpen, setFilesOpen] = (0, import_react.useState)(false);
	const [narrow, setNarrow] = (0, import_react.useState)(false);
	const [cursor, setCursor] = (0, import_react.useState)(null);
	const centerRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const topoRef = (0, import_react.useRef)("");
	const [sim, setSim] = (0, import_react.useState)(null);
	const [wave, setWave] = (0, import_react.useState)([]);
	const edRef = (0, import_react.useRef)(ed);
	edRef.current = ed;
	const cursorRef = (0, import_react.useRef)(cursor);
	cursorRef.current = cursor;
	(0, import_react.useEffect)(() => {
		applyTheme(THEMES.find((x) => x.id === themeId) ?? THEMES[0]);
	}, [themeId]);
	(0, import_react.useEffect)(() => {
		savePrefs({
			themeId,
			wireStyle,
			snapOn,
			wheelZoom,
			waveformOpen: waveOpen,
			timingMode,
			leftOpen,
			rightOpen,
			reduceGlow,
			glossy
		});
	}, [
		themeId,
		wireStyle,
		snapOn,
		wheelZoom,
		waveOpen,
		timingMode,
		leftOpen,
		rightOpen,
		reduceGlow,
		glossy
	]);
	(0, import_react.useEffect)(() => {
		const mq = window.matchMedia("(max-width: 720px)");
		const apply = () => {
			setNarrow(mq.matches);
			if (mq.matches) {
				setLeftOpen(false);
				setRightOpen(false);
			}
		};
		apply();
		mq.addEventListener("change", apply);
		return () => mq.removeEventListener("change", apply);
	}, []);
	const sourceValues = (0, import_react.useCallback)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const n of edRef.current.doc.nodes) if (n.type === "INPUT") m.set(n.id, n.value ?? 0);
		return m;
	}, []);
	const watchKeys = (0, import_react.useCallback)(() => {
		const keys = [];
		for (const n of edRef.current.doc.nodes) if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "OUTPUT" || n.type === "LED" || n.watch) {
			const { outs } = portCounts(n, edRef.current.doc.defs);
			if (n.type === "OUTPUT" || n.type === "LED") keys.push(inKey(n.id, 0));
			else if (outs) for (let i = 0; i < Math.max(1, outs); i++) keys.push(outKey(n.id, i));
		}
		return keys;
	}, []);
	const probes = (0, import_react.useMemo)(() => {
		const list = [];
		for (const n of ed.doc.nodes) if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "OUTPUT" || n.type === "LED" || n.watch) {
			const { outs } = portCounts(n, ed.doc.defs);
			if (n.type === "OUTPUT" || n.type === "LED") list.push({
				key: inKey(n.id, 0),
				name: nodeTitle(n, ed.doc.defs)
			});
			else for (let i = 0; i < Math.max(1, outs); i++) list.push({
				key: outKey(n.id, i),
				name: outs > 1 ? `${nodeTitle(n, ed.doc.defs)}.${i}` : nodeTitle(n, ed.doc.defs)
			});
		}
		return list;
	}, [ed.doc]);
	const topo = (0, import_react.useMemo)(() => topologyKey(ed.doc), [ed.doc]);
	const srcKey = (0, import_react.useMemo)(() => ed.doc.nodes.map((n) => `${n.id}:${n.value ?? ""}:${n.period ?? ""}:${n.watch ? 1 : 0}:${n.delay ?? ""}:${n.bits ?? ""}`).join("|"), [ed.doc.nodes]);
	const refresh = (0, import_react.useCallback)((eng) => {
		setSim(eng.last);
		setWave([...eng.wave]);
	}, []);
	const ensureEngine = (0, import_react.useCallback)(() => {
		const d = edRef.current.doc;
		const key = topologyKey(d);
		if (!engineRef.current || topoRef.current !== key) {
			engineRef.current = createEngine(d, d.defs);
			topoRef.current = key;
			pokeNow(d, d.defs, engineRef.current, sourceValues(), timingMode, watchKeys());
		}
		return engineRef.current;
	}, [
		sourceValues,
		timingMode,
		watchKeys
	]);
	(0, import_react.useEffect)(() => {
		engineRef.current = null;
		topoRef.current = "";
	}, [timingMode]);
	(0, import_react.useEffect)(() => {
		if (!ed.ready) return;
		const d = edRef.current.doc;
		const eng = ensureEngine();
		pokeNow(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
		refresh(eng);
	}, [
		ed.ready,
		topo,
		srcKey,
		timingMode,
		ensureEngine,
		sourceValues,
		watchKeys,
		refresh
	]);
	const hasClock = (0, import_react.useMemo)(() => ed.doc.nodes.some((n) => n.type === "CLOCK"), [ed.doc.nodes]);
	(0, import_react.useEffect)(() => {
		if (!running) return;
		if (!hasClock && timingMode === "zero") return;
		const iv = setInterval(() => {
			const d = edRef.current.doc;
			const eng = ensureEngine();
			stepTime(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
			refresh(eng);
		}, Math.max(32, 480 / speed));
		return () => clearInterval(iv);
	}, [
		running,
		speed,
		hasClock,
		timingMode,
		ensureEngine,
		sourceValues,
		watchKeys,
		refresh
	]);
	const toggleSwitch = (0, import_react.useCallback)((id) => {
		const n = ed.doc.nodes.find((x) => x.id === id);
		if (!n) return;
		if (n.type === "INPUT") ed.commit((d) => ({
			...d,
			nodes: d.nodes.map((x) => x.id === id ? {
				...x,
				value: x.value === 1 ? 0 : 1
			} : x)
		}), "toggle");
		else if (n.type === "CLOCK") setRunning((r) => !r);
	}, [ed]);
	const centerWorld = (0, import_react.useCallback)(() => {
		const r = centerRef.current?.getBoundingClientRect();
		if (!r) return {
			x: 0,
			y: 0
		};
		return {
			x: (r.width / 2 - view.x) / view.z,
			y: (r.height / 2 - view.y) / view.z
		};
	}, [view]);
	const fit = (0, import_react.useCallback)(() => {
		const r = centerRef.current?.getBoundingClientRect();
		if (!r || !ed.doc.nodes.length) {
			setView({
				x: 60,
				y: 40,
				z: 1
			});
			return;
		}
		const target = ed.selection.length ? ed.doc.nodes.filter((n) => ed.selection.includes(n.id)) : ed.doc.nodes;
		let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
		for (const n of target) {
			const { w, h } = nodeSize(n, ed.doc.defs);
			x1 = Math.min(x1, n.x - 40);
			y1 = Math.min(y1, n.y - 40);
			x2 = Math.max(x2, n.x + w + 40);
			y2 = Math.max(y2, n.y + h + 40);
		}
		const z = Math.min(2.4, Math.max(.2, Math.min((r.width - 32) / (x2 - x1), (r.height - 32) / (y2 - y1))));
		setView({
			z,
			x: r.width / 2 - (x1 + x2) / 2 * z,
			y: r.height / 2 - (y1 + y2) / 2 * z
		});
	}, [
		ed.doc,
		ed.selection,
		setView
	]);
	const step = (0, import_react.useCallback)(() => {
		const d = edRef.current.doc;
		const eng = ensureEngine();
		stepTime(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
		refresh(eng);
	}, [
		ensureEngine,
		sourceValues,
		timingMode,
		watchKeys,
		refresh
	]);
	const resetSim = (0, import_react.useCallback)(() => {
		const d = edRef.current.doc;
		const eng = ensureEngine();
		resetEngine(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
		refresh(eng);
		setRunning(false);
	}, [
		ensureEngine,
		sourceValues,
		timingMode,
		watchKeys,
		refresh
	]);
	(0, import_react.useEffect)(() => {
		const isField = (t) => {
			const el = t;
			return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
		};
		const onDown = (e) => {
			if (isField(e.target)) return;
			if (e.code === "Space") {
				e.preventDefault();
				setSpacePan(true);
			}
		};
		const onUp = (e) => {
			if (e.code === "Space") setSpacePan(false);
		};
		const onKey = (e) => {
			if (isField(e.target)) return;
			const api = edRef.current;
			const mod = e.metaKey || e.ctrlKey;
			if (e.key === "?" || e.shiftKey && e.key === "/") {
				e.preventDefault();
				setHelp((h) => !h);
				return;
			}
			if (mod && e.key.toLowerCase() === "z") {
				e.preventDefault();
				e.shiftKey ? api.redo() : api.undo();
			} else if (mod && e.key.toLowerCase() === "y") {
				e.preventDefault();
				api.redo();
			} else if (mod && e.key.toLowerCase() === "c") api.copy();
			else if (mod && e.key.toLowerCase() === "x") {
				e.preventDefault();
				api.cut();
			} else if (mod && e.key.toLowerCase() === "v") {
				e.preventDefault();
				api.paste(cursorRef.current?.x, cursorRef.current?.y);
			} else if (mod && e.key.toLowerCase() === "d") {
				e.preventDefault();
				api.duplicateSelected();
			} else if (mod && e.key.toLowerCase() === "a") {
				e.preventDefault();
				api.setSelection(api.doc.nodes.map((n) => n.id));
			} else if (mod && e.key.toLowerCase() === "s") {
				e.preventDefault();
				import("./hdl-9CO5fPBR.mjs").then(({ downloadJson }) => {
					downloadJson(`${(api.doc.name || "circuit").replace(/\s+/g, "-")}.logicforge.json`, api.doc);
					toast.success("Saved JSON");
				});
			} else if (mod && e.key.toLowerCase() === "o") {
				e.preventDefault();
				setFilesOpen(true);
			} else if (mod && e.key.toLowerCase() === "g") {
				e.preventDefault();
				api.makeCustom("BLOCK");
			} else if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				api.deleteSelected();
			} else if (e.key.toLowerCase() === "r" && !mod) api.rotateSelected();
			else if (e.key.toLowerCase() === "l" && !mod) {
				e.preventDefault();
				api.toggleLock();
			} else if (e.key.toLowerCase() === "p" && !mod) {
				e.preventDefault();
				setRunning((r) => !r);
			} else if (e.key === ".") {
				e.preventDefault();
				step();
			} else if (e.key.toLowerCase() === "f" && !mod) {
				e.preventDefault();
				fit();
			} else if (e.key === "0" && !mod) {
				e.preventDefault();
				fit();
			} else if (e.key === "1" && !mod) setView((v) => {
				const r = centerRef.current?.getBoundingClientRect();
				if (!r) return {
					...v,
					z: 1
				};
				const cx = r.width / 2;
				const cy = r.height / 2;
				const k = 1 / v.z;
				return {
					z: 1,
					x: cx - (cx - v.x) * k,
					y: cy - (cy - v.y) * k
				};
			});
			else if (e.key === "Escape") {
				api.setSelection([]);
				api.setSelectedWires([]);
				setHelp(false);
				setFilesOpen(false);
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				api.nudge(e.shiftKey ? -100 : -20, 0);
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				api.nudge(e.shiftKey ? 100 : 20, 0);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				api.nudge(0, e.shiftKey ? -100 : -20);
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				api.nudge(0, e.shiftKey ? 100 : 20);
			}
		};
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
			window.removeEventListener("keydown", onKey);
		};
	}, [
		fit,
		step,
		setView
	]);
	const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
	const live = sim;
	if (!ed.ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ui-kicker",
			children: "Loading workspace"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh w-full flex-col overflow-hidden font-sans text-[var(--text)]",
		style: { background: "var(--bg)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: theme.dark ? "dark" : "light",
				position: "bottom-right"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-2 sm:px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid h-7 w-7 place-items-center rounded-md",
							style: { background: "var(--accent)" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
								viewBox: "0 0 24 24",
								className: "h-4 w-4",
								fill: "none",
								stroke: "var(--accent-fg)",
								strokeWidth: 2.2,
								strokeLinecap: "round",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 8h5l3 8h5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: "12",
									cy: "12",
									r: "1.6",
									fill: "var(--accent-fg)",
									stroke: "none"
								})]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-bold tracking-tight",
								children: "LogicForge"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "hidden text-micro uppercase tracking-[0.18em] text-[var(--muted)] sm:block",
								children: ed.fileName
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileMenu, {
						ed,
						onOpenFiles: () => setFilesOpen(true),
						fileRef
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ui-btn-ghost",
						onClick: () => setHelp(true),
						children: "Shortcuts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "application/json",
						className: "hidden",
						onChange: (e) => e.target.files?.[0] && importJsonFile(e.target.files[0], ed.load)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `ui-btn-ghost ${leftOpen ? "text-[var(--accent)]" : ""}`,
								onClick: () => setLeftOpen(!leftOpen),
								title: "Library",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `ui-btn-ghost ${waveOpen ? "text-[var(--accent)]" : ""}`,
								onClick: () => setWaveOpen(!waveOpen),
								title: "Waveform",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `ui-btn-ghost ${rightOpen ? "text-[var(--accent)]" : ""}`,
								onClick: () => setRightOpen(!rightOpen),
								title: "Inspector",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelRight, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: themeId,
								onChange: (e) => setThemeId(e.target.value),
								className: "h-8 max-w-28 rounded-lg border border-[var(--border)] bg-[var(--panel2)] px-2 text-xs text-[var(--text)] outline-none",
								children: THEMES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t.id,
									children: t.name
								}, t.id))
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [
					leftOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: `${narrow ? "absolute inset-y-12 left-0 z-20 w-[min(18rem,90vw)] shadow-[var(--shadow)]" : "w-56"} shrink-0 border-r border-[var(--border)] bg-[var(--panel)]`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, {
							ed,
							centerWorld
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
						ref: centerRef,
						className: "relative min-w-0 flex-1",
						children: [live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Canvas, {
							ed,
							sim: live,
							view,
							setView,
							startInertia,
							stopInertia,
							running,
							wireStyle,
							snapOn,
							wheelZoom,
							spacePan,
							reduceGlow,
							glossy,
							onToggleSwitch: toggleSwitch,
							onCursor: setCursor,
							fit
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 text-micro",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: ed.selection.length ? `${ed.selection.length} selected` : "no selection" }),
								live && !live.stable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									warn: true,
									children: "oscillation"
								}),
								live && !!live.floating.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									warn: true,
									onClick: () => {
										const ids = Array.from(new Set(live.floating.map((k) => k.split(":")[0])));
										ed.setSelection(ids);
										ed.setSelectedWires([]);
									},
									children: [live.floating.length, " floating · locate"]
								}),
								live && !!live.contention.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									warn: true,
									children: "bus fight"
								}),
								cursor && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: [
									"Cursor ",
									Math.round(cursor.x),
									",",
									Math.round(cursor.y)
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: ["Sim: ", timingMode === "unit" ? "unit delay" : "zero delay"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: ["Wires: ", wireStyle === "ortho" ? "ortho" : "curve"] })
							]
						})]
					}),
					rightOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: `${narrow ? "absolute inset-y-12 right-0 z-20 w-[min(20rem,92vw)] shadow-[var(--shadow)]" : "w-72"} shrink-0 border-l border-[var(--border)] bg-[var(--panel)]`,
						children: live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspector, {
							ed,
							sim: live
						})
					})
				]
			}),
			waveOpen && live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-40 shrink-0 sm:h-44",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, {
					wave,
					probes,
					time: live.time,
					onClose: () => setWaveOpen(false),
					onClear: () => {
						const eng = engineRef.current;
						if (eng) {
							eng.wave = [];
							setWave([]);
						}
					},
					onSelect: (id) => {
						ed.setSelection([id]);
						ed.setSelectedWires([]);
					}
				})
			}),
			live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toolbar, {
				ed,
				sim: live,
				running,
				setRunning,
				step,
				resetSim,
				tick: live.time,
				speed,
				setSpeed,
				view,
				setView,
				fit,
				wireStyle,
				setWireStyle,
				snapOn,
				setSnapOn,
				timingMode,
				setTimingMode,
				wheelZoom,
				setWheelZoom,
				reduceGlow,
				setReduceGlow,
				glossy,
				setGlossy
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShortcutsModal, {
				open: help,
				onClose: () => setHelp(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDialog, {
				open: filesOpen,
				ed,
				onClose: () => setFilesOpen(false)
			})
		]
	});
}
function Badge({ children, warn, onClick }) {
	const style = {
		borderColor: warn ? "var(--xx)" : "var(--border)",
		color: warn ? "var(--xx)" : "var(--muted)",
		background: "color-mix(in srgb, var(--panel) 75%, transparent)"
	};
	if (onClick) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: "pointer-events-auto rounded-md border px-2 py-1 font-semibold backdrop-blur transition hover:brightness-125",
		style,
		children
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "rounded-md border px-2 py-1 font-semibold backdrop-blur",
		style,
		children
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { routes_CHRrDzbU_exports as a, Home as component, emitVhdl as i, downloadText as n, emitVerilog as r, downloadJson as t };

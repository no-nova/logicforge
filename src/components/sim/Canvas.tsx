import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  CircleDot,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  Lock,
  Maximize2,
  MousePointer2,
  RotateCw,
  Scissors,
  Trash2,
  Unlock,
  Waypoints,
  XCircle,
} from "lucide-react";
import ContextMenu, { type MenuItem } from "./ContextMenu";
import {
  type CNode,
  type CustomDef,
  type SimResult,
  type Val,
  GRID,
  inKey,
  localPort,
  nodeDelay,
  nodeSize,
  nodeTitle,
  outKey,
  portCounts,
  portDir,
  portPos,
  snap,
  specOf,
} from "@/lib/sim/circuit";
import { type EditorAPI, cloneChunk } from "@/lib/sim/store";
import { type View, clampZ, zoomToward } from "@/lib/sim/viewport";

interface Props {
  ed: EditorAPI;
  sim: SimResult;
  view: View;
  setView: (u: View | ((v: View) => View)) => void;
  startInertia: (vx: number, vy: number) => void;
  stopInertia: () => void;
  running: boolean;
  wireStyle: "curve" | "ortho";
  snapOn: boolean;
  wheelZoom: boolean;
  spacePan: boolean;
  reduceGlow: boolean;
  glossy: boolean;
  onToggleSwitch: (id: string) => void;
  onCursor: (p: { x: number; y: number } | null) => void;
  fit: () => void;
}

type Drag =
  | { kind: "pan"; sx: number; sy: number; ox: number; oy: number; lastX: number; lastY: number; lastT: number; vx: number; vy: number }
  | { kind: "node"; sx: number; sy: number; start: Map<string, { x: number; y: number }> }
  | { kind: "wire"; from: { node: string; port: number } | null; to: { node: string; port: number } | null; x: number; y: number }
  | { kind: "marquee"; sx: number; sy: number; x: number; y: number }
  | { kind: "pinch"; d0: number; z0: number; mx0: number; my0: number; vx0: number; vy0: number }
  | null;

const valColor = (v: Val) =>
  v === 1 ? "var(--hi)" : v === 0 ? "var(--lo)" : v === "Z" ? "var(--zz)" : "var(--xx)";

export default function Canvas(props: Props) {
  const { ed, sim, view, setView, startInertia, stopInertia, running, wireStyle, snapOn, wheelZoom, spacePan, reduceGlow, glossy, onToggleSwitch, onCursor, fit } = props;
  const { doc, selection, selectedWires } = ed;
  const defs = doc.defs;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const dragRef = useRef<Drag>(null);
  dragRef.current = drag;
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [hoverPort, setHoverPort] = useState<string | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; wx: number; wy: number; node?: string; wire?: string } | null>(
    null,
  );

  // Network-trace highlight. `rawHover` is the immediate, instant pointer
  // target (can flicker between adjacent elements at shared boundaries —
  // that's normal, sub-pixel-jitter pointer behavior). `netTarget` is what
  // actually drives the dim/highlight effect, and only ever updates after
  // `rawHover` has held *stable* for HOVER_DELAY_MS — so transient jitter
  // simply never commits, instead of repainting a dozen elements every
  // frame (which is what was causing the rapid flashing: a photosensitive/
  // eye-strain risk, not just a visual annoyance). A right-click can also
  // "pin" a target immediately, bypassing the delay entirely, and stays
  // until the pin is explicitly cleared.
  type NetTarget = { kind: "wire" | "port" | "node" | "trace"; id: string };
  const HOVER_DELAY_MS = 2000;
  const [rawHover, setRawHover] = useState<NetTarget | null>(null);
  const [netTarget, setNetTarget] = useState<NetTarget | null>(null);
  const [netPinned, setNetPinned] = useState(false);
  const sameTarget = (a: NetTarget | null, b: NetTarget | null) => !!a && !!b && a.kind === b.kind && a.id === b.id;

  // hoverPort already flows up from NodeView for the existing drag-snap and
  // dot-enlarge behavior — piggyback on it here instead of threading a
  // second callback through every port element.
  useEffect(() => {
    setRawHover(hoverPort ? { kind: "port", id: hoverPort } : null);
  }, [hoverPort]);

  const handleHoverPort = useCallback((k: string | null, e?: React.PointerEvent) => {
    setHoverPort(k);
    if (k && e) setHoverScreenPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (netPinned) return; // a manual (right-click) highlight overrides hover entirely until cleared
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

  useEffect(() => {
    if (!netPinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearNetHighlight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [netPinned]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const viewRef = useRef(view);
  viewRef.current = view;

  const toWorld = useCallback(
    (cx: number, cy: number, v = viewRef.current) => {
      const r = ref.current!.getBoundingClientRect();
      return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
    },
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      // Normalize the delta unit before doing anything else. Chrome/Safari
      // report trackpad deltas in pixels (deltaMode 0), but Firefox reports
      // "line" units (deltaMode 1) with much smaller raw numbers — left
      // as-is, panning feels far too slow there. Clamping the result also
      // tames the occasional huge delta spike some Windows precision
      // touchpads emit on a fast two-finger flick, which otherwise causes a
      // jarring jump instead of a smooth pan/zoom.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      const dx = clamp(e.deltaX * unit, 400);
      const dy = clamp(e.deltaY * unit, 400);
      const pinch = e.ctrlKey || e.metaKey;
      const zoom = pinch || (wheelZoom && !e.shiftKey && Math.abs(dy) > 0 && Math.abs(dx) < 1);
      if (zoom) {
        setView((v) => zoomToward(v, mx, my, v.z * Math.exp(-dy * 0.0018)));
      } else {
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView, stopInertia, wheelZoom]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-node");
    if (!raw) return;
    const { type, defId } = JSON.parse(raw) as { type: CNode["type"]; defId?: string };
    const p = toWorld(e.clientX, e.clientY);
    ed.addNode(type, p.x - 45, p.y - 25, defId);
  };

  const startNodeDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setMenu(null);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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
      ed.live((d) => ({ ...d, nodes: [...d.nodes, ...chunk.nodes], wires: [...d.wires, ...chunk.wires] }));
      sel = chunk.nodes.map((n) => n.id);
      ed.setSelection(sel);
      const start = new Map(chunk.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
      setDrag({ kind: "node", sx: p.x, sy: p.y, start });
      return;
    }
    ed.pushHistory("move");
    // Locked nodes stay selectable but are left out of the drag's start
    // map, so they simply don't move even if they're part of a larger
    // selection being dragged together.
    const start = new Map(
      doc.nodes.filter((n) => sel.includes(n.id) && !n.locked).map((n) => [n.id, { x: n.x, y: n.y }]),
    );
    setDrag({ kind: "node", sx: p.x, sy: p.y, start });
  };

  const startPortDrag = (e: React.PointerEvent, node: string, dir: "in" | "out", port: number) => {
    e.stopPropagation();
    setMenu(null);
    const p = toWorld(e.clientX, e.clientY);
    if (dir === "out") setDrag({ kind: "wire", from: { node, port }, to: null, x: p.x, y: p.y });
    else {
      const existing = doc.wires.find((w) => w.to.node === node && w.to.port === port);
      if (existing) {
        ed.commit((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== existing.id) }), "detach");
        setDrag({ kind: "wire", from: existing.from, to: null, x: p.x, y: p.y });
      } else setDrag({ kind: "wire", from: null, to: { node, port }, x: p.x, y: p.y });
    }
  };

  const beginPan = (e: React.PointerEvent) => {
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
      vy: 0,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setMenu(null);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      const r = ref.current!.getBoundingClientRect();
      setDrag({
        kind: "pinch",
        d0: Math.max(1, d0),
        z0: view.z,
        mx0: mx - r.left,
        my0: my - r.top,
        vx0: view.x,
        vy0: view.y,
      });
      return;
    }
    if (e.button === 1 || e.altKey || spacePan || e.buttons === 4) {
      e.preventDefault();
      beginPan(e);
      return;
    }
    // Right button (2) falls through here and is intentionally a no-op on
    // pointerdown — it no longer pans, so it's free to open the context
    // menu via the native contextmenu event instead (see onContextMenu).
    if (e.button !== 0) return;
    const p = toWorld(e.clientX, e.clientY);
    if (!e.shiftKey) {
      ed.setSelection([]);
      ed.setSelectedWires([]);
    }
    setDrag({ kind: "marquee", sx: p.x, sy: p.y, x: p.x, y: p.y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toWorld(e.clientX, e.clientY);
    onCursor(p);
    if (rawHover) setHoverScreenPos({ x: e.clientX, y: e.clientY });
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "pinch" && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const r = ref.current!.getBoundingClientRect();
      const mx = (pts[0].x + pts[1].x) / 2 - r.left;
      const my = (pts[0].y + pts[1].y) / 2 - r.top;
      const z = clampZ(d.z0 * (dist / d.d0));
      const k = z / d.z0;
      setView({
        z,
        x: mx - (d.mx0 - d.vx0) * k + (mx - d.mx0),
        y: my - (d.my0 - d.vy0) * k + (my - d.my0),
      });
      return;
    }
    if (d.kind === "pan") {
      const now = performance.now();
      const dt = Math.max(8, now - d.lastT);
      const vx = ((e.clientX - d.lastX) / dt) * 16;
      const vy = ((e.clientY - d.lastY) / dt) * 16;
      setView({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy), z: viewRef.current.z });
      setDrag({ ...d, lastX: e.clientX, lastY: e.clientY, lastT: now, vx, vy });
      return;
    }
    if (d.kind === "node") {
      const dx = p.x - d.sx;
      const dy = p.y - d.sy;
      const gv: number[] = [];
      const gh: number[] = [];
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
          return { ...n, x: nx, y: ny };
        }),
      }));
      setGuides({ v: gv, h: gh });
    } else if (d.kind === "wire") {
      let x = p.x;
      let y = p.y;
      for (const n of doc.nodes) {
        const { ins, outs } = portCounts(n, defs);
        for (const dir of ["in", "out"] as const) {
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
      setDrag({ ...d, x, y });
    } else if (d.kind === "marquee") {
      setDrag({ ...d, x: p.x, y: p.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = dragRef.current;
    if (d?.kind === "pan") {
      startInertia(d.vx, d.vy);
    }
    if (d?.kind === "marquee") {
      const x1 = Math.min(d.sx, d.x);
      const x2 = Math.max(d.sx, d.x);
      const y1 = Math.min(d.sy, d.y);
      const y2 = Math.max(d.sy, d.y);
      if (Math.abs(x2 - x1) > 4 || Math.abs(y2 - y1) > 4) {
        const hit = doc.nodes
          .filter((n) => {
            const { w, h } = nodeSize(n, defs);
            return n.x < x2 && n.x + w > x1 && n.y < y2 && n.y + h > y1;
          })
          .map((n) => n.id);
        ed.setSelection(e.shiftKey ? [...new Set([...selection, ...hit])] : hit);
      } else if (e.detail === 2) {
        fit();
      }
    }
    if (d?.kind === "wire") {
      let hp = hoverPort;
      if (!hp) {
        for (const n of doc.nodes) {
          const { ins, outs } = portCounts(n, defs);
          for (const dir of ["in", "out"] as const) {
            const count = dir === "in" ? ins : outs;
            for (let i = 0; i < count; i++) {
              const q = portPos(n, defs, dir, i);
              if (Math.hypot(q.x - d.x, q.y - d.y) < 18) hp = `${n.id}|${dir}|${i}`;
            }
          }
        }
      }
      if (hp) {
        const [nid, dir, pi] = hp.split("|");
        if (d.from && dir === "in") ed.connect(d.from, { node: nid, port: +pi });
        else if (d.to && dir === "out") ed.connect({ node: nid, port: +pi }, d.to);
      }
    }
    setGuides({ v: [], h: [] });
    setDrag(null);
  };

  const onCanvasContext = (e: React.MouseEvent) => {
    e.preventDefault();
    setDrag(null);
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y });
  };

  const onNodeContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    if (!selection.includes(id)) {
      ed.setSelection([id]);
      ed.setSelectedWires([]);
    }
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, node: id });
  };

  const onRenameNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const node = doc.nodes.find((x) => x.id === id);
    if (!node) return;
    const current = node.label ?? nodeTitle(node, defs);
    const next = window.prompt("Rename module", current);
    if (next == null) return;
    const trimmed = next.trim();
    ed.commit(
      (d) => ({ ...d, nodes: d.nodes.map((x) => (x.id === id ? { ...x, label: trimmed || undefined } : x)) }),
      "rename",
    );
  };

  const onWireContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    ed.setSelectedWires([id]);
    ed.setSelection([]);
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, wire: id });
  };

  const wirePath = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    da: { x: number; y: number },
    db: { x: number; y: number },
  ) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.min(170, Math.max(36, dist * 0.45));
    if (wireStyle === "ortho") {
      const m = a.x + (b.x - a.x) / 2;
      const back = b.x < a.x + 40;
      if (!back) return `M${a.x},${a.y} L${m},${a.y} L${m},${b.y} L${b.x},${b.y}`;
      const off = 46;
      const my = (a.y + b.y) / 2 + (Math.abs(b.y - a.y) < 20 ? 70 : 0);
      return `M${a.x},${a.y} L${a.x + off},${a.y} L${a.x + off},${my} L${b.x - off},${my} L${b.x - off},${b.y} L${b.x},${b.y}`;
    }
    const c1 = { x: a.x + da.x * k, y: a.y + da.y * k };
    const c2 = { x: b.x + db.x * k, y: b.y + db.y * k };
    return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
  };

  const nodeMap = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);

  const wireGeo = doc.wires
    .map((w) => {
      const a = nodeMap.get(w.from.node);
      const b = nodeMap.get(w.to.node);
      if (!a || !b) return null;
      if (w.from.port >= portCounts(a, defs).outs || w.to.port >= portCounts(b, defs).ins) return null;
      const pa = portPos(a, defs, "out", w.from.port);
      const pb = portPos(b, defs, "in", w.to.port);
      const d = wirePath(pa, pb, portDir(a, "out"), portDir(b, "in"));
      return { w, d, v: sim.wireValues.get(w.id) ?? "X", pa, pb };
    })
    .filter(Boolean) as {
    w: (typeof doc.wires)[number];
    d: string;
    v: Val;
    pa: { x: number; y: number };
    pb: { x: number; y: number };
  }[];

  const gridSize = GRID * view.z;
  const showFine = view.z > 0.45;

  // Highlighting a wire picks out just that segment; a port picks out
  // every wire attached to it (for an output port with fanout, that's the
  // whole net it drives); a node (gate) picks out every wire touching any
  // of its ports plus every node at the other end of those wires — i.e.
  // its immediate neighborhood. (Note: this is one hop out from the node,
  // not a full transitive trace all the way back to switches / on to
  // LEDs — extending it further is a bigger, separate feature.) Everything
  // else dims to 20% opacity so a single path can be picked out of an
  // otherwise tangled, overlapping bundle of wires.
  const activeNet = useMemo(() => {
    if (drag || !netTarget) return null;
    if (netTarget.kind === "wire") {
      const w = doc.wires.find((x) => x.id === netTarget.id);
      if (!w) return null;
      return { wires: new Set([netTarget.id]), nodes: new Set([w.from.node, w.to.node]) };
    }
    if (netTarget.kind === "port") {
      const [nid, dir, pStr] = netTarget.id.split("|");
      const port = Number(pStr);
      const wires = doc.wires.filter((w) =>
        dir === "out" ? w.from.node === nid && w.from.port === port : w.to.node === nid && w.to.port === port,
      );
      const nodes = new Set<string>([nid]);
      wires.forEach((w) => {
        nodes.add(w.from.node);
        nodes.add(w.to.node);
      });
      return { wires: new Set(wires.map((w) => w.id)), nodes };
    }
    if (netTarget.kind === "node") {
      // Every wire touching any of this node's ports, plus the neighbors
      // at the other end — a one-hop "what's this gate connected to".
      const nid = netTarget.id;
      const wires = doc.wires.filter((w) => w.from.node === nid || w.to.node === nid);
      const nodes = new Set<string>([nid]);
      wires.forEach((w) => {
        nodes.add(w.from.node);
        nodes.add(w.to.node);
      });
      return { wires: new Set(wires.map((w) => w.id)), nodes };
    }
    // kind === "trace": walk outward from this node across every wire,
    // hop by hop, until nothing new is reachable — the full transitively
    // connected network, for when a one-hop view isn't enough to follow a
    // signal from switch to gate to LED.
    const nodes = new Set<string>([netTarget.id]);
    const wires = new Set<string>();
    const queue = [netTarget.id];
    while (queue.length) {
      const cur = queue.shift()!;
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
    return { wires, nodes };
  }, [netTarget, doc.wires, drag]);

  // Click-to-debug: a single selected wire shows its driver/value/fanout, a
  // single selected node shows live port values + propagation/last-transition.
  const debugWire =
    selectedWires.length === 1 && !selection.length
      ? wireGeo.find((g) => g.w.id === selectedWires[0])
      : undefined;
  const debugWireExtra = useMemo(() => {
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
      anchor: { x: (debugWire.pa.x + debugWire.pb.x) / 2, y: (debugWire.pa.y + debugWire.pb.y) / 2 },
    };
  }, [debugWire, doc.wires, sim.transitions, defs, nodeMap]);

  const debugNode =
    selection.length === 1 && !selectedWires.length ? nodeMap.get(selection[0]) : undefined;
  const debugNodeExtra = useMemo(() => {
    if (!debugNode) return null;
    const names = specOf(debugNode, defs);
    const ins = names.ins.map((nm, i) => ({ nm, v: sim.nodeIn.get(inKey(debugNode.id, i)) ?? ("X" as Val) }));
    const outs = names.outs.map((nm, i) => ({ nm, v: sim.nodeOut.get(outKey(debugNode.id, i)) ?? ("X" as Val) }));
    if (!ins.length && !outs.length) return null;
    const delay = nodeDelay(debugNode);
    const tOut = sim.transitions.get(outKey(debugNode.id, 0));
    const { w } = nodeSize(debugNode, defs);
    return {
      title: nodeTitle(debugNode, defs),
      ins,
      outs,
      delay,
      from: tOut !== undefined ? Math.max(0, tOut - delay) : undefined,
      to: tOut,
      anchor: { x: debugNode.x + w, y: debugNode.y },
    };
  }, [debugNode, defs, sim.nodeIn, sim.nodeOut, sim.transitions]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menu) return [];
    if (menu.wire) {
      const id = menu.wire;
      const pinnedHere = netPinned && sameTarget(netTarget, { kind: "wire", id });
      return [
        pinnedHere
          ? { label: "Clear highlight", icon: <EyeOff className="size-3.5" />, onSelect: clearNetHighlight }
          : {
              label: "Highlight network",
              icon: <Eye className="size-3.5" />,
              onSelect: () => {
                setNetTarget({ kind: "wire", id });
                setNetPinned(true);
              },
            },
        {
          label: "Delete wire",
          icon: <Trash2 className="size-3.5" />,
          danger: true,
          divider: true,
          onSelect: () => ed.commit((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== id) }), "delete wire"),
        },
      ];
    }
    if (menu.node) {
      const id = menu.node;
      const node = nodeMap.get(id);
      const selLocked = selection.length > 0 && selection.every((sid) => nodeMap.get(sid)?.locked);
      const pinnedHere = netPinned && netTarget?.id === id && (netTarget.kind === "node" || netTarget.kind === "trace");
      const canExpect = node && (node.type === "OUTPUT" || node.type === "LED");
      const expectItems: MenuItem[] = canExpect
        ? [
            {
              label: node!.expected === 1 ? "Expected: HIGH ✓" : "Expect HIGH",
              icon: <CircleDot className="size-3.5" />,
              divider: true,
              onSelect: () => ed.setExpected(id, node!.expected === 1 ? undefined : 1),
            },
            {
              label: node!.expected === 0 ? "Expected: LOW ✓" : "Expect LOW",
              icon: <Circle className="size-3.5" />,
              onSelect: () => ed.setExpected(id, node!.expected === 0 ? undefined : 0),
            },
            ...(node!.expected != null
              ? [{ label: "Clear expected value", icon: <XCircle className="size-3.5" />, onSelect: () => ed.setExpected(id, undefined) }]
              : []),
          ]
        : [];
      return [
        pinnedHere
          ? { label: "Clear highlight", icon: <EyeOff className="size-3.5" />, onSelect: clearNetHighlight }
          : {
              label: "Highlight network",
              icon: <Eye className="size-3.5" />,
              onSelect: () => {
                setNetTarget({ kind: "node", id });
                setNetPinned(true);
              },
            },
        {
          label: "Trace full network",
          icon: <Waypoints className="size-3.5" />,
          onSelect: () => {
            setNetTarget({ kind: "trace", id });
            setNetPinned(true);
          },
        },
        ...expectItems,
        { label: "Cut", icon: <Scissors className="size-3.5" />, divider: true, onSelect: () => ed.cut() },
        { label: "Copy", icon: <Copy className="size-3.5" />, onSelect: () => ed.copy() },
        { label: "Duplicate", icon: <CopyPlus className="size-3.5" />, onSelect: () => ed.duplicateSelected() },
        { label: "Rotate", icon: <RotateCw className="size-3.5" />, onSelect: () => ed.rotateSelected() },
        {
          label: selLocked ? "Unlock" : "Lock",
          icon: selLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />,
          divider: true,
          onSelect: () => ed.toggleLock(),
        },
        {
          label: "Delete",
          icon: <Trash2 className="size-3.5" />,
          danger: true,
          divider: true,
          onSelect: () => ed.deleteSelected(),
        },
      ];
    }
    const wx = menu.wx;
    const wy = menu.wy;
    return [
      {
        label: "Paste",
        icon: <ClipboardPaste className="size-3.5" />,
        disabled: !ed.hasClipboard,
        onSelect: () => ed.paste(wx, wy),
      },
      {
        label: "Select all",
        icon: <MousePointer2 className="size-3.5" />,
        divider: true,
        disabled: !doc.nodes.length,
        onSelect: () => ed.setSelection(doc.nodes.map((n) => n.id)),
      },
      { label: "Fit view", icon: <Maximize2 className="size-3.5" />, onSelect: () => fit() },
    ];
  }, [menu, ed, selection, nodeMap, doc.nodes, fit, netPinned, netTarget, clearNetHighlight]);

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        background: "var(--bg)",
        backgroundImage: showFine
          ? `linear-gradient(to right, var(--grid) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
             linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)`
          : `linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)`,
        backgroundSize: showFine
          ? `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px`
          : `${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        cursor: drag?.kind === "pan" || spacePan ? "grab" : "default",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={onCanvasContext}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onPointerLeave={() => onCursor(null)}
    >
      <svg className="absolute inset-0 h-full w-full" style={{ touchAction: "none" }}>
        <defs>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle depth pass for node bodies and indicator LEDs: a soft
              drop shadow to lift shapes off the grid, a top-light /
              bottom-dark bevel overlay, and a glossy highlight for domed
              indicators. All theme-agnostic (white/black at low opacity) so
              they read correctly across every color theme, including the
              new pink one. */}
          <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="200%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#000000" floodOpacity="0.30" />
          </filter>
          <linearGradient id="nodeBevel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
          <radialGradient id="domeGloss" cx="35%" cy="28%" r="75%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.z})`}>
          {guides.v.map((x, i) => (
            <line key={"gv" + i} x1={x} y1={-9000} x2={x} y2={9000} stroke="var(--accent)" strokeWidth={1 / view.z} strokeDasharray="6 6" opacity={0.7} />
          ))}
          {guides.h.map((y, i) => (
            <line key={"gh" + i} x1={-9000} y1={y} x2={9000} y2={y} stroke="var(--accent)" strokeWidth={1 / view.z} strokeDasharray="6 6" opacity={0.7} />
          ))}
          <g>
            {wireGeo.map(({ w, d, v, pa, pb }) => {
              const sel = selectedWires.includes(w.id);
              const col = valColor(v);
              // Dim everything outside the hovered net to ~20% so one
              // signal path can be picked out of a dense, overlapping
              // bundle of wires.
              const dim = activeNet && !activeNet.wires.has(w.id);
              const baseOp = (v === "X" || v === "Z" ? 0.55 : 0.95) * (dim ? 0.2 : 1);
              const mx = (pa.x + pb.x) / 2;
              const my = (pa.y + pb.y) / 2;
              return (
                <g key={w.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setMenu(null);
                      ed.setSelectedWires([w.id]);
                      ed.setSelection([]);
                    }}
                    onContextMenu={(e) => onWireContext(e, w.id)}
                    onPointerEnter={() => setRawHover({ kind: "wire", id: w.id })}
                    onPointerLeave={() =>
                      setRawHover((cur) => (sameTarget(cur, { kind: "wire", id: w.id }) ? null : cur))
                    }
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={col}
                    strokeWidth={sel ? 3.6 : 2.2}
                    strokeLinecap="round"
                    opacity={baseOp}
                    strokeDasharray={v === "X" ? "5 5" : v === "Z" ? "2 6" : undefined}
                    filter={v === 1 && !reduceGlow ? "url(#glow)" : undefined}
                    style={{ pointerEvents: "none" }}
                  />
                  {sel && <path d={d} fill="none" stroke="var(--accent)" strokeWidth={7} opacity={0.25 * (dim ? 0.2 : 1)} strokeLinecap="round" style={{ pointerEvents: "none" }} />}
                  {running && v === 1 && !dim && (
                    <circle r={3.2} fill="#fff" opacity={0.9}>
                      <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
                    </circle>
                  )}
                  {/* Numeric 0/1/X/Z readout so a signal's state never
                      depends on distinguishing wire colors alone. */}
                  {showFine && (
                    <text
                      x={mx}
                      y={my - 4}
                      textAnchor="middle"
                      fontSize={7}
                      fontWeight={700}
                      fill={col}
                      stroke="var(--bg)"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      opacity={dim ? 0.25 : 0.9}
                      style={{ pointerEvents: "none" }}
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
            {drag?.kind === "wire" &&
              (() => {
                const anchorId = drag.from?.node ?? drag.to!.node;
                const an = nodeMap.get(anchorId);
                if (!an) return null;
                const dir = drag.from ? "out" : "in";
                const pa = portPos(an, defs, dir, (drag.from ?? drag.to)!.port);
                const d = drag.from
                  ? wirePath(pa, { x: drag.x, y: drag.y }, portDir(an, "out"), { x: -1, y: 0 })
                  : wirePath({ x: drag.x, y: drag.y }, pa, { x: 1, y: 0 }, portDir(an, "in"));
                return <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeDasharray="6 4" />;
              })()}
          </g>
          {doc.nodes.map((n) => (
            <NodeView
              key={n.id}
              n={n}
              defs={defs}
              sim={sim}
              selected={selection.includes(n.id)}
              onBodyDown={(e) => startNodeDrag(e, n.id)}
              onContextMenu={(e) => onNodeContext(e, n.id)}
              onDoubleClick={(e) => onRenameNode(e, n.id)}
              onPortDown={startPortDrag}
              onHoverPort={handleHoverPort}
              hoverPort={hoverPort}
              onToggle={() => onToggleSwitch(n.id)}
              dimmed={!!activeNet && !activeNet.nodes.has(n.id)}
              reduceGlow={reduceGlow}
              glossy={glossy}
              onHoverStart={() => setRawHover({ kind: "node", id: n.id })}
              onHoverEnd={() => setRawHover((cur) => (sameTarget(cur, { kind: "node", id: n.id }) ? null : cur))}
            />
          ))}
        </g>
      </svg>

      {drag?.kind === "marquee" && (
        <div
          className="pointer-events-none absolute border bg-[var(--accent)]/10"
          style={{
            borderColor: "var(--accent)",
            left: Math.min(drag.sx, drag.x) * view.z + view.x,
            top: Math.min(drag.sy, drag.y) * view.z + view.y,
            width: Math.abs(drag.x - drag.sx) * view.z,
            height: Math.abs(drag.y - drag.sy) * view.z,
          }}
        />
      )}

      <Minimap doc={doc} defs={defs} view={view} setView={setView} host={ref} />

      {debugWireExtra && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-2.5 py-2 text-micro shadow-[var(--shadow)]"
          style={{
            left: debugWireExtra.anchor.x * view.z + view.x,
            top: debugWireExtra.anchor.y * view.z + view.y - 10,
          }}
        >
          <div className="mb-1 font-bold uppercase tracking-[0.1em] text-[var(--text)]">{debugWireExtra.label}</div>
          <div className="h-px bg-[var(--border)]" />
          <div className="mt-1 space-y-0.5">
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Driver</span>
              <span className="text-[var(--text)]">{debugWireExtra.driver}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Value</span>
              <span style={{ color: valColor(debugWireExtra.value) }} className="font-bold">{debugWireExtra.value}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Transition</span>
              <span className="text-[var(--text)] tabular-nums">{debugWireExtra.t !== undefined ? `t=${debugWireExtra.t}` : "—"}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Fanout</span>
              <span className="text-[var(--text)] tabular-nums">{debugWireExtra.fanout}</span>
            </div>
          </div>
        </div>
      )}

      {debugNodeExtra && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 translate-x-2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-2.5 py-2 text-micro shadow-[var(--shadow)]"
          style={{
            left: debugNodeExtra.anchor.x * view.z + view.x,
            top: debugNodeExtra.anchor.y * view.z + view.y,
          }}
        >
          <div className="mb-1 font-bold uppercase tracking-[0.1em] text-[var(--text)]">{debugNodeExtra.title}</div>
          <div className="h-px bg-[var(--border)]" />
          <div className="mt-1 space-y-0.5">
            {debugNodeExtra.ins.map((p, i) => (
              <div key={"i" + i} className="flex justify-between gap-3 text-[var(--muted)]">
                <span>{p.nm}</span>
                <span style={{ color: valColor(p.v) }} className="font-bold">{p.v}</span>
              </div>
            ))}
            {debugNodeExtra.outs.map((p, i) => (
              <div key={"o" + i} className="flex justify-between gap-3 text-[var(--muted)]">
                <span>{p.nm}</span>
                <span style={{ color: valColor(p.v) }} className="font-bold">{p.v}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Propagation</span>
              <span className="text-[var(--text)] tabular-nums">{debugNodeExtra.delay} ticks</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--muted)]">
              <span>Last transition</span>
              <span className="text-[var(--text)] tabular-nums">
                {debugNodeExtra.to !== undefined ? `t=${debugNodeExtra.from} → ${debugNodeExtra.to}` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {!doc.nodes.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center text-[var(--muted)]">
            <div className="ui-kicker">empty workspace</div>
            <div className="mt-2 text-xs">Drag from the library · pinch or ctrl-scroll to zoom · two-finger pan · right-click for actions</div>
          </div>
        </div>
      )}

      {/* Dwell-timer ring: fills over HOVER_DELAY_MS to show a highlight is
          "charging" so the 2s wait isn't silent. Only shown while pending —
          once the highlight actually commits (or gets pinned via
          right-click) the highlight itself is the feedback. */}
      {rawHover && !netPinned && !netTarget && !drag && hoverScreenPos && (
        <div
          key={`${rawHover.kind}:${rawHover.id}`}
          className="pointer-events-none fixed z-30"
          style={{ left: hoverScreenPos.x - 10, top: hoverScreenPos.y - 10 }}
        >
          <style>{`@keyframes netcharge { from { stroke-dashoffset: 50.27; } to { stroke-dashoffset: 0; } }`}</style>
          <svg width={20} height={20} viewBox="0 0 20 20" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={10} cy={10} r={8} fill="none" stroke="var(--border)" strokeWidth={2} opacity={0.5} />
            <circle
              cx={10}
              cy={10}
              r={8}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray={50.27}
              style={{ animation: `netcharge ${HOVER_DELAY_MS}ms linear forwards` }}
            />
          </svg>
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}

function Minimap({
  doc,
  defs,
  view,
  setView,
  host,
}: {
  doc: { nodes: CNode[] };
  defs: CustomDef[];
  view: View;
  setView: (u: View | ((v: View) => View)) => void;
  host: React.RefObject<HTMLDivElement | null>;
}) {
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
  return (
    <button
      type="button"
      className="absolute bottom-3 left-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 shadow-[var(--shadow)]"
      style={{ width: W, height: H }}
      onPointerDown={(e) => {
        e.stopPropagation();
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const wx = x1 + (e.clientX - box.left) / s;
        const wy = y1 + (e.clientY - box.top) / s;
        setView((v) => ({
          ...v,
          x: (r?.width ?? 800) / 2 - wx * v.z,
          y: (r?.height ?? 500) / 2 - wy * v.z,
        }));
      }}
      title="Minimap — click to center"
    >
      <svg width={W} height={H}>
        {doc.nodes.map((n) => {
          const { w, h } = nodeSize(n, defs);
          return (
            <rect
              key={n.id}
              x={(n.x - x1) * s}
              y={(n.y - y1) * s}
              width={Math.max(2, w * s)}
              height={Math.max(2, h * s)}
              fill="var(--accent)"
              opacity={0.7}
              rx={1}
            />
          );
        })}
        <rect
          x={(vx - x1) * s}
          y={(vy - y1) * s}
          width={vw * s}
          height={vh * s}
          fill="none"
          stroke="var(--text)"
          strokeWidth={1}
          opacity={0.7}
        />
      </svg>
    </button>
  );
}

/** Small pass/fail/unknown badge for a Probe/LED's preset expected value. */
function ExpectBadge({ x, y, pass }: { x: number; y: number; pass: boolean | null }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
      <circle r={6.5} fill={pass === true ? "var(--hi)" : pass === false ? "var(--xx)" : "var(--muted)"} stroke="var(--node)" strokeWidth={1.5} />
      {pass === true && (
        <path d="M-2.8,0.2 L-0.8,2.2 L2.8,-2.2" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pass === false && (
        <>
          <path d="M-2.2,-2.2 L2.2,2.2" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M-2.2,2.2 L2.2,-2.2" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
      {pass === null && (
        <text x={0} y={2.6} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#fff">
          ?
        </text>
      )}
    </g>
  );
}

function NodeView({
  n, defs, sim, selected, onBodyDown, onContextMenu, onDoubleClick, onPortDown, onHoverPort, hoverPort, onToggle, dimmed, reduceGlow, glossy, onHoverStart, onHoverEnd,
}: {
  n: CNode;
  defs: CustomDef[];
  sim: SimResult;
  selected: boolean;
  onBodyDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onPortDown: (e: React.PointerEvent, node: string, dir: "in" | "out", port: number) => void;
  onHoverPort: (k: string | null, e?: React.PointerEvent) => void;
  hoverPort: string | null;
  onToggle: () => void;
  dimmed: boolean;
  reduceGlow: boolean;
  glossy: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const { w, h } = nodeSize(n, defs);
  const { ins, outs } = portCounts(n, defs);
  const names = specOf(n, defs);
  const out = sim.nodeOut.get(n.type === "OUTPUT" || n.type === "LED" ? n.id : outKey(n.id, 0)) ?? sim.nodeOut.get(n.id) ?? "X";
  const title = nodeTitle(n, defs);
  const isSwitch = n.type === "INPUT" || n.type === "CLOCK";
  const isProbe = n.type === "OUTPUT";
  const isLed = n.type === "LED";
  const probeVal = isProbe || isLed ? sim.nodeIn.get(inKey(n.id, 0)) ?? "X" : out;
  const state: Val = isProbe || isLed ? probeVal : out;
  const col = valColor(state);
  const floating = Array.from({ length: ins }).some((_, i) => sim.floating.includes(inKey(n.id, i)));
  // Pass/fail against a preset expected value (set via the right-click
  // menu on a Probe/LED): true/false when the actual value is a
  // determinate 0/1, null when there's nothing to compare (no expectation
  // set) or the actual value is still X/Z (floating/contended).
  const expectPass: boolean | null =
    n.expected == null ? null : state !== 0 && state !== 1 ? null : state === n.expected;

  const body = (
    <g>
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={n.type === "LED" ? h / 2 : 10}
        fill="var(--node)"
        stroke={selected ? "var(--accent)" : "var(--border)"}
        strokeWidth={selected ? 2 : 1.2}
        filter={reduceGlow ? undefined : "url(#nodeShadow)"}
      />
      {/* Top-light / bottom-dark bevel overlay for a glossier 3D look;
          opt-in via the "Glossy" setting (default off — flat reads
          cleaner than the fake-metallic look this produced by default). */}
      {glossy && (
        <rect
          x={0.6}
          y={0.6}
          width={Math.max(0, w - 1.2)}
          height={Math.max(0, h - 1.2)}
          rx={n.type === "LED" ? h / 2 - 0.6 : 9.4}
          fill="url(#nodeBevel)"
          style={{ pointerEvents: "none" }}
        />
      )}
      {selected && (
        <rect x={-3} y={-3} width={w + 6} height={h + 6} rx={n.type === "LED" ? (h + 6) / 2 : 13} fill="none" stroke="var(--accent)" opacity={0.3} strokeWidth={2} />
      )}
      {n.type === "CUSTOM" && <rect x={0} y={0} width={w} height={4} rx={2} fill="var(--accent)" opacity={0.8} />}
      {floating && !isSwitch && (
        <rect x={0} y={0} width={w} height={h} rx={10} fill="none" stroke="var(--xx)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.85} />
      )}
      {n.locked && (
        <g transform="translate(6,6)" opacity={0.9} style={{ pointerEvents: "none" }}>
          <rect x={0} y={3.2} width={9} height={6.8} rx={1.4} fill="var(--muted)" />
          <path d="M1.6 3.2 V1.9 a2.9 2.9 0 0 1 5.8 0 V3.2" fill="none" stroke="var(--muted)" strokeWidth={1.3} />
        </g>
      )}
      {!isLed && (
        <text
          x={w / 2}
          y={isSwitch || isProbe ? 16 : n.type === "VCC" || n.type === "GND" ? h / 2 + 4 : 16}
          textAnchor="middle"
          fontSize={n.type === "CUSTOM" ? 11 : 12}
          fontWeight={700}
          fill="var(--text)"
          style={{ letterSpacing: "0.04em", pointerEvents: "none" }}
        >
          {title}
        </text>
      )}
      {!isSwitch && !isProbe && !isLed && n.type !== "VCC" && n.type !== "GND" && (
        <>
          <circle cx={w - 11} cy={10} r={3.5} fill={col} filter={state === 1 && !reduceGlow ? "url(#glow)" : undefined} />
          {/* Centered (rather than pinned to the bottom-left corner) so it
              never sits under the last input port's label — e.g. "B" on a
              2-input gate used to land right on top of the Δ/ratio text
              here. A halo (paintOrder stroke, matching the node fill) keeps
              it legible over crowded corners regardless. */}
          <text
            x={w / 2}
            y={h - 6}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight={600}
            fill="var(--muted)"
            stroke="var(--node)"
            strokeWidth={3}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {n.delay != null && n.delay > 0 ? `Δ${n.delay}` : n.type === "CUSTOM" ? "BLOCK" : `${ins}→${outs}`}
          </text>
        </>
      )}
      {isSwitch && (
        <g
          onPointerDown={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{ cursor: "pointer" }}
        >
          <rect x={16} y={24} width={48} height={18} rx={9} fill={state === 1 ? "var(--hi)" : "var(--lo)"} opacity={0.85} />
          {glossy && <rect x={16} y={24} width={48} height={9} rx={9} fill="url(#nodeBevel)" style={{ pointerEvents: "none" }} />}
          <circle cx={state === 1 ? 55 : 25} cy={33} r={7} fill="#fff" filter={reduceGlow ? undefined : "url(#nodeShadow)"} />
          {glossy && <circle cx={state === 1 ? 55 : 25} cy={33} r={7} fill="url(#domeGloss)" style={{ pointerEvents: "none" }} />}
        </g>
      )}
      {isProbe && (
        <g>
          <circle cx={w / 2} cy={34} r={9} fill={col} opacity={state === "X" || state === "Z" ? 0.45 : 1} filter={state === 1 && !reduceGlow ? "url(#glow)" : undefined} />
          {glossy && <circle cx={w / 2} cy={34} r={9} fill="url(#domeGloss)" style={{ pointerEvents: "none" }} />}
          <text x={w / 2} y={38} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--node)">
            {state}
          </text>
          {n.expected != null && <ExpectBadge x={w - 9} y={9} pass={expectPass} />}
        </g>
      )}
      {isLed && (
        <g>
          <circle cx={w / 2} cy={h / 2} r={18} fill={col} opacity={state === 1 ? 1 : 0.25} filter={state === 1 && !reduceGlow ? "url(#glow)" : undefined} />
          {glossy && <circle cx={w / 2} cy={h / 2} r={18} fill="url(#domeGloss)" opacity={state === 1 ? 1 : 0.6} style={{ pointerEvents: "none" }} />}
          <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={8} fill="var(--muted)">
            {title}
          </text>
          {n.expected != null && <ExpectBadge x={w - 6} y={6} pass={expectPass} />}
        </g>
      )}
    </g>
  );

  const ports: React.ReactNode[] = [];
  for (let i = 0; i < ins; i++) {
    const p = localPort(n, defs, "in", i);
    const v = sim.nodeIn.get(inKey(n.id, i)) ?? "X";
    const k = `${n.id}|in|${i}`;
    const label = names.ins[i];
    ports.push(
      <g
        key={k}
        onPointerDown={(e) => onPortDown(e, n.id, "in", i)}
        onPointerEnter={(e) => onHoverPort(k, e)}
        onPointerLeave={() => onHoverPort(null)}
        style={{ cursor: "crosshair" }}
      >
        <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
        <circle cx={p.x} cy={p.y} r={hoverPort === k ? 6.5 : 5} fill={valColor(v)} stroke="var(--panel)" strokeWidth={1.4} />
        {label && ins > 1 && (
          <text
            x={p.x + 7}
            y={p.y + 3}
            fontSize={7}
            fontWeight={600}
            fill="var(--muted)"
            stroke="var(--node)"
            strokeWidth={2.5}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {label}
          </text>
        )}
      </g>,
    );
  }
  for (let i = 0; i < outs; i++) {
    const p = localPort(n, defs, "out", i);
    const v = sim.nodeOut.get(outKey(n.id, i)) ?? "X";
    const k = `${n.id}|out|${i}`;
    const label = names.outs[i];
    ports.push(
      <g
        key={k}
        onPointerDown={(e) => onPortDown(e, n.id, "out", i)}
        onPointerEnter={(e) => onHoverPort(k, e)}
        onPointerLeave={() => onHoverPort(null)}
        style={{ cursor: "crosshair" }}
      >
        <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
        <circle cx={p.x} cy={p.y} r={hoverPort === k ? 6.5 : 5} fill={valColor(v)} stroke="var(--panel)" strokeWidth={1.4} />
        {label && outs > 1 && (
          <text
            x={p.x - 7}
            y={p.y + 3}
            textAnchor="end"
            fontSize={7}
            fontWeight={600}
            fill="var(--muted)"
            stroke="var(--node)"
            strokeWidth={2.5}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {label}
          </text>
        )}
      </g>,
    );
  }

  return (
    <g transform={`translate(${n.x},${n.y}) rotate(${n.rot},${w / 2},${h / 2})`} opacity={dimmed ? 0.22 : 1}>
      <g
        onPointerDown={onBodyDown}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onPointerEnter={onHoverStart}
        onPointerLeave={onHoverEnd}
        style={{ cursor: n.locked ? "not-allowed" : "move" }}
      >
        {body}
      </g>
      {ports}
    </g>
  );
}

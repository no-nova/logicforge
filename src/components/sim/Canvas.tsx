import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Box,
  Circle,
  CircleDot,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  FileCode,
  FileText,
  LayoutGrid,
  Lock,
  Maximize2,
  MousePointer2,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Unlock,
  Waypoints,
  XCircle,
} from "lucide-react";
import ContextMenu, { type MenuItem } from "./ContextMenu";
import {
  type CNode,
  type CustomDef,
  type NodeKind,
  type SimResult,
  type Val,
  CATALOG,
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
import { gateShape } from "./GateShapes";
import { depthMetrics, layerById } from "@/lib/sim/layers";
import { type EditorAPI, cloneChunk } from "@/lib/sim/store";
import type { Region, Wire } from "@/lib/sim/types";
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
  onOpenAI?: (nodeId?: string) => void;
  onCloseAI?: () => void;
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

// Region helpers: collect external ports for a functional block
function getRegionExternalPorts(region: Region, doc: { nodes: CNode[]; wires: { id: string; from: { node: string; port: number }; to: { node: string; port: number } }[] }, defs: CustomDef[]) {
  const inside = new Set(region.nodeIds);
  const inputs: { nodeId: string; port: number; name: string; val: Val }[] = [];
  const outputs: { nodeId: string; port: number; name: string; val: Val }[] = [];
  const wireFromSet = new Set(doc.wires.map((w)=> `${w.from.node}:${w.from.port}`));
  const wireToSet = new Set(doc.wires.map((w)=> `${w.to.node}:${w.to.port}`));
  // Need sim? We'll pass later; for now just collect names, val will be resolved in component
  for (const nid of region.nodeIds) {
    const node = doc.nodes.find((n)=> n.id===nid);
    if (!node) continue;
    const { ins, outs } = portCounts(node, defs);
    const names = specOf(node, defs);
    for (let i=0;i<ins;i++) {
      const hasWire = doc.wires.some((w)=> w.to.node===nid && w.to.port===i);
      const fromOutside = doc.wires.some((w)=> w.to.node===nid && w.to.port===i && !inside.has(w.from.node));
      const isExternal = !hasWire || fromOutside;
      // Unconnected or externally driven -> show on left
      if (isExternal) {
        inputs.push({ nodeId: nid, port: i, name: names.ins[i] ?? `in${i}`, val: "X" as Val });
      }
    }
    for (let i=0;i<outs;i++) {
      const hasWire = doc.wires.some((w)=> w.from.node===nid && w.from.port===i);
      const toOutside = doc.wires.some((w)=> w.from.node===nid && w.from.port===i && !inside.has(w.to.node));
      const isExternal = !hasWire || toOutside;
      if (isExternal) {
        outputs.push({ nodeId: nid, port: i, name: names.outs[i] ?? `out${i}`, val: "X" as Val });
      }
    }
  }
  return { inputs, outputs };
}

export default function Canvas(props: Props) {
  const { ed, sim, view, setView, startInertia, stopInertia, running, wireStyle, snapOn, wheelZoom, spacePan, reduceGlow, glossy, onToggleSwitch, onCursor, fit, onOpenAI, onCloseAI } = props;
  const { doc, selection, selectedWires } = ed;
  const defs = doc.defs;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const dragRef = useRef<Drag>(null);
  // Performance: flag when user is actively panning/zooming — disable expensive blur/filters during interaction for smoothness
  const [isInteracting, setIsInteracting] = useState(false);
  const interactingTimeout = useRef<number | null>(null);
  const setInteracting = (v: boolean) => {
    if (v) {
      if (interactingTimeout.current) window.clearTimeout(interactingTimeout.current);
      setIsInteracting(true);
    } else {
      if (interactingTimeout.current) window.clearTimeout(interactingTimeout.current);
      interactingTimeout.current = window.setTimeout(()=> setIsInteracting(false), 140) as any;
    }
  };
  dragRef.current = drag;
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [hoverPort, setHoverPort] = useState<string | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; wx: number; wy: number; node?: string; wire?: string; selectionAtOpen?: string[] } | null>(
    null,
  );
  // Inline rename — left side of component, preserves connections if compatible
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  // Next-component picker — 3 circles surrounding node, triggered by double-click, clock fade, loop, middle enlarged
  const [pickerIdx, setPickerIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rightLongPressTimer = useRef<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapSelection, setMapSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const mapDragRef = useRef<{ sx: number; sy: number } | null>(null);

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
  useEffect(()=> { if (!pickerOpen) { setPickerIdx(0); setEditingId(null); setEditError(null); } }, [selection.join(",")]);
  useEffect(()=>{
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPickerOpen(false); setEditingId(null); setEditError(null); }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // confirm handled in separate effect with selectedPicker
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);
  // Global Esc: cancel selection, close map, clear menu
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mapExpanded) { setMapExpanded(false); setMapSelection(null); return; }
        if (menu) { setMenu(null); return; }
        if (pickerOpen) { setPickerOpen(false); setEditingId(null); return; }
        if (selection.length || selectedWires.length) {
          ed.setSelection([]);
          ed.setSelectedWires([]);
        }
        clearNetHighlight();
      }
      if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
        // allow default select all via our handler, but prevent browser
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapExpanded, menu, pickerOpen, selection, selectedWires]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const rightPanRef = useRef(false);
  const rightSelectStart = useRef<{ x: number; y: number } | null>(null);
  const pendingMarqueeRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const leftMarqueeRef = useRef(false); // true if current marquee was left-click selection (no Region)
  const selectionRef = useRef<string[]>([]);
  // keep selection fresh for menu actions
  useEffect(()=>{ selectionRef.current = selection; }, [selection]);
  const infoBlockUntil = useRef(0);
  const pendingRegionDrag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; nodeStarts: Map<string,{x:number;y:number}> } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  // Throttled view setter for smooth pan/zoom — batches rapid setView calls into rAF (60fps) to reduce re-render lag
  const pendingView = useRef<View | null>(null);
  const rafView = useRef<number>(0);
  const setViewThrottled = (u: View | ((v: View)=>View)) => {
    const next = typeof u === 'function' ? (u as any)(viewRef.current) : u;
    pendingView.current = next;
    if (rafView.current) return;
    rafView.current = requestAnimationFrame(()=> {
      rafView.current = 0;
      const v = pendingView.current;
      pendingView.current = null;
      if (v) setView(v);
    });
  };
  // During active drag/zoom use throttled, otherwise immediate
  const setViewSmart = (u: View | ((v: View)=>View)) => {
    if (isInteracting || dragRef.current?.kind==='pan' || dragRef.current?.kind==='pinch') {
      setViewThrottled(u);
    } else {
      setView(u);
    }
  };

  const layers = (ed as any).layers ?? [];
  const activeLayerId = (ed as any).activeLayerId as string | undefined;
  const flattenLayers = !!(ed as any).flattenLayers;
  const sortedLayers = [...layers].sort((a:any,b:any)=>a.order-b.order);
  // Only operate on components exactly one level deeper (e.g. fore can operate mid, not bg)
  const activeIdx = sortedLayers.findIndex((l:any)=> l.id===activeLayerId);
  const canInteractLayer = (layerId?: string) => {
    if (flattenLayers) return true;
    if (!layerId) return true;
    if (layerId===activeLayerId) return true;
    const idx = sortedLayers.findIndex((l:any)=> l.id===layerId);
    if (idx===-1) return false;
    return idx === activeIdx - 1;
  };

  // Swipe to switch layers: vertical drag on empty canvas cycles layers with continuity (blurry->clear)
  const swipeRef = useRef<{ y: number; active: string | undefined } | null>(null);

  // Helper to switch layer with animated continuity
  const cycleLayer = (dir: 1 | -1) => {
    if (!sortedLayers.length) return;
    const idx = sortedLayers.findIndex((l:any)=>l.id===activeLayerId);
    const cur = idx>=0?idx:sortedLayers.length-1;
    const nxt = (cur + dir + sortedLayers.length) % sortedLayers.length;
    (ed as any).setActiveLayer?.(sortedLayers[nxt].id);
  };

  const toWorld = useCallback(
    (cx: number, cy: number, v = viewRef.current) => {
      const r = ref.current!.getBoundingClientRect();
      return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
    },
    [],
  );

  // Wheel: Shift+scroll switches layers, direct scroll zooms (touchpad swipe ignored for layer)
  const wheelThrottle = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (pickerOpen) {
        const dir = e.deltaY > 0 ? 1 : -1;
        setPickerIdx((i)=> {
          const n = pickerCandidates.length || 1;
          return ((i+dir)%n+n)%n;
        });
        return;
      }
      // Shift+wheel => layer switch (with touchpad filter)
      if (e.shiftKey) {
        const isTouchpadSwipe = (Math.abs(e.deltaX) > 5 && Math.abs(e.deltaY) > 5) || (Math.abs(e.deltaY) < 28 && Math.abs(e.deltaY) > 0);
        if (isTouchpadSwipe && !e.ctrlKey && !e.metaKey) return;
        const now = Date.now();
        if (now - wheelThrottle.current < 220) return;
        wheelThrottle.current = now;
        const dir = e.deltaY > 0 ? 1 : -1;
        if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;
        cycleLayer(dir as 1|-1);
        return;
      }
      // Direct scroll => zoom toward cursor
      stopInertia();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      const dy = clamp(e.deltaY * unit, 400);
      // pinch or wheel zoom
      const newZ = viewRef.current.z * Math.exp(-dy * 0.0018);
      (isInteracting ? setViewThrottled : setView)((v) => zoomToward(v, mx, my, newZ));
      setInteracting(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pickerOpen, cycleLayer, setView, stopInertia]);

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
    // Single click on component should allow info pop-up (clear any block from canvas click)
    infoBlockUntil.current = 0;
    // If picker is open and clicking different node, close picker first
    if (pickerOpen && id !== editingId) {
      setPickerOpen(false);
      setEditingId(null);
      setEditError(null);
      // allow normal selection/drag after closing? For now close and proceed
    }
    // One-level deeper rule: only active or exactly one level deeper can be manipulated
    const nd0 = doc.nodes.find((n)=> n.id===id);
    if (nd0 && !canInteractLayer((nd0 as any).layerId) && !flattenLayers) {
      if (!selection.includes(id)) { ed.setSelection([id]); ed.setSelectedWires([]); }
      return;
    }
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
      const ndrag2 = { kind: "node", sx: p.x, sy: p.y, start } as Drag;
      dragRef.current = ndrag2;
      setDrag(ndrag2);
      return;
    }
    ed.pushHistory("move");
    // Locked nodes stay selectable but are left out of the drag's start
    // map, so they simply don't move even if they're part of a larger
    // selection being dragged together.
    const start = new Map(
      doc.nodes.filter((n) => sel.includes(n.id) && !n.locked).map((n) => [n.id, { x: n.x, y: n.y }]),
    );
    const ndrag = { kind: "node", sx: p.x, sy: p.y, start } as Drag;
    // Set ref synchronously so first onPointerMove sees it (long-press drag sometimes missed first frame)
    dragRef.current = ndrag;
    setDrag(ndrag);
  };

  const startPortDrag = (e: React.PointerEvent, node: string, dir: "in" | "out", port: number) => {
    e.stopPropagation();
    infoBlockUntil.current = 0;
    const ndp = doc.nodes.find((n)=> n.id===node);
    if (ndp && !canInteractLayer((ndp as any).layerId) && !flattenLayers) return;
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
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
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
    // Picker mode: left-click elsewhere exits, Esc also exits (handled in effect)
    if (pickerOpen && e.button===0) {
      // Click on empty canvas exits picker (handled here for empty area; node clicks also need to close via selection change)
      setPickerOpen(false);
      setEditingId(null);
      setEditError(null);
      setMenu(null);
      // don't start marquee on the same click that closes picker
      return;
    }
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
    // Left button: left-click selection (temporary, no Region) — drag selects, click clears + closes AI (like Esc)
    // Renamed from left-drag pan — pan now via middle/Alt/Space only; left is selection only
    if (e.button === 0) {
      e.preventDefault();
      if (mapExpanded) {
        setMapExpanded(false);
        setMapSelection(null);
        return;
      }
      infoBlockUntil.current = Date.now() + 10000;
      const startWorld = toWorld(e.clientX, e.clientY);
      (beginPan as any)._pendingLeftMarquee = { sx: startWorld.x, sy: startWorld.y, cx: e.clientX, cy: e.clientY };
      leftMarqueeRef.current = false;
      try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
      return;
    }
    if (e.button === 1 || e.altKey || spacePan || e.buttons === 4) {
      e.preventDefault();
      beginPan(e);
      return;
    }
    // In map expanded mode, all pointer handling is delegated to expanded map overlay
    if (mapExpanded) return;
    // Right button: immediate drag selection (with long-press distinction for context menu)
    if (e.button === 2) {
      e.preventDefault();
      rightPanRef.current = false;
      rightSelectStart.current = { x: e.clientX, y: e.clientY };
      if (rightLongPressTimer.current) window.clearTimeout(rightLongPressTimer.current);
      const startWorld = toWorld(e.clientX, e.clientY);
      const startClientY = e.clientY;
      // Prepare pending marquee for immediate drag, also keep long-press timer as fallback
      pendingMarqueeRef.current = { sx: startWorld.x, sy: startWorld.y, cx: e.clientX, cy: e.clientY };
      // Long-press still suppresses menu if held without movement
      rightLongPressTimer.current = window.setTimeout(()=> {
        if (pendingMarqueeRef.current) {
          rightPanRef.current = true;
          leftMarqueeRef.current = false;
          swipeRef.current = { y: startClientY, active: activeLayerId };
          if (!e.shiftKey) {
            ed.setSelection([]);
            ed.setSelectedWires([]);
          }
          const pm = pendingMarqueeRef.current;
          pendingMarqueeRef.current = null;
          setDrag({ kind: "marquee", sx: pm.sx, sy: pm.sy, x: pm.sx, y: pm.sy });
        }
      }, 380);
      return;
    }
    if (e.button !== 0) return;
    // Fallback (should not reach, left already handled)
    const p = toWorld(e.clientX, e.clientY);
    swipeRef.current = { y: e.clientY, active: activeLayerId };
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
    // Hover over map auto-move entire map component: when near viewport edge, gently pan
    if (!dragRef.current && !pendingRegionDrag.current && !pendingMarqueeRef.current) {
      const r = ref.current?.getBoundingClientRect();
      if (r) {
        const edge = 36;
        const speed = 1.8;
        let dx = 0, dy = 0;
        if (e.clientX - r.left < edge) dx = speed * (1 - (e.clientX - r.left)/edge);
        else if (r.right - e.clientX < edge) dx = -speed * (1 - (r.right - e.clientX)/edge);
        if (e.clientY - r.top < edge) dy = speed * (1 - (e.clientY - r.top)/edge);
        else if (r.bottom - e.clientY < edge) dy = -speed * (1 - (r.bottom - e.clientY)/edge);
        if (dx || dy) {
          // Only auto-move if hovering over empty map area (not over node/port) - check via rawHover null and no selection drag
          if (!rawHover) {
            setViewThrottled((v)=> ({ ...v, x: v.x + dx*1.2, y: v.y + dy*1.2 }));
            setInteracting(true);
          }
        }
      }
    }
    // Pending left-click selection: drag selects components (temporary, no Region creation) — like right but no divide
    if ((beginPan as any)._pendingLeftMarquee) {
      const pm = (beginPan as any)._pendingLeftMarquee as { sx: number; sy: number; cx: number; cy: number };
      if (Math.hypot(e.clientX - pm.cx, e.clientY - pm.cy) > 4) {
        (beginPan as any)._pendingLeftMarquee = null;
        leftMarqueeRef.current = true;
        if (!e.shiftKey) {
          ed.setSelection([]);
          ed.setSelectedWires([]);
        }
        try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
        swipeRef.current = { y: pm.cy, active: activeLayerId };
        setDrag({ kind: "marquee", sx: pm.sx, sy: pm.sy, x: p.x, y: p.y });
        return;
      }
    }
    // Pending right-drag marquee: start immediately on movement >4px (normal-mode right-hold drags marquee, not just menu)
    // Do not gate on e.buttons — after setPointerCapture some browsers report 0; just check distance while pending
    if (pendingMarqueeRef.current) {
      const pm = pendingMarqueeRef.current;
      if (Math.hypot(e.clientX - pm.cx, e.clientY - pm.cy) > 4) {
        if (rightLongPressTimer.current) { window.clearTimeout(rightLongPressTimer.current); rightLongPressTimer.current = null; }
        rightPanRef.current = true;
        leftMarqueeRef.current = false;
        // capture shift at drag start
        (pendingMarqueeRef as any).shiftHeld = e.shiftKey;
        pendingMarqueeRef.current = null;
        if (!e.shiftKey) {
          ed.setSelection([]);
          ed.setSelectedWires([]);
        }
        // prevent browser context menu from appearing after this drag
        try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
        setDrag({ kind: "marquee", sx: pm.sx, sy: pm.sy, x: p.x, y: p.y });
        return;
      }
    }
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
    // Region drag handling
    if (pendingRegionDrag.current) {
      const pr = pendingRegionDrag.current;
      const dx = p.x - pr.sx;
      const dy = p.y - pr.sy;
      // live update region and nodes
      ed.live((doc0:any)=>{
        const reg = (doc0.regions ?? []).find((r:any)=> r.id===pr.id);
        if (!reg) return doc0;
        const nodes = doc0.nodes.map((n:any)=> {
          const s = pr.nodeStarts.get(n.id);
          if (!s) return n;
          return { ...n, x: s.x + dx, y: s.y + dy };
        });
        const regions = (doc0.regions ?? []).map((r:any)=> r.id===pr.id ? { ...r, x: pr.ox + dx, y: pr.oy + dy } : r);
        return { ...doc0, nodes, regions };
      });
      return;
    }
    if (d.kind === "pan") {
      const now = performance.now();
      const dt = Math.max(8, now - d.lastT);
      const ivx = ((e.clientX - d.lastX) / dt) * 16;
      const ivy = ((e.clientY - d.lastY) / dt) * 16;
      const vx = d.vx * 0.35 + ivx * 0.65;
      const vy = d.vy * 0.35 + ivy * 0.65;
      setViewThrottled({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy), z: viewRef.current.z });
      setDrag({ ...d, lastX: e.clientX, lastY: e.clientY, lastT: now, vx, vy });
      setInteracting(true);
      // Any motion during a right-button pan should suppress the context menu on release
      if (e.buttons === 2 || e.button === 2) rightPanRef.current = true;
      else if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 3 && (d as any).sx !== undefined) {
        // Also mark for middle/alt pans that started from right? keep generic
        if ((typeof e.buttons === 'number' && (e.buttons & 2) !== 0)) rightPanRef.current = true;
      }
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
    const p = toWorld(e.clientX, e.clientY);
    // Right button: handle pending marquee and short click
    if (e.button === 2) {
      if (pendingMarqueeRef.current) {
        // No movement -> click, not drag
        pendingMarqueeRef.current = null;
      }
      if (rightLongPressTimer.current) {
        window.clearTimeout(rightLongPressTimer.current);
        rightLongPressTimer.current = null;
        if (!dragRef.current) {
          // short click: do not start marquee, let onCanvasContext handle menu
          rightSelectStart.current = null;
          setDrag(null);
          return;
        }
      }
      rightSelectStart.current = null;
    }
    if (rightLongPressTimer.current && e.button !== 2) { window.clearTimeout(rightLongPressTimer.current); rightLongPressTimer.current = null; }
    if (pendingMarqueeRef.current) pendingMarqueeRef.current = null;
    // Left pending click: if no pan started, treat as click on empty canvas -> clear selection
    if ((beginPan as any)._longLeftTimer) { try{ window.clearTimeout((beginPan as any)._longLeftTimer);}catch{} (beginPan as any)._longLeftTimer = null; }
    if ((beginPan as any)._pendingLeftMarquee) {
      const pend = (beginPan as any)._pendingLeftMarquee as { sx: number; sy: number; cx: number; cy: number };
      (beginPan as any)._pendingLeftMarquee = null;
      if (!dragRef.current && Math.hypot(e.clientX - pend.cx, e.clientY - pend.cy) < 4) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          if (!pickerOpen && !menu) {
            ed.setSelection([]);
            ed.setSelectedWires([]);
            // Left-click empty canvas also closes AI chat (like Esc)
            try { (onCloseAI as any)?.(); } catch {}
          }
        }
      }
    }
    // also clear any legacy _pendingLeft still hanging (cleanup)
    if ((beginPan as any)._pendingLeft) (beginPan as any)._pendingLeft = null;
    const d = dragRef.current;
    setInteracting(false);
    if (rafView.current) { cancelAnimationFrame(rafView.current); rafView.current = 0; }
    if (d?.kind === "pan") {
      if (Math.hypot(d.vx, d.vy) > 1.2) startInertia(d.vx, d.vy);
      try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
      setTimeout(() => { if (rightPanRef.current) rightPanRef.current = false; }, 180);
    }
    // End region drag
    if (pendingRegionDrag.current) {
      const pr = pendingRegionDrag.current;
      const dx = p.x - pr.sx;
      const dy = p.y - pr.sy;
      pendingRegionDrag.current = null;
      if (Math.hypot(dx, dy) > 2) {
        ed.commit((d:any)=>{
          const reg = (d.regions ?? []).find((r:any)=> r.id===pr.id);
          if (!reg) return d;
          const nodes = d.nodes.map((n:any)=> {
            const s = pr.nodeStarts.get(n.id);
            if (!s) return n;
            return { ...n, x: snap(s.x + dx), y: snap(s.y + dy) };
          });
          const regions = (d.regions ?? []).map((r:any)=> r.id===pr.id ? { ...r, x: snap(pr.ox + dx), y: snap(pr.oy + dy) } : r);
          return { ...d, nodes, regions };
        }, "move region");
      }
      setDrag(null);
      return;
    }
    if (d?.kind === "marquee") {
      const x1 = Math.min(d.sx, d.x);
      const x2 = Math.max(d.sx, d.x);
      const y1 = Math.min(d.sy, d.y);
      const y2 = Math.max(d.sy, d.y);
      const dx = x2 - x1;
      const dy = y2 - y1;
      // Continuity: sliding on canvas switches layers with blurry→clear transition
      const isVerticalSwipe = dy > 70 && dx < 50 && swipeRef.current;
      if (isVerticalSwipe) {
        const startY = swipeRef.current!.y;
        const curY = e.clientY;
        const delta = curY - startY;
        if (Math.abs(delta) > 42) {
          if (delta < 0) cycleLayer(1);
          else cycleLayer(-1);
        }
      } else if (Math.abs(x2 - x1) > 4 || Math.abs(y2 - y1) > 4) {
        const hit = doc.nodes
          .filter((n) => {
            const { w, h } = nodeSize(n, defs);
            return n.x < x2 && n.x + w > x1 && n.y < y2 && n.y + h > y1;
          })
          .map((n) => n.id);
        const newSel = e.shiftKey ? [...new Set([...selection, ...hit])] : hit;
        ed.setSelection(newSel);
        // Left-click selection is temporary only — do NOT create Region (right-drag does)
        if (leftMarqueeRef.current) {
          // left selection done, no region, reset flag
          leftMarqueeRef.current = false;
        } else {
        // Auto-divide into functional blocks (regions) after right marquee
        if (hit.length >= 2) {
          // Divide by connectivity: each connected component becomes a region
          const comps: string[][] = [];
          const visited = new Set<string>();
          const adj = new Map<string, Set<string>>();
          for (const id of hit) adj.set(id, new Set());
          for (const w of doc.wires) {
            if (hit.includes(w.from.node) && hit.includes(w.to.node)) {
              adj.get(w.from.node)!.add(w.to.node);
              adj.get(w.to.node)!.add(w.from.node);
            }
          }
          for (const id of hit) {
            if (visited.has(id)) continue;
            const stack = [id];
            const comp: string[] = [];
            visited.add(id);
            while (stack.length) {
              const cur = stack.pop()!;
              comp.push(cur);
              for (const nb of adj.get(cur) ?? []) {
                if (!visited.has(nb)) { visited.add(nb); stack.push(nb); }
              }
            }
            comps.push(comp);
          }
          // Create a region per component (or single region if one component)
          // Use timeout to avoid state batching issues
          setTimeout(()=>{
            const existing = new Set(((doc as any).regions ?? []).map((r:any)=> r.nodeIds.slice().sort().join(",")));
            for (const comp of comps) {
              if (!comp.length) continue;
              const key = [...comp].sort().join(",");
              if (existing.has(key)) continue;
              (ed as any).createRegion?.(comp);
              existing.add(key);
            }
          }, 0);
        }
        } // end left vs right
      } else if (e.detail === 2) {
        fit();
      }
      swipeRef.current = null;
      // safety: if not reset earlier, clear left flag
      leftMarqueeRef.current = false;
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
    if (mapExpanded) { setMapExpanded(false); setMapSelection(null); return; }
    if (pickerOpen) { setPickerOpen(false); setEditingId(null); return; }
    if (rightPanRef.current) {
      rightPanRef.current = false;
      setDrag(null);
      // also clear pending marquee to avoid leftover
      pendingMarqueeRef.current = null;
      if (rightLongPressTimer.current) { window.clearTimeout(rightLongPressTimer.current); rightLongPressTimer.current = null; }
      return;
    }
    setDrag(null);
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, selectionAtOpen: [...selection] });
  };

  const onNodeContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    // Capture selection snapshot BEFORE mutating, then mutate and also store snapshot that includes the clicked node
    const wasSelected = selection.includes(id);
    const snapSel = wasSelected ? [...selection] : [id];
    // If multiple already selected and clicking one of them, keep full selection (for N-move)
    const effectiveSnap = wasSelected && selection.length > 1 ? [...selection] : snapSel;
    if (!selection.includes(id)) {
      // synchronously update ref as well to avoid stale closure in layer move
      selectionRef.current = effectiveSnap;
      ed.setSelection(effectiveSnap);
      ed.setSelectedWires([]);
    }
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, node: id, selectionAtOpen: effectiveSnap });
  };

  const onRenameNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const node = doc.nodes.find((x) => x.id === id);
    if (!node) return;
    if (node.type === "TEXT") {
      const current = node.text ?? node.label ?? "";
      const next = window.prompt("Edit text", current);
      if (next == null) return;
      ed.commit(
        (d) => ({ ...d, nodes: d.nodes.map((x) => (x.id === id ? { ...x, text: next, label: next.split("\n")[0]?.slice(0, 30) } : x)) }),
        "edit text",
      );
      return;
    }
    // Double-click triggers quick-select menu: renaming on left + wheel picker on right, surrounding node
    infoBlockUntil.current = Date.now() + 10000;
    const curName = node.type === "CUSTOM" ? (defs.find((d)=>d.id===node.defId)?.name ?? "CUSTOM") : node.type;
    setEditingId(id);
    setEditText(curName);
    setEditError(null);
    setPickerOpen(true);
    setPickerIdx(0);
    // ensure selection is this node
    if (!selection.includes(id)) {
      ed.setSelection([id]);
      ed.setSelectedWires([]);
    }
    setTimeout(()=> editInputRef.current?.focus(), 30);
    setTimeout(()=> editInputRef.current?.select(), 35);
  };
  const commitRename = (id: string, raw: string) => {
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) { setEditingId(null); return; }
    const node = doc.nodes.find((n)=> n.id===id);
    if (!node) { setEditingId(null); return; }
    const isCustom = defs.find((d)=> d.name.toUpperCase()===trimmed);
    let targetType: NodeKind | null = null;
    let targetDefId: string | undefined;
    if (isCustom) { targetType = "CUSTOM"; targetDefId = isCustom.id; }
    else if ((CATALOG as any)[trimmed]) { targetType = trimmed as NodeKind; }
    else {
      setEditError(`No component "${raw.trim()}"`);
      setTimeout(()=> {
        const el = document.getElementById("rename-err-"+id);
        if (el) { el.style.transform = "translateX(74px)"; el.style.opacity = "0"; }
      }, 900);
      setTimeout(()=> setEditError(null), 1600);
      return;
    }
    const curIns = portCounts(node, defs).ins;
    const curOuts = portCounts(node, defs).outs;
    const nextNode: CNode = { ...node, type: targetType!, defId: targetDefId, label: node.label } as any;
    const { ins: nxtIns, outs: nxtOuts } = (()=> {
      const s = targetType==="CUSTOM" ? { ins: isCustom!.inputs.length, outs: isCustom!.outputs.length } : { ins: (CATALOG as any)[targetType!].ins(nextNode).length, outs: (CATALOG as any)[targetType!].outs(nextNode).length };
      return s;
    })();
    if (curIns !== nxtIns || curOuts !== nxtOuts) {
      const attached = doc.wires.filter((w)=> w.from.node===id || w.to.node===id);
      const incompatible = attached.some((w)=>{
        if (w.from.node===id && w.from.port >= nxtOuts) return true;
        if (w.to.node===id && w.to.port >= nxtIns) return true;
        return false;
      });
      if (incompatible) {
        setEditError(`Ports ${curIns}→${curOuts} vs ${nxtIns}→${nxtOuts}: incompatible`);
        setTimeout(()=> setEditError(null), 1800);
        return;
      }
    }
    ed.commit((d)=> ({
      ...d,
      nodes: d.nodes.map((n)=> n.id===id ? { ...n, type: targetType!, defId: targetDefId, inputs: (targetType!=="CUSTOM" ? (CATALOG as any)[targetType!].defaultInputs : isCustom!.inputs.length) } : n),
      wires: d.wires.filter((w)=>{
        if (w.from.node===id && w.from.port >= nxtOuts) return false;
        if (w.to.node===id && w.to.port >= nxtIns) return false;
        return true;
      }),
    }), `change ${node.type} → ${targetType}`);
    setEditingId(null);
    setEditError(null);
  };

  const onRegionContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    const reg = (doc as any).regions?.find((r:any)=> r.id===id);
    const snap = reg ? [...reg.nodeIds] : [...selection];
    if (reg) {
      selectionRef.current = snap;
      ed.setSelection(snap);
      ed.setSelectedWires([]);
    }
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, node: id, selectionAtOpen: snap } as any);
  };

  const onWireContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    ed.setSelectedWires([id]);
    ed.setSelection([]);
    const p = toWorld(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, wire: id, selectionAtOpen: [...selection] });
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
  // Clickable cross-layer jump
  const jumpToLayerOf = (nodeId: string) => {
    const nd = nodeMap.get(nodeId);
    if (!nd) return;
    const lid = (nd as any).layerId ?? activeLayerId;
    if (lid && lid !== activeLayerId) (ed as any).setActiveLayer?.(lid);
    const { w, h } = nodeSize(nd, defs);
    const cx = nd.x + w/2;
    const cy = nd.y + h/2;
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const targetX = r.width/2 - cx * viewRef.current.z;
      const targetY = r.height/2 - cy * viewRef.current.z;
      setView((v:any)=>({ ...v, x: targetX, y: targetY }));
    }
  };

  // Picker candidates — only components with a receiving end (inputs), plus custom defs. Looped carousel of 3.
  const pickerCandidates = useMemo(() => {
    const base: { type: NodeKind; defId?: string; name: string; color?: string }[] = [];
    for (const [k, spec] of Object.entries(CATALOG) as any) {
      const ins = spec.ins({ inputs: spec.defaultInputs, type: k } as any)?.length ?? spec.minIn ?? 1;
      if (ins > 0) base.push({ type: k as NodeKind, name: spec.name });
    }
    for (const d of defs) base.push({ type: "CUSTOM" as NodeKind, defId: d.id, name: d.name, color: d.color });
    return base;
  }, [defs]);
  const selectedNode = selection.length===1 ? nodeMap.get(selection[0]) ?? null : null;
  const selectedPicker = pickerCandidates.length ? pickerCandidates[((pickerIdx % pickerCandidates.length)+pickerCandidates.length)%pickerCandidates.length] : null;
  const norm = (i:number)=> ((i%pickerCandidates.length)+pickerCandidates.length)%pickerCandidates.length;
  const visiblePicker = pickerCandidates.length ? [pickerCandidates[norm(pickerIdx-1)], pickerCandidates[norm(pickerIdx)], pickerCandidates[norm(pickerIdx+1)]] : [];
  // Space/Enter confirms picker middle item
  useEffect(()=>{
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key==="Enter" || e.key===" ") {
        e.preventDefault();
        if (selectedNode && selectedPicker) {
          const cur = selectedNode;
          const cand = selectedPicker;
          const { w, h } = nodeSize(cur, defs);
          const nx = cur.x + w + 72;
          const ny = cur.y + h/2 - 25;
          const nid = ed.addNode(cand.type as any, nx, ny, (cand as any).defId);
          setTimeout(()=>{
            const fresh = (ed as any).doc?.nodes?.find((n:any)=> n.id===nid);
            if (fresh) {
              const nIns = portCounts(fresh, (ed as any).doc.defs).ins;
              const curOuts = portCounts(cur, defs).outs;
              if (curOuts>0 && nIns>0) ed.connect({ node: cur.id, port: 0 }, { node: nid, port: 0 });
            }
          }, 0);
          setPickerOpen(false);
          setEditingId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [pickerOpen, selectedPicker, selectedNode]);



  const wireGeo = doc.wires
    .map((w) => {
      const a = nodeMap.get(w.from.node);
      const b = nodeMap.get(w.to.node);
      if (!a || !b) return null;
      if (w.from.port >= portCounts(a, defs).outs || w.to.port >= portCounts(b, defs).ins) return null;
      const pa = portPos(a, defs, "out", w.from.port);
      const pb = portPos(b, defs, "in", w.to.port);
      const d = wirePath(pa, pb, portDir(a, "out"), portDir(b, "in"));
      const aL = (a as any).layerId as string | undefined;
      const bL = (b as any).layerId as string | undefined;
      const cross = !!aL && !!bL && aL !== bL && !flattenLayers;
      const aLayer = layers.find((l:any)=>l.id===aL);
      const bLayer = layers.find((l:any)=>l.id===bL);
      // cross-layer interface color: use source layer color, target distinct
      const colOverride = cross ? (aLayer?.color ?? bLayer?.color) : undefined;
      return { w, d, v: sim.wireValues.get(w.id) ?? "X", pa, pb, cross, aL, bL, colOverride, aLayer, bLayer };
    })
    .filter(Boolean) as {
    w: (typeof doc.wires)[number];
    d: string;
    v: Val;
    pa: { x: number; y: number };
    pb: { x: number; y: number };
    cross: boolean;
    aL?: string;
    bL?: string;
    colOverride?: string;
    aLayer?: any;
    bLayer?: any;
  }[];

  const gridSize = GRID * view.z;
  const showFine = view.z > 0.45;

  // All hover targets now reveal the full transitively connected network
  // (BFS across every wire), not just the one-hop neighborhood. This makes
  // hovering a gate, wire, or port consistent with "Trace full network" and
  // lets a signal path be followed from switch through every gate to LED,
  // instead of stopping after a single hop and showing only two neighbors.
  const activeNet = useMemo(() => {
    if (drag || !netTarget) return null;
    const bfs = (seedNodes: string[], seedWires: string[]) => {
      const nodes = new Set<string>(seedNodes);
      const wires = new Set<string>(seedWires);
      const queue = [...seedNodes];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const w of doc.wires) {
          if (w.from.node !== cur && w.to.node !== cur) continue;
          if (!wires.has(w.id)) wires.add(w.id);
          const other = w.from.node === cur ? w.to.node : w.from.node;
          if (!nodes.has(other)) {
            nodes.add(other);
            queue.push(other);
          }
        }
      }
      return { wires, nodes };
    };
    if (netTarget.kind === "wire") {
      const w = doc.wires.find((x) => x.id === netTarget.id);
      if (!w) return null;
      return bfs([w.from.node, w.to.node], [w.id]);
    }
    if (netTarget.kind === "port") {
      const [nid, dir, pStr] = netTarget.id.split("|");
      const port = Number(pStr);
      const attached = doc.wires.filter((w) =>
        dir === "out" ? w.from.node === nid && w.from.port === port : w.to.node === nid && w.to.port === port,
      );
      const seedWires = attached.map((w) => w.id);
      const seedNodes = new Set<string>([nid]);
      attached.forEach((w) => {
        seedNodes.add(w.from.node);
        seedNodes.add(w.to.node);
      });
      return bfs(Array.from(seedNodes), seedWires);
    }
    if (netTarget.kind === "node") {
      return bfs([netTarget.id], []);
    }
    // kind === "trace" (pinned full trace) — same BFS, already transitively complete.
    return bfs([netTarget.id], []);
  }, [netTarget, doc.wires, drag]);



  // Click-to-debug: a single selected wire shows its driver/value/fanout, a
  // single selected node shows live port values + propagation/last-transition.
  // Suppressed when picker/rename is open, when dragging/panning, or when canvas/double-click triggered
  const debugWire =
    !pickerOpen && !editingId && !drag && !menu && Date.now() > infoBlockUntil.current && selectedWires.length === 1 && !selection.length
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
    !pickerOpen && !editingId && !drag && !menu && Date.now() > infoBlockUntil.current && selection.length === 1 && !selectedWires.length ? nodeMap.get(selection[0]) : undefined;
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
      // AI Chat entry — right-click component to open AI floating at top, disclosed state includes this component
      const aiItems: MenuItem[] = onOpenAI ? [
        {
          label: "AI Chat",
          icon: <Bot className="size-3.5" />,
          children: [
            { label: "Ask AI about this", icon: <Sparkles className="size-3.5" />, onSelect: () => onOpenAI(id) },
            { label: "Explain connections", icon: <Waypoints className="size-3.5" />, onSelect: () => onOpenAI(id) },
            { label: "Move with AI…", icon: <LayoutGrid className="size-3.5" />, onSelect: () => onOpenAI(id) },
          ],
        },
      ] : [];
      return [
        ...aiItems,
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
      const region = (doc as any).regions?.find((r:any)=> r.id===id) as Region | undefined;
      if (region) {
        // Region context menu
        return [
          { label: `Region: ${region.name}`, icon: <Box className="size-3.5" />, disabled: true },
          { label: "Delete region", icon: <Trash2 className="size-3.5" />, danger: true, divider: true, onSelect: () => (ed as any).deleteRegion?.(id) },
          { label: "Cut", icon: <Scissors className="size-3.5" />, onSelect: () => ed.cut() },
          { label: "Copy", icon: <Copy className="size-3.5" />, onSelect: () => ed.copy() },
          { label: "Duplicate", icon: <CopyPlus className="size-3.5" />, onSelect: () => ed.duplicateSelected() },
        ];
      }
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
      const isTracingThis = netPinned && netTarget?.kind === "trace" && netTarget.id === id;
      const isTextNode = node?.type === "TEXT";
      // Layer submenu — second level (per layer), third level via arrangement inside
      const layerChildren: MenuItem[] = (sortedLayers as any[]).map((ly:any)=> ({
        label: `${ly.name} ${ (node as any)?.layerId === ly.id ? "✓" : ""}`,
        icon: <span className="h-2.5 w-2.5 rounded-full" style={{ background: ly.color }} />,
        onSelect: () => {
          // Use captured selectionAtOpen (reliable for 1 and N) + fallbacks
          const captured = (menu as any)?.selectionAtOpen as string[] | undefined;
          const currentSel = captured && captured.length ? captured : (selectionRef.current && selectionRef.current.length ? selectionRef.current : selection);
          const edSel = (ed as any).selection as string[] | undefined;
          const liveSel = captured ?? (edSel && edSel.length ? edSel : currentSel);
          const isPartOfSelection = liveSel.includes(id);
          const targetIds = isPartOfSelection && liveSel.length > 0 ? liveSel : [id];
          const idsToMove = targetIds.length ? targetIds : [id];
          try {
            if ((ed as any).moveSelectionToLayer) {
              (ed as any).moveSelectionToLayer(ly.id, idsToMove);
            } else {
              ed.commit((d:any)=>({ ...d, nodes: d.nodes.map((n:any)=> idsToMove.includes(n.id) ? { ...n, layerId: ly.id } : n)}), `move ${idsToMove.length} to ${ly.name}`);
            }
          } catch (err) {
            ed.commit((d:any)=>({ ...d, nodes: d.nodes.map((n:any)=> idsToMove.includes(n.id) ? { ...n, layerId: ly.id } : n)}), "move layer");
          }
          (ed as any).setActiveLayer?.(ly.id);
          // ensure selection stays on moved nodes
          if (idsToMove.length) ed.setSelection(idsToMove);
          setMenu(null);
        },
      }));
      layerChildren.push({
        label: "New layer…",
        icon: <LayoutGrid className="size-3.5" />,
        divider: true,
        onSelect: () => {
          const name = window.prompt("New layer name", `Layer ${sortedLayers.length+1}`);
          if (name) (ed as any).addLayer?.(name);
        },
      });
      // AI Chat entry — right-click component to open AI floating at top, disclosed state includes this component
      const aiItems: MenuItem[] = onOpenAI ? [
        {
          label: "AI Chat",
          icon: <Bot className="size-3.5" />,
          children: [
            { label: "Ask AI about this", icon: <Sparkles className="size-3.5" />, onSelect: () => onOpenAI(id) },
            { label: "Explain connections", icon: <Waypoints className="size-3.5" />, onSelect: () => onOpenAI(id) },
            { label: "Move with AI…", icon: <LayoutGrid className="size-3.5" />, onSelect: () => onOpenAI(id) },
          ],
        },
      ] : [];
      return [
        ...aiItems,
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
        isTracingThis
          ? {
              label: "Undo trace full network",
              icon: <EyeOff className="size-3.5" />,
              onSelect: clearNetHighlight,
            }
          : {
              label: "Trace full network",
              icon: <Waypoints className="size-3.5" />,
              onSelect: () => {
                setNetTarget({ kind: "trace", id });
                setNetPinned(true);
              },
            },
        isTextNode
          ? {
              label: "Convert to Component",
              icon: <Box className="size-3.5" />,
              onSelect: () => ed.convertTextToComponent(id),
            }
          : {
              label: "Convert to Text",
              icon: <FileText className="size-3.5" />,
              divider: true,
              onSelect: () => {
                // If multiple selected, convert selection; otherwise convert this node
                const ids = selection.includes(id) && selection.length > 1 ? selection : [id];
                ed.convertToText(ids);
              },
            },
        // HDL: also offer converting the whole traced network to text
        ...(!isTextNode && isTracingThis
          ? [
              {
                label: "Convert traced network to Text",
                icon: <FileCode className="size-3.5" />,
                onSelect: () => {
                  const nodes = new Set<string>([id]);
                  const queue = [id];
                  while (queue.length) {
                    const cur = queue.shift()!;
                    for (const w of ed.doc.wires) {
                      if (w.from.node !== cur && w.to.node !== cur) continue;
                      const other = w.from.node === cur ? w.to.node : w.from.node;
                      if (!nodes.has(other)) {
                        nodes.add(other);
                        queue.push(other);
                      }
                    }
                  }
                  ed.convertToText(Array.from(nodes));
                },
              },
            ]
          : []),
        ...expectItems,
        {
          label: "Move to layer",
          icon: <LayoutGrid className="size-3.5" />,
          children: layerChildren,
        },
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
    const flatten = !!(ed as any).flattenLayers;
    const hasSel = selection.length > 1;
    const aiCanvasItem: MenuItem[] = onOpenAI ? [{ label: "AI Chat", icon: <Bot className="size-3.5" />, children: [
      { label: "Open AI Chat (T)", icon: <Sparkles className="size-3.5" />, onSelect: () => onOpenAI() },
      { label: "Explain circuit", icon: <Eye className="size-3.5" />, onSelect: () => onOpenAI() },
      { label: "Help with layers", icon: <LayoutGrid className="size-3.5" />, onSelect: () => onOpenAI() },
    ]}] : [];
    return [
      ...aiCanvasItem,
      {
        label: "Clear selection",
        icon: <XCircle className="size-3.5" />,
        disabled: !selection.length && !selectedWires.length,
        onSelect: () => { ed.setSelection([]); ed.setSelectedWires([]); setMenu(null); },
      },
      {
        label: "Create region from selection",
        icon: <Box className="size-3.5" />,
        disabled: selection.length < 2,
        onSelect: () => (ed as any).createRegion?.(selection),
      },
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
      {
        label: flatten ? "Exit flatten (3D)" : "Flatten to plane",
        icon: <LayoutGrid className="size-3.5" />,
        divider: true,
        onSelect: () => (ed as any).toggleFlattenLayers?.(),
      },
      {
        label: "Layers",
        icon: <LayoutGrid className="size-3.5" />,
        children: (sortedLayers as any[]).map((ly:any)=> ({
          label: `${ly.name} ${ (ed as any).activeLayerId===ly.id ? "●" : ""}`,
          icon: <span className="h-2.5 w-2.5 rounded-full" style={{ background: ly.color }} />,
          children: [
            { label: "Activate", icon: <Eye className="size-3.5" />, onSelect: () => (ed as any).setActiveLayer?.(ly.id) },
            { label: "Rename", icon: <FileText className="size-3.5" />, onSelect: () => { const v=window.prompt("Rename layer", ly.name); if(v) (ed as any).renameLayer?.(ly.id, v); } },
            { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: () => (ed as any).removeLayer?.(ly.id) },
          ],
        } as any)).concat([{ label: "Add layer", icon: <LayoutGrid className="size-3.5" />, divider: true, onSelect: () => { const n=window.prompt("Layer name", `Layer ${sortedLayers.length+1}`); if(n) (ed as any).addLayer?.(n); } } as any]),
      },
    ];
  }, [menu, ed, selection, nodeMap, doc.nodes, fit, netPinned, netTarget, clearNetHighlight]);

  // Painterly continuity: background is sufficiently blurred painting, not attracting focus; menus/components layered with backdrop-blur
  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        background: "var(--bg)",
        // Blurred painting backdrop — soft, desaturated, far from focal plane
        backgroundImage: showFine
          ? `radial-gradient(1200px 700px at 22% 18%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 55%),
             radial-gradient(900px 600px at 86% 82%, color-mix(in srgb, var(--hi) 6%, transparent) 0%, transparent 60%),
             linear-gradient(to right, var(--grid) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
             linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)`
          : `radial-gradient(1000px 600px at 24% 16%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 58%),
             linear-gradient(to right, var(--grid2) 1px, transparent 1px),
             linear-gradient(to bottom, var(--grid2) 1px, transparent 1px)`,
        backgroundSize: showFine
          ? `auto, auto, ${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px`
          : `auto, ${gridSize * 5}px ${gridSize * 5}px, ${gridSize * 5}px ${gridSize * 5}px`,
        backgroundPosition: `0 0, 0 0, ${view.x}px ${view.y}px, ${view.x}px ${view.y}px, ${view.x}px ${view.y}px, ${view.x}px ${view.y}px`,
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
      onDoubleClick={(e)=>{
        e.preventDefault();
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const world = toWorld(e.clientX, e.clientY);
        const newZ = clampZ(viewRef.current.z * 1.6);
        // Center clicked point and zoom
        setView({ x: r.width/2 - world.x * newZ, y: r.height/2 - world.y * newZ, z: newZ });
        // Also handle minimap auto-move: ensure view updated
      }}
    >
      {/* Painterly far background — heavily blurred, low opacity, never competes with focal layer */}
      <div className="pointer-events-none absolute inset-0" style={{ backdropFilter: "blur(0.6px)", background: "color-mix(in srgb, var(--panel) 14%, transparent)", opacity: 0.52 } as any} />
      {/* Layer continuity indicator — shows blurry→clear stack */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[var(--panel)]/35 to-transparent" style={{ backdropFilter: "blur(6px)" } as any} />
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
        <g transform={`translate(${view.x},${view.y}) scale(${view.z})`} style={{ willChange: isInteracting ? "transform" : undefined } as any}>
          {guides.v.map((x, i) => (
            <line key={"gv" + i} x1={x} y1={-9000} x2={x} y2={9000} stroke="var(--accent)" strokeWidth={1 / view.z} strokeDasharray="6 6" opacity={0.7} />
          ))}
          {guides.h.map((y, i) => (
            <line key={"gh" + i} x1={-9000} y1={y} x2={9000} y2={y} stroke="var(--accent)" strokeWidth={1 / view.z} strokeDasharray="6 6" opacity={0.7} />
          ))}
          <g>
            {wireGeo.map(({ w, d, v, pa, pb, cross, aL, bL, colOverride, aLayer, bLayer }) => {
              const sel = selectedWires.includes(w.id);
              let dim = !!(activeNet && !activeNet.wires.has(w.id));
              // Picker mode: blur wires not connected to selected node
              if (pickerOpen && selectedNode) {
                const connected = w.from.node===selectedNode.id || w.to.node===selectedNode.id;
                if (!connected) dim = true;
              }
              // One-level deeper: wires that touch far layers beyond one deeper are dimmed more
              if (!flattenLayers && (aL || bL)) {
                const aInteract = !aL || canInteractLayer(aL);
                const bInteract = !bL || canInteractLayer(bL);
                if (!aInteract || !bInteract) dim = true;
              }
              // Cross-layer 3D connections use distinct layer colors (continuity)
              const baseCol = cross && colOverride ? colOverride : valColor(v);
              const col = baseCol;
              // Depth blur for wires spanning far layers — blurry→clear continuity
              let wireDepthOpacity = 1;
              let wireBlur = 0;
              if (!flattenLayers && (aL || bL)) {
                const da = aL ? depthMetrics(layers, activeLayerId, aL, flattenLayers) : { blur: 0, opacity: 1 } as any;
                const db = bL ? depthMetrics(layers, activeLayerId, bL, flattenLayers) : { blur: 0, opacity: 1 } as any;
                wireDepthOpacity = Math.min(da.opacity, db.opacity);
                wireBlur = Math.max(da.blur, db.blur);
                if (dim) wireDepthOpacity *= 0.22;
                if (pickerOpen) wireBlur = Math.max(wireBlur, 5.5);
              } else if (dim) { wireDepthOpacity = 0.22; if (pickerOpen) wireBlur = 5.5; }
              const baseOp = (v === "X" || v === "Z" ? 0.55 : 0.95) * wireDepthOpacity;
              const mx = (pa.x + pb.x) / 2;
              const my = (pa.y + pb.y) / 2;
              // When hovered top for a while, reveal connected layers — keep those at full opacity even if far
              const isConnectedReveal = !!activeNet && activeNet.wires.has(w.id);
              const revealBoost = isConnectedReveal && wireBlur > 0 ? 0.55 : 0;
              const effBlur = isConnectedReveal ? Math.max(0, wireBlur - 1.6) : wireBlur;
              const effOp = isConnectedReveal ? Math.min(1, baseOp + revealBoost) : baseOp;
              return (
                <g key={w.id} style={{ filter: effBlur ? `blur(${effBlur * 0.42}px)` : undefined, opacity: effOp, transition: "filter 420ms cubic-bezier(.2,.8,.2,1), opacity 420ms cubic-bezier(.2,.8,.2,1)" } as any}>
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: cross ? "pointer" : "pointer" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setMenu(null);
                      infoBlockUntil.current = 0;
                      ed.setSelectedWires([w.id]);
                      ed.setSelection([]);
                      if (cross) {
                        // Clicking a 3D interface switches view to corresponding layer & position
                        const targetId = (e.shiftKey ? bL : aL) ?? bL ?? aL;
                        if (targetId) (ed as any).setActiveLayer?.(targetId);
                        const nodeId = e.shiftKey ? w.to.node : w.from.node;
                        jumpToLayerOf(nodeId);
                      }
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
                    strokeWidth={cross ? 3.0 : sel ? 3.6 : 2.2}
                    strokeLinecap="round"
                    opacity={1}
                    strokeDasharray={cross ? "7 6" : undefined}
                    filter={v === 1 && !reduceGlow && !cross ? "url(#glow)" : undefined}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* 3D interface endpoint markers — different colors per layer, clickable */}
                  {cross && (
                    <>
                      <circle cx={pa.x} cy={pa.y} r={5.5} fill={aLayer?.color ?? col} stroke="var(--panel)" strokeWidth={1.6} opacity={0.98} style={{ cursor: "pointer" }} onPointerDown={(e)=>{e.stopPropagation(); (ed as any).setActiveLayer?.(aL!); jumpToLayerOf(w.from.node);}} />
                      <circle cx={pb.x} cy={pb.y} r={5.5} fill={bLayer?.color ?? col} stroke="var(--panel)" strokeWidth={1.6} opacity={0.98} style={{ cursor: "pointer" }} onPointerDown={(e)=>{e.stopPropagation(); (ed as any).setActiveLayer?.(bL!); jumpToLayerOf(w.to.node);}} />
                    </>
                  )}
                  {sel && <path d={d} fill="none" stroke="var(--accent)" strokeWidth={7} opacity={0.25 * (dim ? 0.2 : 1)} strokeLinecap="round" style={{ pointerEvents: "none" }} />}
                  {running && v === 1 && !dim && (
                    <circle r={3.2} fill="#fff" opacity={0.9}>
                      <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
                    </circle>
                  )}
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
                  {/* Layer labels on cross wires — shows 3D connectivity */}
                  {cross && showFine && (
                    <g style={{ pointerEvents: "none" }}>
                      <rect x={mx - 18} y={my + 4} width={36} height={9} rx={4.5} fill="var(--panel)" opacity={0.88} stroke="var(--border)" strokeWidth={0.5} />
                      <text x={mx} y={my + 10.5} textAnchor="middle" fontSize={5.5} fontWeight={700} fill={aLayer?.color ?? "var(--muted)"}>{aLayer?.name.slice(0,3) ?? "A"}→{bLayer?.name.slice(0,3) ?? "B"}</text>
                    </g>
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
          {/* Regions (functional blocks) — long-press marquee grouping with quick inter-block ports */}
          {(doc as any).regions?.length > 0 && (doc as any).regions.map((region: Region) => {
            const isSelected = region.nodeIds.some((nid)=> selection.includes(nid));
            const { inputs: extIns, outputs: extOuts } = getRegionExternalPorts(region, doc as any, defs);
            // Port positions: inputs on left edge (x), outputs on top+right edges
            const inStep = extIns.length > 1 ? (region.h - 20) / (extIns.length - 1) : 0;
            const outStep = extOuts.length > 1 ? (region.h - 20) / (extOuts.length - 1) : 0;
            // For outputs, split between top and right: first half on top edge, rest on right
            return (
              <g key={region.id} style={{ cursor: "move" }}>
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.w}
                  height={region.h}
                  rx={10}
                  fill="var(--panel)"
                  fillOpacity={0.14}
                  stroke={region.color ?? "var(--accent)"}
                  strokeWidth={isSelected ? 2.4 : 1.6}
                  strokeDasharray={isSelected ? undefined : "8 6"}
                  style={{ pointerEvents: "auto" }}
                  onPointerDown={(e)=>{
                    e.stopPropagation();
                    setMenu(null);
                    const start = toWorld(e.clientX, e.clientY);
                    const nodeStarts = new Map<string,{x:number;y:number}>();
                    for (const nid of region.nodeIds) {
                      const nd = doc.nodes.find((n)=> n.id===nid);
                      if (nd) nodeStarts.set(nid, { x: nd.x, y: nd.y });
                    }
                    pendingRegionDrag.current = { id: region.id, sx: start.x, sy: start.y, ox: region.x, oy: region.y, nodeStarts };
                    try { (e.currentTarget as Element).setPointerCapture?.((e as any).pointerId); } catch {}
                    // also select region nodes
                    if (!region.nodeIds.every((id)=> selection.includes(id))) {
                      ed.setSelection(region.nodeIds);
                      ed.setSelectedWires([]);
                    }
                  }}
                  onContextMenu={(e)=> onRegionContext(e, region.id)}
                  onDoubleClick={(e)=>{
                    e.stopPropagation();
                    // Double-click region zooms to center that block
                    const cx = region.x + region.w/2;
                    const cy = region.y + region.h/2;
                    const r = ref.current?.getBoundingClientRect();
                    if (r) {
                      const newZ = Math.min(3.2, viewRef.current.z * 1.5);
                      setView({ x: r.width/2 - cx * newZ, y: r.height/2 - cy * newZ, z: newZ });
                    }
                  }}
                />
                <text x={region.x + 8} y={region.y + 14} fontSize={9} fontWeight={700} fill={region.color} style={{ pointerEvents: "none" }}>{region.name}</text>
                {/* Hover entire map auto-move: region hover moves view slightly */}
                <g
                  onPointerEnter={()=>{
                    // subtle auto-pan when hovering region: nudge view toward region center if near edge
                    const r = ref.current?.getBoundingClientRect();
                    if (!r) return;
                    const cx = region.x + region.w/2;
                    const cy = region.y + region.h/2;
                    const vx = -viewRef.current.x / viewRef.current.z;
                    const vy = -viewRef.current.y / viewRef.current.z;
                    const vw = r.width / viewRef.current.z;
                    const vh = r.height / viewRef.current.z;
                    const nearEdge = cx < vx + vw*0.2 || cx > vx + vw*0.8 || cy < vy + vh*0.2 || cy > vy + vh*0.8;
                    if (nearEdge) {
                      // auto-move a bit toward center (subtle)
                      setView((v)=> ({ ...v, x: v.x - (cx - (vx+vw/2))*0.04, y: v.y - (cy - (vy+vh/2))*0.04 }));
                    }
                  }}
                  style={{ pointerEvents: "none" }}
                />
                {/* Input ports on left edge (top-left to bottom-right vertical) */}
                {extIns.map((ip, idx)=>{
                  const py = region.y + 18 + (extIns.length===1 ? region.h/2 -18 : idx * inStep);
                  const px = region.x;
                  const v = sim.nodeIn.get(inKey(ip.nodeId, ip.port)) ?? sim.nodeOut.get(outKey(ip.nodeId, ip.port)) ?? "X" as Val;
                  return (
                    <g key={"in-"+ip.nodeId+"-"+ip.port}
                       onPointerDown={(e)=> startPortDrag(e, ip.nodeId, "in", ip.port)}
                       onPointerEnter={(e)=> handleHoverPort(`${ip.nodeId}|in|${ip.port}`, e)}
                       onPointerLeave={()=> handleHoverPort(null)}
                       style={{ cursor: "crosshair" }}>
                      <circle cx={px} cy={py} r={10} fill="transparent" />
                      <circle cx={px} cy={py} r={5} fill={valColor(v)} stroke="var(--panel)" strokeWidth={1.4} />
                      <text x={px + 8} y={py + 3} fontSize={6} fill="var(--muted)" style={{ pointerEvents: "none" }}>{ip.name}</text>
                    </g>
                  );
                })}
                {/* Output ports on right and top edges */}
                {extOuts.map((op, idx)=>{
                  // Distribute: first half on top edge (left to right), rest on right edge (top to bottom)
                  let px, py;
                  if (extOuts.length > 4 && idx < Math.ceil(extOuts.length/2)) {
                    // top edge
                    const topStep = (region.w - 20) / Math.max(1, Math.ceil(extOuts.length/2)-1);
                    px = region.x + 10 + idx * topStep;
                    py = region.y;
                  } else {
                    const rightIdx = extOuts.length > 4 ? idx - Math.ceil(extOuts.length/2) : idx;
                    const countRight = extOuts.length > 4 ? extOuts.length - Math.ceil(extOuts.length/2) : extOuts.length;
                    const rStep = countRight >1 ? (region.h - 20)/(countRight-1) : 0;
                    px = region.x + region.w;
                    py = region.y + 18 + (countRight===1 ? region.h/2 -18 : rightIdx * rStep);
                  }
                  const v = sim.nodeOut.get(outKey(op.nodeId, op.port)) ?? "X" as Val;
                  return (
                    <g key={"out-"+op.nodeId+"-"+op.port}
                       onPointerDown={(e)=> startPortDrag(e, op.nodeId, "out", op.port)}
                       onPointerEnter={(e)=> handleHoverPort(`${op.nodeId}|out|${op.port}`, e)}
                       onPointerLeave={()=> handleHoverPort(null)}
                       style={{ cursor: "crosshair" }}>
                      <circle cx={px} cy={py} r={10} fill="transparent" />
                      <circle cx={px} cy={py} r={5} fill={valColor(v)} stroke="var(--panel)" strokeWidth={1.4} />
                      <text x={px - 4} y={py - 8} textAnchor="middle" fontSize={6} fill="var(--muted)" style={{ pointerEvents: "none" }}>{op.name}</text>
                    </g>
                  );
                })}
                {/* Quick execution indicator: if region forms a runnable block, show run button */}
                {isSelected && (
                  <g transform={`translate(${region.x + region.w - 14},${region.y + region.h - 14})`} style={{ cursor: "pointer" }}
                     onPointerDown={(e)=>{ e.stopPropagation(); /* blocking: maybe toggle? */ }}>
                    <circle r={10} fill="var(--accent)" opacity={0.9} />
                    <text textAnchor="middle" dy={3} fontSize={8} fill="var(--accent-fg)" style={{ pointerEvents: "none" }}>▶</text>
                  </g>
                )}
              </g>
            );
          })}
          {/* Painterly layers — far → near with blur/opacity/scale continuity. Flatten toggle collapses to single plane */}
          {sortedLayers.map((layer:any) => {
            const isActive = layer.id === activeLayerId || flattenLayers;
            const nodesInLayer = doc.nodes.filter((n:any) => (n.layerId ?? activeLayerId) === layer.id || flattenLayers && false);
            // In flatten mode, render all nodes together without depth split
            const effectiveNodes = flattenLayers ? (layer.order===sortedLayers[sortedLayers.length-1].order ? doc.nodes : []) : nodesInLayer;
            if (!effectiveNodes.length) return null;
            const m = depthMetrics(layers, activeLayerId, layer.id, flattenLayers);
            // For flatten, m is identity; else use per-layer metrics
            // When hovering top for a while, reveal connected layers: boost opacity/reduce blur for activeNet nodes even if far
            return (
              <g key={layer.id} style={{
                opacity: 1,
                // No positional drift — wires stay joined to ports; depth via per-node blur/opacity only
                transform: undefined,
                filter: undefined,
                transition: "opacity 420ms ease",
              } as any}>
                {/* layer backdrop tint — sufficiently blurred painting background, not attracting focus */}
                {!flattenLayers && !isInteracting && (
                  <rect x={-8000} y={-8000} width={16000} height={130} fill={layer.color} opacity={isActive ? 0 : 0.035 + Math.abs(m.dist)*0.008} style={{ pointerEvents: "none", filter: "blur(18px)" }} />
                )}
                {effectiveNodes.map((n:any) => {
                  const lcol = layer.color;
                  const dm = depthMetrics(layers, activeLayerId, (n as any).layerId, flattenLayers);
                  const isRevealed = !!activeNet && activeNet.nodes.has(n.id);
                  let effBlur = isInteracting ? 0 : (isRevealed ? Math.max(0, dm.blur - 1.8) : dm.blur);
                  let effOp = isRevealed ? Math.min(1, dm.opacity + 0.45) : dm.opacity;
                  let dim = !!activeNet && !activeNet.nodes.has(n.id);
                  // Picker mode: blur other components, keep selected sharp
                  if (pickerOpen) {
                    if (n.id !== selectedNode?.id) { effBlur = Math.max(effBlur, 5.5); effOp = Math.min(effOp, 0.32); dim = true; }
                    else { effBlur = 0; effOp = 1; dim = false; }
                  }
                  // One-level deeper: far layers beyond one deeper are non-interactive (pointerEvents none via dim)
                  const interactable = canInteractLayer((n as any).layerId) || flattenLayers;
                  if (!interactable && !dim) { effBlur = Math.max(effBlur, 4); effOp = Math.min(effOp, 0.42); }
                  // We pass interactable via dim? Use dim for blur, but also need to disable pointer events downstream
                  const actuallyDim = dim || !interactable;
                  // For non-interactable far layers, disable pointer events (but keep visible)
                  const nodeDim = actuallyDim;
                  const nodeDepthOp = effOp;
                  const nodeDepthBlur = effBlur;
                  return (
                    <g key={n.id} style={{ pointerEvents: interactable ? undefined : "none" } as any}>
                    <NodeView
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
                      dimmed={nodeDim}
                      reduceGlow={reduceGlow}
                      glossy={glossy}
                      onHoverStart={() => setRawHover({ kind: "node", id: n.id })}
                      onHoverEnd={() => setRawHover((cur) => (sameTarget(cur, { kind: "node", id: n.id }) ? null : cur))}
                      layerColor={lcol}
                      depthOpacity={nodeDepthOp}
                      depthBlur={nodeDepthBlur}
                    />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* Flatten mode fallback: if no layers defined or empty, ensure nodes still visible */}
          {(!layers.length || flattenLayers && false) && doc.nodes.filter((n:any)=>!layers.find((l:any)=>l.id===(n as any).layerId)).map((n:any)=>null)}
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

      <Minimap doc={doc} defs={defs} view={view} setView={setView} host={ref} onExpand={()=> setMapExpanded(true)} />
      {/* Explicit cancel-selection control — always visible when selection exists */}
      {(selection.length > 0 || selectedWires.length > 0) && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)]/90 px-2 py-1 shadow-[var(--shadow)] backdrop-blur-xl" style={{ backdropFilter: isInteracting ? "blur(4px)" : "blur(14px)" } as any}>
          <span className="hidden sm:inline text-micro font-bold text-[var(--muted)]">{selection.length ? `${selection.length} selected` : "1 wire selected"} · </span>
          <button type="button" onClick={() => { ed.setSelection([]); ed.setSelectedWires([]); setMenu(null); }} className="inline-flex items-center gap-1 rounded-full bg-[var(--panel2)] px-2.5 py-1 text-micro font-bold text-[var(--xx)] hover:bg-[var(--xx)] hover:text-white transition">
            <XCircle className="size-3.5" /> Cancel selection <span className="hidden sm:inline">(Esc)</span>
          </button>
          <span className="hidden sm:inline text-micro text-[var(--muted)]">· click empty canvas also clears</span>
        </div>
      )}
      {/* Layer rail — painterly depth, blurred background, continuity (always there, state changes) */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)]/85 px-2 py-1.5 shadow-[var(--shadow)] backdrop-blur-xl" style={{ backdropFilter: isInteracting ? "blur(6px)" : "blur(14px) saturate(1.2)" } as any}>
          <span className="px-1 text-micro font-bold uppercase tracking-wider text-[var(--muted)]">Layers</span>
          <div className="mx-1 h-4 w-px bg-[var(--border)]" />
          {sortedLayers.map((ly:any)=>{
            const isActive = ly.id===activeLayerId;
            const m = !flattenLayers ? depthMetrics(layers, activeLayerId, ly.id, false) : { blur:0, opacity:1, scale:1 } as any;
            return (
              <span key={ly.id} className="relative inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={()=> (ed as any).setActiveLayer?.(ly.id)}
                  onContextMenu={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    // Right-click layer → offer to move selected (1 or N) here
                    const ids = selection.length ? [...selection] : [];
                    const p = toWorld(e.clientX, e.clientY);
                    if (ids.length) {
                      (ed as any).moveSelectionToLayer?.(ly.id, ids);
                      (ed as any).setActiveLayer?.(ly.id);
                      ed.setSelection(ids);
                    } else {
                      setMenu({ x: e.clientX, y: e.clientY, wx: p.x, wy: p.y, selectionAtOpen: [] } as any);
                    }
                  }}
                  title={`${ly.name} — ${isActive?"active (clear)":"blurred " + Math.round(m.blur*10)/10+"px"} · right-click to move selected here`}
                  className={`relative grid h-7 place-items-center rounded-full px-2.5 text-micro font-bold transition-all duration-400 ${isActive ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow" : "bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]"}`}
                  style={{
                    filter: isActive ? undefined : `blur(${Math.min(1.0, m.blur*0.18)}px)`,
                    opacity: isActive ? 1 : 0.86,
                    transform: isActive ? "scale(1.04)" : "scale(0.98)",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  } as any}
                >
                  <span className="flex items-center gap-1.5" style={{ pointerEvents: "none" }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: ly.color, boxShadow: isActive ? `0 0 6px ${ly.color}` : undefined }} />
                    <span className="hidden sm:inline">{ly.name}</span>
                  </span>
                </button>
                {sortedLayers.length>1 && (
                  <button
                    type="button"
                    onClick={(e)=> { e.stopPropagation(); if (confirm(`Delete layer "${ly.name}"? Nodes move to neighbor.`)) (ed as any).removeLayer?.(ly.id); }}
                    className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel2)] text-[11px] leading-none text-[var(--muted)] hover:bg-[var(--xx)] hover:text-white hover:border-[var(--xx)] transition"
                    title={`Delete ${ly.name}`}
                  >×</button>
                )}
              </span>
            );
          })}
          <div className="mx-1 h-4 w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={()=> (ed as any).toggleFlattenLayers?.()}
            className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold transition ${flattenLayers ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)]"}`}
            title={flattenLayers ? "Flattened (single plane) — click for 3D" : "3D layers — click to flatten"}
          >
            {flattenLayers ? "2D" : "3D"}
          </button>
          <button type="button" onClick={()=> (ed as any).addLayer?.()} className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]" title="Add layer">+</button>
        </div>
        {/* Layers hint removed per request — no Slide vertically… text */}
      </div>

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



      {/* Inline rename — left side of component, preserves connections unless incompatible */}
      {editingId && (()=> {
        const nd = nodeMap.get(editingId);
        if (!nd) return null;
        const { w, h } = nodeSize(nd, defs);
        const sx = nd.x * view.z + view.x;
        const sy = nd.y * view.z + view.y;
        const left = sx - 84;
        const top = sy + h/2 - 16;
        return (
          <div className="absolute z-20 flex items-center gap-1.5" style={{ left, top }}>
            <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)]/95 px-2 py-1 shadow-[var(--shadow)] backdrop-blur-md" style={{ backdropFilter:"blur(10px)" } as any}>
              <input
                ref={editInputRef}
                value={editText}
                onChange={(e)=> { setEditText(e.target.value); if(editError) setEditError(null); }}
                onKeyDown={(e)=> {
                  if (e.key==="Enter") commitRename(editingId, editText);
                  else if (e.key==="Escape") { setEditingId(null); setEditError(null); }
                }}
                onBlur={()=> commitRename(editingId, editText)}
                placeholder="AND, OR…"
                className="w-[92px] bg-transparent text-micro font-bold uppercase tracking-wide text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              <button type="button" onClick={()=> commitRename(editingId, editText)} className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] text-micro">✓</button>
            </div>
            <span id={"rename-err-"+editingId} className="pointer-events-none rounded-full bg-[var(--panel)] px-2 py-1 text-micro font-bold text-[var(--xx)] shadow transition-all duration-500" style={{ opacity: editError ? 1 : 0, transform: editError ? "translateX(0)" : "translateX(-6px)", filter: editError ? undefined : "blur(4px)" } as any}>
              {editError ?? "type to change"}
            </span>
            <span className="pointer-events-none absolute left-[calc(100%+56px)] top-1/2 -translate-y-1/2 rounded-full bg-[var(--panel)]/80 px-2 py-1 text-micro text-[var(--muted)] opacity-0" style={{ transition:"transform 320ms cubic-bezier(.2,.8,.2,1), opacity 220ms" } as any} />
          </div>
        );
      })()}

      {/* Next-component picker — double-click triggered, 3 slots surrounding node, wheel only here, Space/Enter confirm, blur others */}
      {pickerOpen && selectedNode && pickerCandidates.length>0 && (
        <div
          className="absolute z-20 select-none pointer-events-none"
          style={{
            left: (selectedNode.x + nodeSize(selectedNode, defs).w/2) * view.z + view.x,
            top: (selectedNode.y + nodeSize(selectedNode, defs).h/2) * view.z + view.y,
          }}
        >
          {/* blur backdrop for other components is handled via dim in nodes/wires; wheel is captured here */}
          <div
            className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            onWheel={(e)=>{
              e.preventDefault(); e.stopPropagation();
              const dir = e.deltaY > 0 ? 1 : -1;
              setPickerIdx((i)=> norm(i+dir));
            }}
            onPointerDown={(e)=> e.stopPropagation()}
          >
            {/* surrounding slots — positioned around node perimeter */}
            {visiblePicker.map((cand, idx)=> {
              const isMid = idx===1;
              const sz = isMid ? 44 : 34;
              const iconScale = isMid ? 1.14 : 0.94;
              const dotCol = (cand as any).color ?? "var(--accent)";
              // Surround positions: 3 points around node — right, top-right, bottom-right arc (like clock face)
              // Angles: -55°, 0°, 55° around the node's edge, distance = max(w,h)/2 + sz/2 + 14
              const { w: nw, h: nh } = nodeSize(selectedNode, defs);
              const R = Math.max(nw, nh)/2 + (isMid ? 36 : 32);
              const angles = [-58, 0, 58]; // degrees around center, to the right side surrounding
              const ang = angles[idx] * Math.PI/180;
              const x = Math.cos(ang) * R;
              const y = Math.sin(ang) * R;
              return (
                <button
                  key={cand.type+"_"+(cand.defId ?? idx)+"_"+norm(pickerIdx+idx-1)}
                  type="button"
                  onClick={(e)=>{
                    e.stopPropagation();
                    if (!isMid) { setPickerIdx((i)=> norm(i+(idx-1))); return; }
                    const cur = selectedNode;
                    const { w, h } = nodeSize(cur, defs);
                    const nx = cur.x + w + 72;
                    const ny = cur.y + h/2 - 25;
                    const nid = ed.addNode(cand.type as any, nx, ny, (cand as any).defId);
                    setTimeout(()=>{
                      const fresh = (ed as any).doc?.nodes?.find((n:any)=> n.id===nid);
                      if (fresh) {
                        const nIns = portCounts(fresh, (ed as any).doc.defs).ins;
                        const curOuts = portCounts(cur, defs).outs;
                        if (curOuts>0 && nIns>0) ed.connect({ node: cur.id, port: 0 }, { node: nid, port: 0 });
                      }
                    }, 0);
                    setPickerOpen(false);
                    setEditingId(null);
                  }}
                  className={`absolute grid place-items-center rounded-full border bg-[var(--panel2)] transition-all duration-400 ${isMid ? "border-[var(--accent)] bg-[var(--accent)]/14 shadow-[0_0_14px_var(--accent)]" : "border-[var(--border)] bg-[var(--panel)]/92 hover:border-[var(--muted)]"}`}
                  style={{
                    left: x, top: y,
                    width: sz, height: sz,
                    transform: `translate(-50%,-50%) scale(${isMid ? 1.08 : 0.98})`,
                    filter: isMid ? undefined : "saturate(0.92)",
                    transition: "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 420ms, filter 420ms, left 380ms cubic-bezier(.2,.8,.2,1), top 380ms cubic-bezier(.2,.8,.2,1)",
                    opacity: 1,
                    animation: isMid ? "pickerPop 420ms cubic-bezier(.2,.8,.2,1)" : "pickerFade 340ms ease",
                  } as any}
                  title={`${cand.name} — wheel to cycle, Space/Enter to place`}
                >
                  <span className="grid place-items-center rounded-full bg-[var(--panel)]" style={{ width: sz-6, height: sz-6, transform: `scale(${iconScale})`, boxShadow: isMid ? `0 0 10px ${dotCol}66` : undefined, border: `1px solid ${isMid ? dotCol : "var(--border)"}` } as any}>
                    <span className="text-[11px] font-black leading-none tracking-wide" style={{ color: isMid ? dotCol : "var(--text)", transform: isMid ? "scale(1.06)" : undefined } as any}>
                      {cand.type==="CUSTOM" ? cand.name.slice(0,3) : cand.type.slice(0,3)}
                    </span>
                  </span>
                  {isMid && <span className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />}
                </button>
              );
            })}
            {/* name display near middle slot with rolling number animation */}
            <div className="pointer-events-none absolute left-[52px] top-1/2 -translate-y-1/2 min-w-[108px] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel)]/92 px-3 py-1.5 shadow-[var(--shadow)] backdrop-blur-md" style={{ backdropFilter:"blur(10px)" } as any}>
              <div key={selectedPicker?.type+"_"+selectedPicker?.defId+"_"+pickerIdx} className="animate-[pickerRoll_380ms_cubic-bezier(.2,.8,.2,1)] text-micro font-bold leading-none text-[var(--text)]">
                {selectedPicker?.name}
              </div>
              <div className="text-micro leading-none text-[var(--muted)]">{selectedPicker?.type}{selectedPicker?.defId ? " • custom" : ""} • Space/Enter</div>
            </div>
          </div>
          <style>{`@keyframes pickerPop{0%{transform:translate(-50%,-50%) scale(0.82); filter:blur(7px); opacity:0} 100%{transform:translate(-50%,-50%) scale(1.08); filter:blur(0); opacity:1}} @keyframes pickerFade{0%{opacity:0; filter:blur(5px)}100%{opacity:1; filter:blur(0)}} @keyframes pickerRoll{0%{transform:translateY(7px); opacity:0; filter:blur(4px)} 100%{transform:translateY(0); opacity:1; filter:blur(0)}}`}</style>
        </div>
      )}

      {mapExpanded && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onPointerDown={(e)=> {
            if (e.target === e.currentTarget) { setMapExpanded(false); setMapSelection(null); }
          }}
          onKeyDown={(e)=> { if (e.key === "Escape") { setMapExpanded(false); setMapSelection(null); } }}
          tabIndex={0}
          autoFocus
        >
          <div
            className="relative rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl overflow-hidden"
            style={{ width: "82vw", height: "78vh", maxWidth: 900, maxHeight: 680 }}
            onPointerDown={(e)=> e.stopPropagation()}
          >
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)]/95 px-3 py-2">
              <span className="text-sm font-bold">Map — select area to operate</span>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-[var(--border)] bg-[var(--panel2)] px-3 py-1 text-xs font-medium hover:bg-[var(--panel)]"
                  onClick={()=> { ed.setSelection([]); ed.setSelectedWires([]); setMapSelection(null); }}
                >Clear selection</button>
                <button
                  className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-[var(--accent-fg)]"
                  onClick={()=> { setMapExpanded(false); }}
                >Done (Esc)</button>
                <button
                  className="rounded-full border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={()=> { setMapExpanded(false); setMapSelection(null); }}
                  title="Close"
                >✕</button>
              </div>
            </div>
            <ExpandedMapView
              doc={doc}
              defs={defs}
              view={view}
              setView={setView}
              selection={selection}
              setSelection={ed.setSelection}
              mapSelection={mapSelection}
              setMapSelection={setMapSelection}
              onClose={()=> setMapExpanded(false)}
            />
            <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2 text-micro text-[var(--muted)]">
              <span>Drag inside map to select · Click Done or press Esc / click outside to exit</span>
            </div>
          </div>
        </div>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}

function ExpandedMapView({
  doc, defs, view, setView, selection, setSelection, mapSelection, setMapSelection, onClose
}: {
  doc: { nodes: CNode[]; wires: Wire[] };
  defs: CustomDef[];
  view: View;
  setView: (u: View | ((v: View) => View)) => void;
  selection: string[];
  setSelection: (ids: string[]) => void;
  mapSelection: { x1:number; y1:number; x2:number; y2:number } | null;
  setMapSelection: (s: { x1:number; y1:number; x2:number; y2:number } | null) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ sx:number; sy:number; x:number; y:number } | null>(null);
  // Compute bounds of all nodes for expanded view
  const bounds = useMemo(()=>{
    if (!doc.nodes.length) return { x1: -200, y1: -200, x2: 200, y2: 200 };
    let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    for (const n of doc.nodes) {
      const { w, h } = nodeSize(n, defs);
      x1=Math.min(x1, n.x-40); y1=Math.min(y1, n.y-40);
      x2=Math.max(x2, n.x+w+40); y2=Math.max(y2, n.y+h+40);
    }
    return { x1, y1, x2, y2 };
  }, [doc.nodes, defs]);
  const bw = Math.max(1, bounds.x2 - bounds.x1);
  const bh = Math.max(1, bounds.y2 - bounds.y1);
  // Expanded size: use container size
  const [size, setSize] = useState({ w: 800, h: 500 });
  useEffect(()=>{
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(()=> {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return ()=> ro.disconnect();
  }, []);
  const s = Math.min((size.w-20)/bw, (size.h-20)/bh);
  const toWorldMini = (cx:number, cy:number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    // minimap is centered? We'll render with offset to center the bounds
    const offsetX = (size.w - bw*s)/2;
    const offsetY = (size.h - bh*s)/2;
    const wx = bounds.x1 + (cx - rect.left - offsetX)/s;
    const wy = bounds.y1 + (cy - rect.top - offsetY)/s;
    return { wx, wy };
  };
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { wx, wy } = toWorldMini(e.clientX, e.clientY);
    setDrag({ sx: wx, sy: wy, x: wx, y: wy });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { wx, wy } = toWorldMini(e.clientX, e.clientY);
    setDrag({ ...drag, x: wx, y: wy });
    // live preview selection
    const x1 = Math.min(drag.sx, wx), x2 = Math.max(drag.sx, wx);
    const y1 = Math.min(drag.sy, wy), y2 = Math.max(drag.sy, wy);
    setMapSelection({ x1, y1, x2, y2 });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const { wx, wy } = toWorldMini(e.clientX, e.clientY);
    const x1 = Math.min(drag.sx, wx), x2 = Math.max(drag.sx, wx);
    const y1 = Math.min(drag.sy, wy), y2 = Math.max(drag.sy, wy);
    setDrag(null);
    if (Math.abs(x2-x1) < 4 && Math.abs(y2-y1) < 4) {
      // click without drag -> clear or select single?
      const hit = doc.nodes.find((n)=>{
        const { w, h } = nodeSize(n, defs);
        return wx >= n.x && wx <= n.x+w && wy >= n.y && wy <= n.y+h;
      });
      if (hit) setSelection([hit.id]);
      else { setSelection([]); setMapSelection(null); }
      return;
    }
    const hit = doc.nodes.filter((n)=>{
      const { w, h } = nodeSize(n, defs);
      return n.x < x2 && n.x+w > x1 && n.y < y2 && n.y+h > y1;
    }).map(n=> n.id);
    if (e.shiftKey) {
      const next = [...new Set([...selection, ...hit])];
      setSelection(next);
    } else {
      setSelection(hit);
    }
    setMapSelection({ x1, y1, x2, y2 });
    // Also center main view to selection bounds
    if (hit.length) {
      // Option: keep expanded open for further ops, don't auto-close
    }
  };
  const offsetX = (size.w - bw*s)/2;
  const offsetY = (size.h - bh*s)/2;
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 top-9 overflow-hidden bg-[var(--bg)]"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ cursor: drag ? "crosshair" : "default" }}
    >
      <svg width={size.w} height={size.h} className="absolute inset-0">
        <g transform={`translate(${offsetX - bounds.x1*s},${offsetY - bounds.y1*s}) scale(${s})`}>
          {doc.nodes.map((n)=>{
            const { w, h } = nodeSize(n, defs);
            const isSel = selection.includes(n.id);
            return (
              <g key={n.id} opacity={isSel ? 1 : 0.9}>
                <rect x={n.x} y={n.y} width={w} height={h} rx={8} fill={isSel ? "var(--accent)" : "var(--node)"} stroke={isSel ? "var(--accent)" : "var(--border)"} strokeWidth={isSel?2:1.2} />
                <text x={n.x+w/2} y={n.y+h/2+3} textAnchor="middle" fontSize={10} fontWeight={700} fill={isSel ? "var(--accent-fg)" : "var(--text)"} style={{ pointerEvents: "none" }}>{n.type.slice(0,4)}</text>
              </g>
            );
          })}
          {mapSelection && (
            <rect x={mapSelection.x1} y={mapSelection.y1} width={mapSelection.x2-mapSelection.x1} height={mapSelection.y2-mapSelection.y1} fill="var(--accent)" fillOpacity={0.12} stroke="var(--accent)" strokeWidth={1.5 / s} strokeDasharray={`${6/s} ${4/s}`} />
          )}
          {drag && (
            <rect x={Math.min(drag.sx,drag.x)} y={Math.min(drag.sy,drag.y)} width={Math.abs(drag.x-drag.sx)} height={Math.abs(drag.y-drag.sy)} fill="var(--accent)" fillOpacity={0.18} stroke="var(--accent)" strokeWidth={1.5 / s} />
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 border border-[var(--border)]/30" />
    </div>
  );
}

function Minimap({
  doc,
  defs,
  view,
  setView,
  host,
  onExpand,
}: {
  doc: { nodes: CNode[] };
  defs: CustomDef[];
  view: View;
  setView: (u: View | ((v: View) => View)) => void;
  host: React.RefObject<HTMLDivElement | null>;
  onExpand?: () => void;
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
  // Auto-move on hover, double-click to zoom and center
  const handleMiniMove = (e: React.PointerEvent | React.MouseEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wx = x1 + (e.clientX - box.left) / s;
    const wy = y1 + (e.clientY - box.top) / s;
    setView((v) => ({
      ...v,
      x: (r?.width ?? 800) / 2 - wx * v.z,
      y: (r?.height ?? 500) / 2 - wy * v.z,
    }));
  };
  return (
    <div
      className="absolute bottom-3 left-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 shadow-[var(--shadow)] cursor-pointer hover:ring-2 hover:ring-[var(--accent)]/30"
      style={{ width: W, height: H }}
      onPointerMove={(e)=>{ e.stopPropagation(); handleMiniMove(e); }}
      onPointerEnter={(e)=>{ handleMiniMove(e as any); }}
      onClick={(e)=>{ e.stopPropagation(); onExpand?.(); }}
      onDoubleClick={(e)=>{
        e.stopPropagation();
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const wx = x1 + (e.clientX - box.left) / s;
        const wy = y1 + (e.clientY - box.top) / s;
        const newZ = Math.min(3.2, view.z * 1.6);
        // Center and zoom
        if (r) {
          setView({ x: r.width/2 - wx * newZ, y: r.height/2 - wy * newZ, z: newZ });
        } else {
          handleMiniMove(e as any);
          setView((v)=> ({ ...v, z: newZ }));
        }
      }}
      title="Minimap — hover to auto-pan, double-click to zoom and center"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full border-0 bg-transparent p-0"
        style={{ cursor: "pointer" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleMiniMove(e);
        }}
        aria-label="Minimap — click to center"
      />
      <svg width={W} height={H} className="pointer-events-none absolute inset-0">
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
    </div>
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
  n, defs, sim, selected, onBodyDown, onContextMenu, onDoubleClick, onPortDown, onHoverPort, hoverPort, onToggle, dimmed, reduceGlow, glossy, onHoverStart, onHoverEnd, layerColor, depthOpacity, depthBlur,
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
  layerColor?: string;
  depthOpacity?: number;
  depthBlur?: number;
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
  const expectPass: boolean | null =
    n.expected == null ? null : state !== 0 && state !== 1 ? null : state === n.expected;

  const isText = n.type === "TEXT";
  if (isText) {
    const textContent = n.text ?? n.label ?? "Double-click to edit";
    const lines = String(textContent).split("\n");
    const displayLines = lines.slice(0, 6);
    return (
      <g transform={`translate(${n.x},${n.y}) rotate(${n.rot},${w / 2},${h / 2})`} opacity={dimmed ? 0.22 : (depthOpacity ?? 1)} style={{ filter: depthBlur ? `blur(${depthBlur * 0.42}px)` : undefined, transition: "opacity 420ms ease, filter 420ms ease" } as any}>
        <g
          onPointerDown={onBodyDown}
          onContextMenu={onContextMenu}
          onDoubleClick={onDoubleClick}
          onPointerEnter={onHoverStart}
          onPointerLeave={onHoverEnd}
          style={{ cursor: n.locked ? "not-allowed" : "move" }}
        >
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={8}
            fill="var(--panel)"
            stroke={selected ? "var(--accent)" : layerColor ?? "var(--border)"}
            strokeWidth={selected ? 2 : 1.2}
            strokeDasharray="6 4"
            filter={reduceGlow ? undefined : "url(#nodeShadow)"}
          />
          {selected && (
            <rect x={-3} y={-3} width={w + 6} height={h + 6} rx={11} fill="none" stroke="var(--accent)" opacity={0.3} strokeWidth={2} />
          )}
          {n.locked && (
            <g transform="translate(6,6)" opacity={0.9} style={{ pointerEvents: "none" }}>
              <rect x={0} y={3.2} width={9} height={6.8} rx={1.4} fill="var(--muted)" />
              <path d="M1.6 3.2 V1.9 a2.9 2.9 0 0 1 5.8 0 V3.2" fill="none" stroke="var(--muted)" strokeWidth={1.3} />
            </g>
          )}
          {displayLines.map((line, i) => (
            <text
              key={i}
              x={8}
              y={18 + i * 14}
              fontSize={10}
              fontWeight={500}
              fill="var(--text)"
              style={{ pointerEvents: "none" }}
            >
              {line.slice(0, 38) || " "}
            </text>
          ))}
          {lines.length > 6 && (
            <text x={w - 8} y={h - 8} fontSize={7} fill="var(--muted)" textAnchor="end">
              +{lines.length - 6}
            </text>
          )}
          <text x={w - 6} y={12} fontSize={7} fill="var(--muted)" textAnchor="end" style={{ pointerEvents: "none" }}>
            TEXT
          </text>
        </g>
      </g>
    );
  }

  // Standard gate shapes — Apple continuity inspired: distinct, not uniform rectangles
  const isGateish = ["AND","OR","NOT","NAND","NOR","XOR","XNOR","BUFFER"].includes(n.type);
  const gate = isGateish ? gateShape(n.type, w, h) : null;

  const body = (() => {
    if (gate) {
      const showBubble = gate.bubble;
      const bubbleR = 5;
      const r = h/2;
      let bubbleX = 0;
      if (n.type === "NOT") bubbleX = w - 5;
      else if (n.type === "NAND") bubbleX = w - r - 5;
      else if (n.type === "NOR" || n.type === "XNOR") bubbleX = w - 5;
      else if (n.type === "AND") bubbleX = w - r + 5; // for completeness, though AND has no bubble
      const bubbleY = h/2;
      return (
        <g>
          {/* Painterly layer tint — subtle border color per layer for depth */}
          {layerColor && !selected && <path d={gate.body} fill="none" stroke={layerColor} strokeOpacity={0.18} strokeWidth={8} style={{ pointerEvents: "none" }} />}
          <path
            d={gate.body}
            fill="var(--node)"
            stroke={selected ? "var(--accent)" : "var(--border)"}
            strokeWidth={selected ? 2 : 1.2}
            filter={reduceGlow ? undefined : "url(#nodeShadow)"}
          />
          {/* XOR extra arch as stroke for distinction */}
          {gate.arch && <path d={gate.arch} fill="none" stroke={selected ? "var(--accent)" : "var(--border)"} strokeWidth={1.4} strokeLinecap="round" />}
          {showBubble && <circle cx={bubbleX} cy={bubbleY} r={bubbleR} fill="var(--node)" stroke={selected ? "var(--accent)" : "var(--border)"} strokeWidth={1.2} />}
          {glossy && (
            <path d={gate.body} fill="url(#nodeBevel)" opacity={0.9} style={{ pointerEvents: "none" }} />
          )}
          {selected && (
            <path d={gate.body} fill="none" stroke="var(--accent)" opacity={0.26} strokeWidth={3} style={{ pointerEvents: "none" }} />
          )}
          {n.type === "CUSTOM" && <rect x={0} y={0} width={w} height={4} rx={2} fill="var(--accent)" opacity={0.8} />}
          {floating && !isSwitch && (
            <path d={gate.body} fill="none" stroke="var(--xx)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.85} />
          )}
          {n.locked && (
            <g transform="translate(6,6)" opacity={0.9} style={{ pointerEvents: "none" }}>
              <rect x={0} y={3.2} width={9} height={6.8} rx={1.4} fill="var(--muted)" />
              <path d="M1.6 3.2 V1.9 a2.9 2.9 0 0 1 5.8 0 V3.2" fill="none" stroke="var(--muted)" strokeWidth={1.3} />
            </g>
          )}
          {/* Center label for gates — continuity: always there, only state changes */}
          <text
            x={w / 2 - (showBubble ? 5 : 0)}
            y={gate.arch ? h/2 + 3 : h / 2 + 4}
            textAnchor="middle"
            fontSize={n.type === "CUSTOM" ? 10 : 11}
            fontWeight={700}
            fill="var(--text)"
            style={{ letterSpacing: "0.04em", pointerEvents: "none" }}
          >
            {n.type === "BUFFER" ? "BUF" : n.type}
          </text>
          {/* Small Δ indicator for gates with delay - placed not to clash with bubble */}
          <text
            x={w / 2 - (showBubble ? 5 : 0)}
            y={h - 7}
            textAnchor="middle"
            fontSize={6.5}
            fontWeight={600}
            fill="var(--muted)"
            stroke="var(--node)"
            strokeWidth={2.5}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {n.delay != null && n.delay > 0 ? `Δ${n.delay}` : `${ins}→${outs}`}
          </text>
          <circle cx={w - 11 - (showBubble ? 6 : 0)} cy={9} r={2.8} fill={col} opacity={0.95} filter={state === 1 && !reduceGlow ? "url(#glow)" : undefined} />
        </g>
      );
    }
    // Non-gate rectangular bodies (IO, sequential) with layered depth
    return (
      <g>
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={n.type === "LED" ? h / 2 : 10}
          fill="var(--node)"
          stroke={selected ? "var(--accent)" : layerColor ?? "var(--border)"}
          strokeWidth={selected ? 2 : 1.2}
          filter={reduceGlow ? undefined : "url(#nodeShadow)"}
        />
        {/* layer indicator removed — top line was confusing on Switch/LED; depth via blur/rail only */}
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
  })();

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
    // Port visual at actual port position (already bubble tip via geometry)
    const outX = p.x;
    const outY = p.y;
    ports.push(
      <g
        key={k}
        onPointerDown={(e) => onPortDown(e, n.id, "out", i)}
        onPointerEnter={(e) => onHoverPort(k, e)}
        onPointerLeave={() => onHoverPort(null)}
        style={{ cursor: "crosshair" }}
      >
        <circle cx={outX} cy={outY} r={10} fill="transparent" />
        <circle cx={outX} cy={outY} r={hoverPort === k ? 6.5 : 5} fill={valColor(v)} stroke="var(--panel)" strokeWidth={1.4} />
        {label && outs > 1 && (
          <text
            x={outX - 7}
            y={outY + 3}
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
    <g transform={`translate(${n.x},${n.y}) rotate(${n.rot},${w / 2},${h / 2})`} opacity={dimmed ? 0.18 : (depthOpacity ?? 1)} style={{ filter: (dimmed ? "blur(1.1px)" : depthBlur ? `blur(${depthBlur * 0.42}px)` : undefined), transition: "opacity 420ms cubic-bezier(.2,.8,.2,1), filter 420ms cubic-bezier(.2,.8,.2,1)" } as any}>
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
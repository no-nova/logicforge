import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CNode,
  type CustomDef,
  type Doc,
  type NodeKind,
  CATALOG,
  GRID,
  isGate,
  nodeSize,
  snap,
  uid,
} from "./circuit";
import { demoXor, emptyDoc } from "./demoCircuits";
import { createLayer, defaultLayers, ensureLayers } from "./layers";
import type { Region } from "./types";

const LS_DOC = "logicforge.doc.v2";
const LS_FILES = "logicforge.projects.v2";
const LS_CURRENT = "logicforge.current.v2";
const LS_PREFS = "logicforge.prefs.v2";

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface Project extends ProjectMeta {
  doc: Doc;
}

export interface Prefs {
  themeId: string;
  wireStyle: "curve" | "ortho";
  snapOn: boolean;
  wheelZoom: boolean;
  waveformOpen: boolean;
  timingMode: "zero" | "unit";
  leftOpen: boolean;
  rightOpen: boolean;
  /** Disables the drop-shadow/glow blur filters on the canvas — for large circuits or low-power devices. */
  reduceGlow: boolean;
  /** Adds a bevel/gloss gradient overlay on node bodies and indicators for a glossier, more 3D look. Off = flat. */
  glossy: boolean;
}

export const defaultPrefs = (): Prefs => ({
  themeId: "blue-dark",
  // Orthogonal routing by default: with dozens of parallel switch → gate →
  // LED runs, curved bezier wires cross and double back on themselves in a
  // way that makes an individual signal's path very hard to follow.
  // Manhattan routing keeps runs axis-aligned and left-to-right. "Curve" is
  // still available as an option.
  wireStyle: "ortho",
  snapOn: true,
  wheelZoom: false,
  waveformOpen: true,
  timingMode: "zero",
  leftOpen: true,
  rightOpen: true,
  reduceGlow: false,
  // Flat by default. The earlier bevel-gradient + gloss-highlight look read
  // as a fake, dated "metallic" texture rather than tasteful depth — better
  // to keep the plain flat fill (with just the drop shadow for a subtle
  // lift) as the default, and let people opt into the glossier look.
  glossy: false,
});

function lsGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, v: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = lsGet(LS_PREFS);
    if (raw) return { ...defaultPrefs(), ...(JSON.parse(raw) as Prefs) };
  } catch {
    /* ignore */
  }
  return defaultPrefs();
}

export function savePrefs(p: Prefs) {
  lsSet(LS_PREFS, JSON.stringify(p));
}

function readProjects(): Project[] {
  try {
    const raw = lsGet(LS_FILES);
    if (raw) {
      const list = JSON.parse(raw) as Project[];
      if (Array.isArray(list)) return list.slice(0, 40);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeProjects(list: Project[]) {
  lsSet(LS_FILES, JSON.stringify(list.slice(0, 40)));
}

export function ensureRegions(doc: import("./types").Doc): import("./types").Doc {
  const regions = (doc as any).regions as Region[] | undefined;
  if (Array.isArray(regions)) return doc;
  return { ...doc, regions: [] as Region[] };
}

export function defaultInputs(type: NodeKind): number {
  if (type === "CUSTOM") return 0;
  return CATALOG[type].defaultInputs;
}

export function cloneChunk(d: Doc, ids: string[], dx: number, dy: number) {
  const map = new Map<string, string>();
  const nodes = d.nodes
    .filter((n) => ids.includes(n.id))
    .map((n) => {
      const nid = uid("c");
      map.set(n.id, nid);
      return { ...n, id: nid, x: snap(n.x + dx), y: snap(n.y + dy) };
    });
  const wires = d.wires
    .filter((w) => map.has(w.from.node) && map.has(w.to.node))
    .map((w) => ({
      id: uid("w"),
      from: { node: map.get(w.from.node)!, port: w.from.port },
      to: { node: map.get(w.to.node)!, port: w.to.port },
    }));
  return { nodes, wires, map };
}

export interface HistoryEntry {
  doc: Doc;
  label: string;
}

export interface EditorAPI {
  doc: Doc;
  selection: string[];
  selectedWires: string[];
  setSelection: (ids: string[]) => void;
  setSelectedWires: (ids: string[]) => void;
  commit: (updater: (d: Doc) => Doc, label?: string) => void;
  live: (updater: (d: Doc) => Doc) => void;
  pushHistory: (label?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  addNode: (type: NodeKind, x: number, y: number, defId?: string) => string;
  deleteSelected: () => void;
  duplicateSelected: (dx?: number, dy?: number) => string[];
  rotateSelected: () => void;
  nudge: (dx: number, dy: number) => void;
  toggleLock: () => void;
  setExpected: (id: string, v: 0 | 1 | undefined) => void;
  copy: () => void;
  cut: () => void;
  paste: (x?: number, y?: number) => void;
  hasClipboard: boolean;
  alignSelected: (mode: "left" | "right" | "top" | "bottom" | "hspace" | "vspace") => void;
  autoLayout: () => void;
  convertToText: (ids?: string[]) => void;
  // Painterly layers (far → near) — depth composition
  activeLayerId: string | undefined;
  layers: import("./types").Layer[];
  flattenLayers: boolean;
  setActiveLayer: (id: string) => void;
  addLayer: (name?: string) => void;
  renameLayer: (id: string, name: string) => void;
  removeLayer: (id: string) => void;
  moveSelectionToLayer: (layerId: string, ids?: string[]) => void;
  toggleFlattenLayers: () => void;
  // Regions (functional blocks)
  regions: Region[];
  createRegion: (ids?: string[], name?: string) => string | undefined;
  updateRegion: (id: string, patch: Partial<Region>) => void;
  deleteRegion: (id: string) => void;
  moveRegion: (id: string, dx: number, dy: number) => void;
  convertTextToComponent: (id: string, targetType?: NodeKind) => void;
  connect: (from: { node: string; port: number }, to: { node: string; port: number }) => void;
  makeCustom: (name: string) => void;
  reset: () => void;
  load: (d: Doc) => void;
  projects: ProjectMeta[];
  currentId: string;
  fileName: string;
  newFile: () => void;
  openFile: (id: string) => void;
  saveAs: (name: string) => void;
  renameFile: (name: string) => void;
  deleteFile: (id: string) => void;
  duplicateFile: () => void;
  ready: boolean;
}

function hydrateInitial(): { doc: Doc; currentId: string; projects: Project[] } {
  const projects = readProjects();
  const currentId = lsGet(LS_CURRENT);
  if (currentId) {
    const hit = projects.find((p) => p.id === currentId);
    if (hit)   return { doc: ensureRegions(ensureLayers(hit.doc)), currentId: hit.id, projects: projects.map((pr) => ({ ...pr, doc: ensureRegions(ensureLayers(pr.doc)) })) };
  }
  try {
    const raw = lsGet(LS_DOC);
    if (raw) {
      const d = JSON.parse(raw) as Doc;
      if (Array.isArray(d.nodes)) {
        const ensured = ensureRegions(ensureLayers({ ...d, defs: d.defs ?? [], name: d.name || "Untitled" }));
        const id = uid("f");
        const p: Project = {
          id,
          name: ensured.name || "Untitled",
          updatedAt: Date.now(),
          doc: ensured,
        };
        return { doc: p.doc, currentId: id, projects: [p, ...projects.map((pr) => ({ ...pr, doc: ensureLayers(pr.doc) }))] };
      }
    }
  } catch {
    /* ignore */
  }
  if (projects[0]) return { doc: ensureRegions(ensureLayers(projects[0].doc)), currentId: projects[0].id, projects: projects.map((pr) => ({ ...pr, doc: ensureRegions(ensureLayers(pr.doc)) })) };
  const demo = ensureRegions(ensureLayers(demoXor()));
  const id = uid("f");
  const p: Project = { id, name: demo.name || "XOR from gates", updatedAt: Date.now(), doc: demo };
  return { doc: demo, currentId: id, projects: [p] };
}

export function useEditor(): EditorAPI {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<Doc>(emptyDoc);
  const [currentId, setCurrentId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [selectedWires, setSelectedWires] = useState<string[]>([]);
  const [clipRev, setClipRev] = useState(0);
  const clip = useRef<{ nodes: CNode[]; wires: Doc["wires"] } | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const currentRef = useRef(currentId);
  currentRef.current = currentId;

  useEffect(() => {
    const h = hydrateInitial();
    setDoc(h.doc);
    setCurrentId(h.currentId);
    setProjects(h.projects);
    writeProjects(h.projects);
    lsSet(LS_CURRENT, h.currentId);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      setProjects((list) => {
        const next = list.map((p) =>
          p.id === currentRef.current
            ? { ...p, doc: docRef.current, name: docRef.current.name || p.name, updatedAt: Date.now() }
            : p,
        );
        writeProjects(next);
        lsSet(LS_DOC, JSON.stringify(docRef.current));
        return next;
      });
    }, 450);
    return () => clearTimeout(t);
  }, [doc, ready]);

  const pushHistory = useCallback((label = "edit") => {
    setPast((p) => [...p.slice(-80), { doc: docRef.current, label }]);
    setFuture([]);
  }, []);

  const commit = useCallback((updater: (d: Doc) => Doc, label = "edit") => {
    setPast((p) => [...p.slice(-80), { doc: docRef.current, label }]);
    setFuture([]);
    setDoc((d) => updater(d));
  }, []);

  const live = useCallback((updater: (d: Doc) => Doc) => setDoc((d) => updater(d)), []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [{ doc: docRef.current, label: prev.label }, ...f]);
      setDoc(prev.doc);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setPast((p) => [...p, { doc: docRef.current, label: f[0].label }]);
      setDoc(f[0].doc);
      return f.slice(1);
    });
  }, []);

  // Every switch/clock/probe/LED otherwise shows the same generic catalog
  // name ("Switch", "LED", ...) on the canvas, in the waveform, and in the
  // inspector — with more than a couple of them on the canvas there's no
  // way to tell which row in the waveform belongs to which switch. Give
  // I/O nodes a short auto-incrementing label at creation time instead;
  // `nodeTitle` already prefers `label` over the catalog name everywhere
  // it's used, and the user can still override it (double-click on the
  // canvas, or the Label field in the inspector).
  const AUTO_PREFIX: Partial<Record<NodeKind, string>> = { INPUT: "SW", CLOCK: "CLK", OUTPUT: "OUT", LED: "LED" };

  const addNode = useCallback(
    (type: NodeKind, x: number, y: number, defId?: string) => {
      const id = uid(type.toLowerCase().slice(0, 3) + "_");
      const spec = type === "CUSTOM" ? null : CATALOG[type];
      const prefix = AUTO_PREFIX[type];
      const label = prefix ? `${prefix}${docRef.current.nodes.filter((n) => n.type === type).length + 1}` : undefined;
      const cur = docRef.current;
      const ensured = ensureLayers(cur);
      const active = ensured.activeLayerId ?? ensured.layers?.[ensured.layers.length - 1]?.id;
      const node: CNode = {
        id,
        type,
        x: snap(x),
        y: snap(y),
        rot: 0,
        inputs: defaultInputs(type),
        defId,
        layerId: active,
        ...(label ? { label } : {}),
        ...(type === "INPUT" ? { value: 0 as const } : {}),
        ...(type === "CLOCK" ? { period: 12, domain: "clk" } : {}),
        ...(type === "COUNTER" ? { bits: 4 } : {}),
        ...(spec ? { delay: spec.defaultDelay } : {}),
      };
      commit((d) => ({ ...ensureLayers(d), nodes: [...d.nodes, node] }), `add ${spec?.name ?? type}`);
      setSelection([id]);
      setSelectedWires([]);
      return id;
    },
    [commit],
  );

  const deleteSelected = useCallback(() => {
    if (!selection.length && !selectedWires.length) return;
    commit(
      (d) => ({
        ...d,
        nodes: d.nodes.filter((n) => !selection.includes(n.id)),
        wires: d.wires.filter(
          (w) =>
            !selectedWires.includes(w.id) &&
            !selection.includes(w.from.node) &&
            !selection.includes(w.to.node),
        ),
      }),
      "delete",
    );
    setSelection([]);
    setSelectedWires([]);
  }, [selection, selectedWires, commit]);

  const duplicateSelected = useCallback(
    (dx = GRID * 2, dy = GRID * 2) => {
      if (!selection.length) return [];
      const { nodes, wires } = cloneChunk(docRef.current, selection, dx, dy);
      commit((d) => ({ ...d, nodes: [...d.nodes, ...nodes], wires: [...d.wires, ...wires] }), "duplicate");
      const ids = nodes.map((n) => n.id);
      setSelection(ids);
      return ids;
    },
    [selection, commit],
  );

  const rotateSelected = useCallback(() => {
    if (!selection.length) return;
    commit(
      (d) => ({
        ...d,
        nodes: d.nodes.map((n) =>
          selection.includes(n.id) ? { ...n, rot: (((n.rot + 90) % 360) as CNode["rot"]) } : n,
        ),
      }),
      "rotate",
    );
  }, [selection, commit]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (!selection.length) return;
      commit(
        (d) => ({
          ...d,
          nodes: d.nodes.map((n) =>
            selection.includes(n.id) && !n.locked ? { ...n, x: n.x + dx, y: n.y + dy } : n,
          ),
        }),
        "nudge",
      );
    },
    [selection, commit],
  );

  // Toggles the lock state of the current selection as a group: if every
  // selected node is already locked, unlock them all; otherwise lock every
  // selected node (including any already-locked ones). A locked node keeps
  // its position frozen against drag and nudge but stays selectable so it
  // can be unlocked again later.
  const toggleLock = useCallback(() => {
    if (!selection.length) return;
    const d = docRef.current;
    const allLocked = selection.every((id) => d.nodes.find((n) => n.id === id)?.locked);
    commit(
      (doc0) => ({
        ...doc0,
        nodes: doc0.nodes.map((n) => (selection.includes(n.id) ? { ...n, locked: !allLocked } : n)),
      }),
      allLocked ? "unlock" : "lock",
    );
  }, [selection, commit]);

  // ——— Painterly layers ———
  const setActiveLayer = useCallback((id: string) => {
    commit((d) => ({ ...ensureLayers(d), activeLayerId: id }), "active layer");
  }, [commit]);
  const addLayer = useCallback((name?: string) => {
    commit((d) => {
      const ensured = ensureLayers(d);
      const order = Math.max(0, ...(ensured.layers ?? []).map((l) => l.order)) + 1;
      const lyr = createLayer(name, order);
      return { ...ensured, layers: [...(ensured.layers ?? []), lyr], activeLayerId: lyr.id };
    }, "add layer");
  }, [commit]);
  const renameLayer = useCallback((id: string, name: string) => {
    commit((d) => ({ ...ensureLayers(d), layers: (ensureLayers(d).layers ?? []).map((l) => (l.id === id ? { ...l, name } : l)) }), "rename layer");
  }, [commit]);
  const removeLayer = useCallback((id: string) => {
    commit((d) => {
      const ensured = ensureLayers(d);
      if ((ensured.layers ?? []).length <= 1) return ensured;
      const nextLayers = (ensured.layers ?? []).filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }));
      const fallback = nextLayers[nextLayers.length - 1]?.id ?? nextLayers[0].id;
      const nextActive = ensured.activeLayerId === id ? fallback : ensured.activeLayerId;
      // Move nodes on deleted layer to fallback
      const nodes = ensured.nodes.map((n) => (n.layerId === id ? { ...n, layerId: fallback } : n));
      return { ...ensured, layers: nextLayers, activeLayerId: nextActive, nodes };
    }, "remove layer");
  }, [commit]);
  const moveSelectionToLayer = useCallback((layerId: string, ids?: string[]) => {
    const targetIds = ids ?? selection;
    if (!targetIds.length) return;
    commit((d) => ({ ...ensureLayers(d), nodes: d.nodes.map((n) => (targetIds.includes(n.id) ? { ...n, layerId } : n)) }), "move layer");
  }, [selection, commit]);
  const toggleFlattenLayers = useCallback(() => {
    commit((d) => ({ ...ensureLayers(d), flattenLayers: !ensureLayers(d).flattenLayers }), "toggle flatten");
  }, [commit]);

  // ——— Regions ———
  const createRegion = useCallback((ids?: string[], name?: string) => {
    const targetIds = ids ?? selection;
    if (!targetIds.length) return undefined;
    const cur = docRef.current;
    const nodes = cur.nodes.filter((n) => targetIds.includes(n.id));
    if (!nodes.length) return undefined;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const { w, h } = nodeSize(n, cur.defs);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }
    const pad = 16;
    const id = uid("reg_");
    const palette = ["#4d9fff", "#34d399", "#f59e0b", "#a78bfa", "#f472b6", "#38bdf8"];
    const color = palette[(cur.regions?.length ?? 0) % palette.length];
    const region: Region = {
      id,
      name: name ?? `Block ${(cur.regions?.length ?? 0) + 1}`,
      color,
      x: snap(minX - pad),
      y: snap(minY - pad),
      w: snap(maxX - minX + pad * 2),
      h: snap(maxY - minY + pad * 2),
      nodeIds: [...targetIds],
    };
    commit((d) => ({ ...ensureRegions(ensureLayers(d)), regions: [...(ensureRegions(d).regions ?? []), region] }), "create region");
    return id;
  }, [selection, commit]);

  const updateRegion = useCallback((id: string, patch: Partial<Region>) => {
    commit((d) => ({ ...ensureRegions(d), regions: (ensureRegions(d).regions ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)) }), "update region");
  }, [commit]);

  const deleteRegion = useCallback((id: string) => {
    commit((d) => ({ ...ensureRegions(d), regions: (ensureRegions(d).regions ?? []).filter((r) => r.id !== id) }), "delete region");
  }, [commit]);

  const moveRegion = useCallback((id: string, dx: number, dy: number) => {
    commit((d) => {
      const ensured = ensureRegions(d);
      const reg = ensured.regions?.find((r) => r.id === id);
      if (!reg) return ensured;
      const movedNodes = ensured.nodes.map((n) => (reg.nodeIds.includes(n.id) && !n.locked ? { ...n, x: n.x + dx, y: n.y + dy } : n));
      const movedRegions = ensured.regions!.map((r) => (r.id === id ? { ...r, x: r.x + dx, y: r.y + dy } : r));
      return { ...ensured, nodes: movedNodes, regions: movedRegions };
    }, "move region");
  }, [commit]);

  // Lets a Probe/LED carry a "this is what I expect to see here" marker so
  // a circuit's outputs can be checked against a spec at a glance instead
  // of having to read every indicator by eye each time.
  const setExpected = useCallback(
    (id: string, v: 0 | 1 | undefined) => {
      commit(
        (d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, expected: v } : n)) }),
        v == null ? "clear expected output" : "set expected output",
      );
    },
    [commit],
  );

  const copy = useCallback(() => {
    if (!selection.length) return;
    const d = docRef.current;
    const payload = {
      nodes: d.nodes.filter((n) => selection.includes(n.id)),
      wires: d.wires.filter((w) => selection.includes(w.from.node) && selection.includes(w.to.node)),
    };
    clip.current = payload;
    setClipRev((n) => n + 1);
    try {
      void navigator.clipboard.writeText(JSON.stringify({ logicforge: 1, ...payload }));
    } catch {
      /* ignore */
    }
  }, [selection]);

  const cut = useCallback(() => {
    copy();
    deleteSelected();
  }, [copy, deleteSelected]);

  const paste = useCallback(
    (x?: number, y?: number) => {
      const apply = (c: { nodes: CNode[]; wires: Doc["wires"] }) => {
        if (!c.nodes.length) return;
        const minX = Math.min(...c.nodes.map((n) => n.x));
        const minY = Math.min(...c.nodes.map((n) => n.y));
        const dx = x != null ? x - minX : GRID * 2;
        const dy = y != null ? y - minY : GRID * 2;
        const map = new Map<string, string>();
        const nodes = c.nodes.map((n) => {
          const nid = uid("p");
          map.set(n.id, nid);
          return { ...n, id: nid, x: snap(n.x + dx), y: snap(n.y + dy) };
        });
        const wires = c.wires.map((w) => ({
          id: uid("w"),
          from: { node: map.get(w.from.node)!, port: w.from.port },
          to: { node: map.get(w.to.node)!, port: w.to.port },
        }));
        commit((d) => ({ ...d, nodes: [...d.nodes, ...nodes], wires: [...d.wires, ...wires] }), "paste");
        setSelection(nodes.map((n) => n.id));
      };
      const local = clip.current;
      if (local?.nodes.length) {
        apply(local);
        return;
      }
      void navigator.clipboard.readText().then((t) => {
        try {
          const j = JSON.parse(t) as { logicforge?: number; nodes: CNode[]; wires: Doc["wires"] };
          if (j.logicforge && Array.isArray(j.nodes)) apply(j);
        } catch {
          /* ignore */
        }
      });
    },
    [commit],
  );

  const alignSelected = useCallback(
    (mode: Parameters<EditorAPI["alignSelected"]>[0]) => {
      if (selection.length < 2) return;
      commit((d) => {
        const sel = d.nodes.filter((n) => selection.includes(n.id));
        const xs = sel.map((n) => n.x);
        const ys = sel.map((n) => n.y);
        let update: (n: CNode) => CNode = (n) => n;
        if (mode === "left") {
          const v = Math.min(...xs);
          update = (n) => ({ ...n, x: v });
        }
        if (mode === "right") {
          const v = Math.max(...xs);
          update = (n) => ({ ...n, x: v });
        }
        if (mode === "top") {
          const v = Math.min(...ys);
          update = (n) => ({ ...n, y: v });
        }
        if (mode === "bottom") {
          const v = Math.max(...ys);
          update = (n) => ({ ...n, y: v });
        }
        if (mode === "vspace") {
          // True distribution: keep the top-most and bottom-most nodes where they are,
          // then lay the rest out so the gap *between* each node's edges is equal —
          // not a fixed step between anchor points. That also has to account for each
          // node's own height, or differently-sized components end up looking uneven
          // even though their tops are "evenly" spaced.
          const sorted = [...sel].sort((a, b) => a.y - b.y);
          const sizes = sorted.map((n) => nodeSize(n, d.defs));
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const lastH = sizes[sizes.length - 1].h;
          const span = last.y + lastH - first.y;
          const sumH = sizes.reduce((s, sz) => s + sz.h, 0);
          const gap = sorted.length > 1 ? (span - sumH) / (sorted.length - 1) : 0;
          const order = new Map<string, number>();
          let cursor = first.y;
          sorted.forEach((n, i) => {
            order.set(n.id, cursor);
            cursor += sizes[i].h + gap;
          });
          update = (n) => ({ ...n, y: order.get(n.id) ?? n.y });
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
          const order = new Map<string, number>();
          let cursor = first.x;
          sorted.forEach((n, i) => {
            order.set(n.id, cursor);
            cursor += sizes[i].w + gap;
          });
          update = (n) => ({ ...n, x: order.get(n.id) ?? n.x });
        }
        return { ...d, nodes: d.nodes.map((n) => (selection.includes(n.id) ? update(n) : n)) };
      }, "align");
    },
    [selection, commit],
  );

  const autoLayout = useCallback(() => {
    const current = docRef.current;
    if (!current.nodes.length) return;
    const useSelection = selection.length >= 2;
    const targetIds = useSelection ? selection : current.nodes.map((n) => n.id);
    const targetSet = new Set(targetIds);
    const targetNodes = current.nodes.filter((n) => targetSet.has(n.id));
    if (!targetNodes.length) return;
    const centroidX = targetNodes.reduce((s, n) => s + n.x, 0) / targetNodes.length;
    const centroidY = targetNodes.reduce((s, n) => s + n.y, 0) / targetNodes.length;

    commit((d) => {
      const allNodes = d.nodes as CNode[];
      const allWires = d.wires;
      const defs = (d as any).defs ?? current.defs ?? [];

      // 1) Subgraph Phase: distinguish layout nodes vs constraint nodes (external neighbors)
      // layoutNodes = targetSet (to be moved), external = adjacent but immovable, provides directional constraints
      // e.g. INPUT -> A -> B, only A selected => external INPUT(left), B(right) => A placed in middle
      const externalIds = new Set<string>();
      const inExternal = new Map<string, string[]>(); // layoutId -> external preds
      const outExternal = new Map<string, string[]>(); // layoutId -> external succs
      for (const id of targetIds) { inExternal.set(id, []); outExternal.set(id, []); }
      for (const w of allWires) {
        const fromIn = targetSet.has(w.from.node);
        const toIn = targetSet.has(w.to.node);
        if (fromIn && !toIn) { externalIds.add(w.to.node); outExternal.get(w.from.node)!.push(w.to.node); }
        else if (!fromIn && toIn) { externalIds.add(w.from.node); inExternal.get(w.to.node)!.push(w.from.node); }
      }
      // Build internal adjacency only for layout nodes
      const inMap = new Map<string, string[]>(); // internal preds
      const outMap = new Map<string, string[]>();
      const adj = new Map<string, string[]>(); // for SCC
      const radj = new Map<string, string[]>();
      for (const id of targetIds) { inMap.set(id, []); outMap.set(id, []); adj.set(id, []); radj.set(id, []); }
      // also map wire port info for port-aware barycenter
      const inPorts = new Map<string, { pred:string; predPort:number; myPort:number }[]>();
      const outPorts = new Map<string, { succ:string; myPort:number; succPort:number }[]>();
      for (const id of targetIds) { inPorts.set(id, []); outPorts.set(id, []); }
      for (const w of allWires) {
        if (targetSet.has(w.from.node) && targetSet.has(w.to.node)) {
          inMap.get(w.to.node)!.push(w.from.node);
          outMap.get(w.from.node)!.push(w.to.node);
          adj.get(w.from.node)!.push(w.to.node);
          radj.get(w.to.node)!.push(w.from.node);
          inPorts.get(w.to.node)!.push({ pred: w.from.node, predPort: w.from.port, myPort: w.to.port });
          outPorts.get(w.from.node)!.push({ succ: w.to.node, myPort: w.from.port, succPort: w.to.port });
        }
      }
      const isSourceType = (n: CNode) => n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC" || n.type === "GND" || n.type === "TEXT";
      const isSinkType = (n: CNode) => n.type === "OUTPUT" || n.type === "LED";
      // For layout nodes, source if no internal + no external preds and isSourceType, else consider external
      const isSource = (n: CNode) => {
        if (isSourceType(n)) return true;
        const internal = inMap.get(n.id)?.length ?? 0;
        const external = inExternal.get(n.id)?.length ?? 0;
        return internal===0 && external===0;
      };
      const isSink = (n: CNode) => isSinkType(n);

      // 2) SCC → DAG: compress feedback loops (latch/flip-flop/oscillator/counter)
      // A->B->C->A becomes [SCC] so DAG is acyclic; feedback wire kept short inside SCC
      const visited = new Set<string>();
      const order: string[] = [];
      const dfs1 = (v:string) => {
        visited.add(v);
        for (const nb of adj.get(v) ?? []) if (!visited.has(nb)) dfs1(nb);
        order.push(v);
      };
      for (const id of targetIds) if (!visited.has(id)) dfs1(id);
      const comp = new Map<string, number>();
      let compCnt = 0;
      const visited2 = new Set<string>();
      const dfs2 = (v:string, c:number) => {
        visited2.add(v); comp.set(v,c);
        for (const nb of radj.get(v) ?? []) if (!visited2.has(nb)) dfs2(nb,c);
      };
      for (let i=order.length-1;i>=0;i--) {
        const v=order[i];
        if (!visited2.has(v)) { dfs2(v, compCnt); compCnt++; }
      }
      // Build SCC groups
      const sccNodes = new Map<number, string[]>();
      for (const id of targetIds) {
        const c = comp.get(id)!;
        if (!sccNodes.has(c)) sccNodes.set(c, []);
        sccNodes.get(c)!.push(id);
      }
      // Self-loop check: single node with self-wire is SCC
      for (const w of allWires) if (targetSet.has(w.from.node) && w.from.node===w.to.node) {
        // ensure it's considered non-trivial (will be size 1 but loop)
        // mark via flag
        (sccNodes.get(comp.get(w.from.node)!) as any)._hasSelfLoop = true;
      }
      // Build DAG between SCCs
      const dagAdj = new Map<number, Set<number>>();
      const dagIndeg = new Map<number, number>();
      for (let c=0;c<compCnt;c++) { dagAdj.set(c, new Set()); dagIndeg.set(c,0); }
      for (const w of allWires) {
        if (!targetSet.has(w.from.node) || !targetSet.has(w.to.node)) continue;
        const cf = comp.get(w.from.node)!, ct = comp.get(w.to.node)!;
        if (cf!==ct && !dagAdj.get(cf)!.has(ct)) {
          dagAdj.get(cf)!.add(ct);
          dagIndeg.set(ct, (dagIndeg.get(ct)??0)+1);
        }
      }
      // Also add external constraints as DAG anchors (virtual source/sink)
      // For level, external left (INPUT) → SCC at 0, external right (OUTPUT) → large
      const sccExternalPred = new Map<number, number>(); // count of external preds
      const sccExternalSucc = new Map<number, number>();
      for (const id of targetIds) {
        const c = comp.get(id)!;
        sccExternalPred.set(c, (sccExternalPred.get(c)??0) + (inExternal.get(id)?.length ?? 0));
        sccExternalSucc.set(c, (sccExternalSucc.get(c)??0) + (outExternal.get(id)?.length ?? 0));
      }

      // 3) Level assignment with DAG longest path + fixed source priority + sink alignment
      // Kahn topo
      const topo: number[] = [];
      const q: number[] = [];
      for (let c=0;c<compCnt;c++) if ((dagIndeg.get(c)??0)===0) q.push(c);
      // priority: sources first, and those with external preds first to the left
      q.sort((a,b)=> (sccExternalPred.get(a)??0) - (sccExternalPred.get(b)??0));
      const indegCopy = new Map(dagIndeg);
      while (q.length) {
        const c = q.shift()!;
        topo.push(c);
        for (const nb of dagAdj.get(c) ?? []) {
          indegCopy.set(nb, (indegCopy.get(nb)??1)-1);
          if (indegCopy.get(nb)===0) q.push(nb);
        }
      }
      // If cycle remains (should not after SCC), append remaining
      for (let c=0;c<compCnt;c++) if (!topo.includes(c)) topo.push(c);

      // Longest path: forward distance from sources
      const sccLevel = new Map<number, number>();
      for (const c of topo) sccLevel.set(c, -1);
      // init sources (indeg 0 or isSource inside)
      for (const c of topo) {
        const nodesInScc = sccNodes.get(c)!;
        const hasSource = nodesInScc.some(id=> {
          const n = allNodes.find(x=> x.id===id)!;
          return isSource(n);
        });
        const hasExternalPred = (sccExternalPred.get(c)??0)>0;
        if (hasSource && !hasExternalPred) sccLevel.set(c, 0);
        else if (hasExternalPred) sccLevel.set(c, 1); // after external left
        else if ((dagIndeg.get(c)??0)===0) sccLevel.set(c, 0);
      }
      for (const c of topo) {
        const cur = sccLevel.get(c) ?? -1;
        if (cur<0) continue; // unreachable yet
        for (const nb of dagAdj.get(c) ?? []) {
          const nbCur = sccLevel.get(nb) ?? -1;
          if (nbCur < cur+1) sccLevel.set(nb, cur+1);
        }
      }
      // Remaining unreachable: assign 1 or max+1 for sinks
      let maxLev = Math.max(...Array.from(sccLevel.values()).filter(v=> v>=0), 0);
      for (const c of topo) {
        if ((sccLevel.get(c) ?? -1) <0) {
          const nodesInScc = sccNodes.get(c)!;
          const sink = nodesInScc.some(id=> isSink(allNodes.find(x=> x.id===id)!));
          sccLevel.set(c, sink ? maxLev+1 : 1);
        }
      }
      maxLev = Math.max(...Array.from(sccLevel.values()));

      // Align sinks to right (OUTPUT/LED): all sinks should be at maxLev to avoid middle drift
      // Compute forward and backward distances, then level = forward, sinks forced to max
      // Also backward distance for stability
      const backward = new Map<number, number>(); // longest to sink
      for (const c of [...topo].reverse()) {
        const succs = [...(dagAdj.get(c) ?? [])];
        if (!succs.length) {
          const nodesInScc = sccNodes.get(c)!;
          const sink = nodesInScc.some(id=> isSink(allNodes.find(x=> x.id===id)!));
          backward.set(c, sink ? 0 : 0);
        } else {
          let best = -1;
          for (const nb of succs) best = Math.max(best, (backward.get(nb)??0)+1);
          backward.set(c, best);
        }
      }
      // Re-align sinks: if node is sink and its forward+backward < maxLev, push to maxLev
      for (const c of topo) {
        const nodesInScc = sccNodes.get(c)!;
        const isSinkScc = nodesInScc.some(id=> isSink(allNodes.find(x=> x.id===id)!));
        if (isSinkScc) {
          const f = sccLevel.get(c) ?? 0;
          const b = backward.get(c) ?? 0;
          // Keep sink at rightmost: set to maxLev, but respect DAG order (must be >= max pred+1)
          // So max of current and maxLev
          if (f < maxLev) sccLevel.set(c, maxLev);
        }
      }
      maxLev = Math.max(...Array.from(sccLevel.values()));

      // Expand SCC levels to node levels
      const level = new Map<string, number>();
      for (const id of targetIds) {
        const c = comp.get(id)!;
        level.set(id, sccLevel.get(c) ?? 0);
      }
      // Inside SCC: layout internal separately to keep feedback short
      // For SCC with >1 node (or self-loop), place them in vertical stack within same x, with Y ordering to minimize feedback length
      // We'll keep them at same level x, but assign sub-order
      const sccInternalOrder = new Map<string, number>();
      for (const [c, ids] of sccNodes) {
        if (ids.length<=1 && !(ids.length===1 && (sccNodes.get(c) as any)._hasSelfLoop)) {
          sccInternalOrder.set(ids[0], 0);
        } else {
          // Sort inside SCC by original Y to keep deterministic, then assign sub-index
          const sorted = [...ids].sort((a,b)=> {
            const na = allNodes.find(x=>x.id===a)!, nb = allNodes.find(x=>x.id===b)!;
            return na.y - nb.y || a.localeCompare(b);
          });
          // For feedback: try to keep driver (source inside SCC) top, feedback target bottom to make wire short
          // Simple: keep sorted order, feedback wire will be short vertical
          sorted.forEach((id,i)=> sccInternalOrder.set(id, i));
        }
      }

      // Build layers map by level
      const layers = new Map<number, CNode[]>();
      for (let i=0;i<=maxLev;i++) layers.set(i, []);
      for (const id of targetIds) {
        const n = allNodes.find(x=> x.id===id)!;
        const lev = level.get(id) ?? 0;
        layers.get(lev)!.push(n);
      }
      // Initial order by current Y + internal SCC order to preserve stability
      const orderIndex = new Map<string, number>();
      const originalOrder = new Map<string, number>();
      for (let lev=0; lev<=maxLev; lev++) {
        const layerNodes = layers.get(lev)!;
        layerNodes.sort((a,b)=> {
          const ao = sccInternalOrder.get(a.id) ?? 0;
          const bo = sccInternalOrder.get(b.id) ?? 0;
          if (ao!==bo) return ao-bo;
          return a.y - b.y || a.id.localeCompare(b.id);
        });
        layerNodes.forEach((n,i)=> { orderIndex.set(n.id,i); originalOrder.set(n.id,i); });
      }

      // 4) Crossing minimization: iterations = min(10, max(4, layers))
      const iterCount = Math.min(10, Math.max(4, maxLev+1));
      // Precompute node sizes for port-aware calc and dynamic gaps
      const nodeSizeMap = new Map<string, {w:number;h:number}>();
      for (const n of allNodes) if (targetSet.has(n.id)) {
        const {w,h} = nodeSize(n as any, defs);
        nodeSizeMap.set(n.id, {w,h});
      }
      // Helper to get port Y offset
      const portYOffset = (nodeId:string, dir:"in"|"out", idx:number) => {
        const n = allNodes.find(x=> x.id===nodeId)!;
        const {h} = nodeSizeMap.get(nodeId) ?? {w:80,h:50};
        const ins = inMap.get(nodeId)?.length ?? 0; // approximate? use actual port counts via nodeSize logic
        // Use geometry formula: y = count<=1 ? h/2 : 16 + ((h-28)*idx)/(count-1)
        // Need true port count: use defs via nodeSize already considered? For simplicity use h mapping
        // For gate, rowCount = max(ins,outs)
        // We'll approximate with h
        const isGateNode = ["AND","OR","NOT","NAND","NOR","XOR","XNOR","BUFFER"].includes(n.type);
        if (isGateNode) {
          // gate h already computed, port y same formula as geometry
          const count = dir==="in" ? (inPorts.get(nodeId)?.length ?? 1) : (outPorts.get(nodeId)?.length ?? 1);
          // Actually we need total ins/outs, use nodeSize logic: rowCount
          // fallback to count
          const c = Math.max(1, count);
          if (c<=1) return h/2;
          return 16 + ((h-28)*idx)/Math.max(1,c-1);
        } else {
          // For other types, use same
          const c = dir==="in" ? (inPorts.get(nodeId)?.length ?? 1) : (outPorts.get(nodeId)?.length ?? 1);
          if (c<=1) return h/2;
          return 16 + ((h-28)*idx)/Math.max(1,c-1);
        }
      };

      for (let it=0; it< iterCount; it++) {
        for (let lev=1; lev<=maxLev; lev++) {
          const layerNodes = layers.get(lev)!;
          const bary = new Map<string, number>();
          for (const n of layerNodes) {
            const preds = inPorts.get(n.id) ?? [];
            if (!preds.length) {
              // also consider external preds: use their current Y (from allNodes) as anchor
              const ext = inExternal.get(n.id) ?? [];
              if (ext.length) {
                const sum = ext.reduce((s, eid)=> {
                  const en = allNodes.find(x=> x.id===eid);
                  return s + (en ? en.y : 0);
                }, 0);
                // Convert to order-like value: use y directly for external
                bary.set(n.id, sum/ext.length);
              } else {
                bary.set(n.id, orderIndex.get(n.id) ?? 0);
              }
            } else {
              // Port-aware barycenter: predecessor y + predPortY - myPortY
              let sum = 0;
              for (const e of preds) {
                const predOrder = orderIndex.get(e.pred) ?? 0;
                const predLayer = level.get(e.pred) ?? 0;
                // Approx pred Y: use orderIndex * Y_GAP (we don't have Y_GAP yet, use order)
                // For now use order * 90 as proxy; will be refined with actual Y after gaps computed, but use order
                // Include port offset difference for better alignment
                const predSize = nodeSizeMap.get(e.pred) ?? {w:80,h:50};
                const mySize = nodeSizeMap.get(n.id) ?? {w:80,h:50};
                const predPortY = (()=> {
                  const cnt = Math.max(1, outPorts.get(e.pred)?.length ?? 1);
                  const h = predSize.h;
                  if (cnt<=1) return h/2;
                  return 16 + ((h-28)*e.predPort)/Math.max(1,cnt-1);
                })();
                const myPortY = (()=> {
                  const cnt = Math.max(1, inPorts.get(n.id)?.length ?? 1);
                  const h = mySize.h;
                  if (cnt<=1) return h/2;
                  return 16 + ((h-28)*e.myPort)/Math.max(1,cnt-1);
                })();
                // bary uses order + port delta / Y_GAP (approx 90)
                sum += predOrder + (predPortY - myPortY)/90;
              }
              bary.set(n.id, sum/preds.length);
            }
          }
          layerNodes.sort((a,b)=> {
            const ba = bary.get(a.id) ?? 0, bb = bary.get(b.id) ?? 0;
            if (Math.abs(ba-bb) > 1e-6) return ba-bb;
            const oa = originalOrder.get(a.id) ?? 0, ob = originalOrder.get(b.id) ?? 0;
            if (oa!==ob) return oa-ob;
            return a.id.localeCompare(b.id);
          });
          layerNodes.forEach((n,i)=> orderIndex.set(n.id,i));
        }
        for (let lev=maxLev-1; lev>=0; lev--) {
          const layerNodes = layers.get(lev)!;
          const bary = new Map<string, number>();
          for (const n of layerNodes) {
            const succs = outPorts.get(n.id) ?? [];
            if (!succs.length) {
              const ext = outExternal.get(n.id) ?? [];
              if (ext.length) {
                const sum = ext.reduce((s,eid)=> {
                  const en = allNodes.find(x=> x.id===eid);
                  return s + (en? en.y:0);
                },0);
                bary.set(n.id, sum/ext.length);
              } else {
                bary.set(n.id, orderIndex.get(n.id) ?? 0);
              }
            } else {
              let sum=0;
              for (const e of succs) {
                const succOrder = orderIndex.get(e.succ) ?? 0;
                const mySize = nodeSizeMap.get(n.id) ?? {w:80,h:50};
                const succSize = nodeSizeMap.get(e.succ) ?? {w:80,h:50};
                const myPortY = (()=> {
                  const cnt = Math.max(1, outPorts.get(n.id)?.length ?? 1);
                  const h = mySize.h;
                  if (cnt<=1) return h/2;
                  return 16 + ((h-28)*e.myPort)/Math.max(1,cnt-1);
                })();
                const succPortY = (()=> {
                  const cnt = Math.max(1, inPorts.get(e.succ)?.length ?? 1);
                  const h = succSize.h;
                  if (cnt<=1) return h/2;
                  return 16 + ((h-28)*e.succPort)/Math.max(1,cnt-1);
                })();
                sum += succOrder + (myPortY - succPortY)/90;
              }
              bary.set(n.id, sum/succs.length);
            }
          }
          layerNodes.sort((a,b)=> {
            const ba = bary.get(a.id) ?? 0, bb = bary.get(b.id) ?? 0;
            if (Math.abs(ba-bb) > 1e-6) return ba-bb;
            const oa = originalOrder.get(a.id) ?? 0, ob = originalOrder.get(b.id) ?? 0;
            if (oa!==ob) return oa-ob;
            return a.id.localeCompare(b.id);
          });
          layerNodes.forEach((n,i)=> orderIndex.set(n.id,i));
        }
      }

      // 6) Dynamic gaps based on node size + zoom scale
      let maxW = 80, maxH = 50;
      for (const id of targetIds) {
        const s = nodeSizeMap.get(id);
        if (s) { maxW = Math.max(maxW, s.w); maxH = Math.max(maxH, s.h); }
      }
      // X_GAP = maxNodeWidth +80, Y_GAP = maxNodeHeight+40, snap to GRID, with zoom-aware scaling
      let X_GAP = maxW + 80;
      let Y_GAP = maxH + 40;
      // Clamp for small/large circuits: at least 120/60, at most 220/120
      X_GAP = Math.max(120, Math.min(220, X_GAP));
      Y_GAP = Math.max(60, Math.min(120, Y_GAP));
      X_GAP = snap(X_GAP); Y_GAP = snap(Y_GAP);
      // If custom defs large, increase a bit
      if (maxW>90) X_GAP = snap(X_GAP+20);

      // Compute relative layout centered at (0,0)
      const relPos = new Map<string, { x:number; y:number }>();
      for (let lev=0; lev<=maxLev; lev++) {
        const layerNodes = layers.get(lev)!;
        // For SCC with multiple nodes at same level, stack vertically with sub-order
        // Already ordered, use Y_GAP
        const layerHeight = Math.max(0, (layerNodes.length-1)*Y_GAP);
        const startY = -layerHeight/2;
        const x = lev * X_GAP - (maxLev * X_GAP)/2;
        layerNodes.forEach((origNode, idx)=> {
          // If node is part of multi-node SCC, its x is already same level, y offset by internal order
          // For SCC internal, we already have order, but they share x; to keep feedback short, we could slightly offset x for feedback nodes
          // Keep simple: same x
          const y = startY + idx*Y_GAP;
          relPos.set(origNode.id, {x,y});
        });
      }
      // 7) Snap whole group, preserve internal geometry: dx = snap(centroid)-centroid, not per-node snap
      const snapDx = snap(centroidX) - centroidX;
      const snapDy = snap(centroidY) - centroidY;
      const newNodes = allNodes.map((n)=> {
        if (!targetSet.has(n.id)) return n;
        const rel = relPos.get(n.id)!;
        // Preserve symmetry: all nodes get same group snap offset, internal gaps remain exact
        return { ...n, x: centroidX + rel.x + snapDx, y: centroidY + rel.y + snapDy };
      });
      return { ...d, nodes: newNodes };
    }, "auto layout");
  }, [commit, selection]);

  const convertToText = useCallback(
    (ids?: string[]) => {
      const targetIds = ids?.length ? ids : selection.length ? selection : [];
      if (!targetIds.length) return;
      commit((d) => {
        const idSet = new Set(targetIds);
        // Collect HDL-like text for network if needed - here we create per-node TEXT
        const newNodes = d.nodes.map((n) => {
          if (!idSet.has(n.id)) return n;
          if (n.type === "TEXT") return n;
          const title = n.label ?? n.type;
          const hdlSnippet = `// ${title} (${n.type})\n// Converted to editable text\n${title}`;
          return {
            ...n,
            type: "TEXT" as NodeKind,
            text: n.text ?? hdlSnippet,
            inputs: 0,
            label: n.label,
          };
        });
        // Remove wires that were incident to converted nodes (TEXT has no ports)
        const newWires = d.wires.filter((w) => !idSet.has(w.from.node) && !idSet.has(w.to.node));
        return { ...d, nodes: newNodes, wires: newWires };
      }, "convert to text");
    },
    [selection, commit],
  );

  const convertTextToComponent = useCallback(
    (id: string, targetType: NodeKind = "BUFFER") => {
      commit((d) => {
        const node = d.nodes.find((n) => n.id === id);
        if (!node || node.type !== "TEXT") return d;
        const spec = CATALOG[targetType as Exclude<NodeKind, "CUSTOM">];
        const inputs = spec ? spec.defaultInputs : 1;
        return {
          ...d,
          nodes: d.nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  type: targetType,
                  text: undefined,
                  inputs,
                  label: n.label ?? n.text?.split("\n")[0]?.slice(0, 20),
                }
              : n,
          ),
        };
      }, "convert to component");
    },
    [commit],
  );

  const connect = useCallback(
    (from: { node: string; port: number }, to: { node: string; port: number }) => {
      if (from.node === to.node) return;
      commit(
        (d) => ({
          ...d,
          wires: [
            ...d.wires.filter((w) => !(w.to.node === to.node && w.to.port === to.port)),
            { id: uid("w"), from, to },
          ],
        }),
        "connect",
      );
    },
    [commit],
  );

  const makeCustom = useCallback(
    (name: string) => {
      const d = docRef.current;
      const sel = d.nodes.filter((n) => selection.includes(n.id));
      if (sel.length < 2) return;
      const inputs = sel.filter((n) => n.type === "INPUT").map((n) => n.id);
      const outputs = sel.filter((n) => n.type === "OUTPUT" || n.type === "LED").map((n) => n.id);
      if (!inputs.length || !outputs.length) return;
      const wires = d.wires.filter((w) => selection.includes(w.from.node) && selection.includes(w.to.node));
      const minX = Math.min(...sel.map((n) => n.x));
      const minY = Math.min(...sel.map((n) => n.y));
      const palette = ["#4d9fff", "#34d399", "#38bdf8", "#64748b", "#2dd4bf"];
      const def: CustomDef = {
        id: uid("def"),
        name: name.toUpperCase().slice(0, 12) || "BLOCK",
        color: palette[d.defs.length % palette.length],
        nodes: sel.map((n) => ({ ...n, x: n.x - minX + 40, y: n.y - minY + 40 })),
        wires: wires.map((w) => ({ ...w })),
        inputs,
        outputs,
      };
      const inst: CNode = {
        id: uid("cus_"),
        type: "CUSTOM",
        x: snap(minX),
        y: snap(minY),
        rot: 0,
        inputs: inputs.length,
        defId: def.id,
      };
      commit(
        (doc0) => ({
          defs: [...doc0.defs, def],
          nodes: [...doc0.nodes.filter((n) => !selection.includes(n.id)), inst],
          wires: doc0.wires.filter((w) => !(selection.includes(w.from.node) || selection.includes(w.to.node))),
          name: doc0.name,
        }),
        "pack component",
      );
      setSelection([inst.id]);
    },
    [selection, commit],
  );

  const reset = useCallback(() => {
    commit(() => emptyDoc(), "new circuit");
    setSelection([]);
    setSelectedWires([]);
  }, [commit]);

  const load = useCallback(
    (d: Doc) => {
      commit(() => ensureLayers({ ...d, defs: d.defs ?? [] }), "load");
      setSelection([]);
      setSelectedWires([]);
    },
    [commit],
  );

  const persistList = (list: Project[], id: string) => {
    writeProjects(list);
    lsSet(LS_CURRENT, id);
    setProjects(list);
    setCurrentId(id);
  };

  const newFile = useCallback(() => {
    const id = uid("f");
    const doc0 = emptyDoc();
    const p: Project = { id, name: "Untitled", updatedAt: Date.now(), doc: doc0 };
    persistList([p, ...readProjects()], id);
    setDoc(doc0);
    setPast([]);
    setFuture([]);
    setSelection([]);
    setSelectedWires([]);
  }, []);

  const openFile = useCallback((id: string) => {
    const list = readProjects();
    const hit = list.find((p) => p.id === id);
    if (!hit) return;
    lsSet(LS_CURRENT, id);
    setCurrentId(id);
    setDoc(hit.doc);
    setPast([]);
    setFuture([]);
    setSelection([]);
    setSelectedWires([]);
  }, []);

  const saveAs = useCallback((name: string) => {
    const id = uid("f");
    const copyDoc = { ...docRef.current, name };
    const p: Project = { id, name, updatedAt: Date.now(), doc: copyDoc };
    persistList([p, ...readProjects()], id);
    setDoc(copyDoc);
  }, []);

  const renameFile = useCallback((name: string) => {
    setDoc((d) => ({ ...d, name }));
    setProjects((list) => {
      const next = list.map((p) => (p.id === currentRef.current ? { ...p, name, doc: { ...p.doc, name } } : p));
      writeProjects(next);
      return next;
    });
  }, []);

  const deleteFile = useCallback((id: string) => {
    const list = readProjects().filter((p) => p.id !== id);
    if (!list.length) {
      const nid = uid("f");
      const doc0 = emptyDoc();
      persistList([{ id: nid, name: "Untitled", updatedAt: Date.now(), doc: doc0 }], nid);
      setDoc(doc0);
      return;
    }
    const nextId = id === currentRef.current ? list[0].id : currentRef.current;
    persistList(list, nextId);
    const hit = list.find((p) => p.id === nextId)!;
    setDoc(hit.doc);
  }, []);

  const duplicateFile = useCallback(() => {
    const id = uid("f");
    const name = `${docRef.current.name || "Untitled"} copy`;
    const copyDoc = { ...docRef.current, name };
    persistList([{ id, name, updatedAt: Date.now(), doc: copyDoc }, ...readProjects()], id);
    setDoc(copyDoc);
  }, []);

  const metas = useMemo(
    () => projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
    [projects],
  );

  const ensuredDoc = ensureRegions(ensureLayers(doc));
  return useMemo(
    () => ({
      doc: ensuredDoc,
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
      activeLayerId: ensuredDoc.activeLayerId,
      layers: ensuredDoc.layers ?? [],
      flattenLayers: !!ensuredDoc.flattenLayers,
      setActiveLayer,
      addLayer,
      renameLayer,
      removeLayer,
      moveSelectionToLayer,
      toggleFlattenLayers,
      regions: ensuredDoc.regions ?? [],
      createRegion,
      updateRegion,
      deleteRegion,
      moveRegion,
      setExpected,
      copy,
      cut,
      paste,
      hasClipboard: clipRev >= 0 && !!clip.current,
      alignSelected,
      autoLayout,
      convertToText,
      convertTextToComponent,
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
      ready,
    }),
    [
      ensuredDoc, selection, selectedWires, commit, live, pushHistory, undo, redo, past, future,
      addNode, deleteSelected, duplicateSelected, rotateSelected, nudge, toggleLock, setActiveLayer, addLayer, renameLayer, removeLayer, moveSelectionToLayer, toggleFlattenLayers, createRegion, updateRegion, deleteRegion, moveRegion, setExpected, copy, cut, paste,
      clipRev, alignSelected, autoLayout, convertToText, convertTextToComponent, connect, makeCustom, reset, load, metas, currentId, projects,
      newFile, openFile, saveAs, renameFile, deleteFile, duplicateFile, ready,
    ],
  );
}

export { isGate };

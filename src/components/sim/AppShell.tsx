import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, PanelLeft, PanelRight } from "lucide-react";
import { Toaster, toast } from "sonner";
import Canvas from "./Canvas";
import Inspector from "./Inspector";
import Library from "./Library";
import Toolbar from "./Toolbar";
import Waveform, { type Probe } from "./Waveform";
import { FileDialog, FileMenu, HdlDialog, ShortcutsModal, importAnyFile, importHdlFile, importJsonFile } from "./Overlays";
import {
  type SimResult,
  type Val,
  GRID,
  inKey,
  nodeSize,
  nodeTitle,
  outKey,
  portCounts,
  topologyKey,
} from "@/lib/sim/circuit";
import AIChatWindow from "./AIChatWindow";
import { installAIBridge } from "@/lib/sim/aiBridge";
import { loadSessions } from "@/lib/ai/memory";
import { loadPrefs, savePrefs, useEditor } from "@/lib/sim/store";
import { THEMES, applyTheme } from "@/lib/sim/themes";
import {
  createEngine,
  pokeNow,
  resetEngine,
  stepTime,
  type TimedEngine,
  type TimingMode,
  type WaveSample,
} from "@/lib/sim/timedSimulationEngine";
import { useViewport } from "@/lib/sim/viewport";

export default function AppShell() {
  const ed = useEditor();
  const prefs0 = useMemo(() => loadPrefs(), []);
  const [themeId, setThemeId] = useState(prefs0.themeId);
  const { view, setView, startInertia, stopInertia } = useViewport();
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [wireStyle, setWireStyle] = useState<"curve" | "ortho">(prefs0.wireStyle);
  const [snapOn, setSnapOn] = useState(prefs0.snapOn);
  const [wheelZoom, setWheelZoom] = useState(prefs0.wheelZoom);
  const [reduceGlow, setReduceGlow] = useState(prefs0.reduceGlow);
  const [glossy, setGlossy] = useState(prefs0.glossy);
  const [timingMode, setTimingMode] = useState<TimingMode>(prefs0.timingMode);
  const [leftOpen, setLeftOpen] = useState(prefs0.leftOpen);
  const [rightOpen, setRightOpen] = useState(prefs0.rightOpen);
  const [waveOpen, setWaveOpen] = useState(prefs0.waveformOpen);
  const [spacePan, setSpacePan] = useState(false);
  const [help, setHelp] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [hdlOpen, setHdlOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [showDepthHint, setShowDepthHint] = useState(() => {
    try { return localStorage.getItem("logicforge.hideDepthHint") !== "1"; } catch { return true; }
  });
  const centerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hdlFileRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<TimedEngine | null>(null);
  // AI Chat windows — floating at top, multiple instances, memory persisted
  const [aiWindows, setAiWindows] = useState<{ id: string; nodeId?: string }[]>(() => {
    try {
      const saved = loadSessions();
      // start empty; sessions are loaded inside each window, but keep windows empty initially
      return [];
    } catch { return []; }
  });
  const openAIChat = useCallback((nodeId?: unknown) => {
    const safe = typeof nodeId === "string" && nodeId.length < 80 ? nodeId : undefined;
    const nid = `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
    setAiWindows((prev) => [...prev, { id: nid, nodeId: safe }]);
  }, []);
  const closeAIChat = useCallback((wid: string) => {
    setAiWindows((prev) => prev.filter((w) => w.id !== wid));
  }, []);
  const topoRef = useRef("");
  const [sim, setSim] = useState<SimResult | null>(null);
  const [wave, setWave] = useState<WaveSample[]>([]);
  const edRef = useRef(ed);
  edRef.current = ed;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
    applyTheme(t);
  }, [themeId]);

  useEffect(() => {
    savePrefs({
      themeId, wireStyle, snapOn, wheelZoom, waveformOpen: waveOpen, timingMode, leftOpen, rightOpen, reduceGlow, glossy,
    });
  }, [themeId, wireStyle, snapOn, wheelZoom, waveOpen, timingMode, leftOpen, rightOpen, reduceGlow, glossy]);

  useEffect(() => {
    if (showDepthHint) {
      const tid = setTimeout(() => setShowDepthHint(false), 9000);
      return () => clearTimeout(tid);
    }
  }, [showDepthHint]);

  useEffect(() => {
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

  const sourceValues = useCallback(() => {
    const m = new Map<string, Val>();
    for (const n of edRef.current.doc.nodes) {
      if (n.type === "INPUT") m.set(n.id, (n.value ?? 0) as Val);
    }
    return m;
  }, []);

  const watchKeys = useCallback(() => {
    const keys: string[] = [];
    for (const n of edRef.current.doc.nodes) {
      if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "OUTPUT" || n.type === "LED" || n.watch) {
        const { outs } = portCounts(n, edRef.current.doc.defs);
        if (n.type === "OUTPUT" || n.type === "LED") keys.push(inKey(n.id, 0));
        else if (outs) {
          for (let i = 0; i < Math.max(1, outs); i++) keys.push(outKey(n.id, i));
        }
      }
    }
    return keys;
  }, []);

  const probes: Probe[] = useMemo(() => {
    const list: Probe[] = [];
    for (const n of ed.doc.nodes) {
      if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "OUTPUT" || n.type === "LED" || n.watch) {
        const { outs } = portCounts(n, ed.doc.defs);
        if (n.type === "OUTPUT" || n.type === "LED") {
          list.push({ key: inKey(n.id, 0), name: nodeTitle(n, ed.doc.defs) });
        } else {
          for (let i = 0; i < Math.max(1, outs); i++) {
            list.push({
              key: outKey(n.id, i),
              name: outs > 1 ? `${nodeTitle(n, ed.doc.defs)}.${i}` : nodeTitle(n, ed.doc.defs),
            });
          }
        }
      }
    }
    return list;
  }, [ed.doc]);

  const topo = useMemo(() => topologyKey(ed.doc), [ed.doc]);
  const srcKey = useMemo(
    () =>
      ed.doc.nodes
        .map((n) => `${n.id}:${n.value ?? ""}:${n.period ?? ""}:${n.watch ? 1 : 0}:${n.delay ?? ""}:${n.bits ?? ""}`)
        .join("|"),
    [ed.doc.nodes],
  );

  const refresh = useCallback((eng: TimedEngine) => {
    setSim(eng.last);
    setWave([...eng.wave]);
  }, []);

  // Install AI disclosure bridge (exposes /api/ai/snapshot, /api/ai/chat via window.fetch patch + window.logicforgeAI)
  useEffect(() => {
    if (!ed.ready) return;
    try { installAIBridge(ed as any, () => engineRef.current?.last ?? null, () => view); } catch {}
  }, [ed, ed.ready, view]);

  const ensureEngine = useCallback(() => {
    const d = edRef.current.doc;
    const key = topologyKey(d);
    if (!engineRef.current || topoRef.current !== key) {
      engineRef.current = createEngine(d, d.defs);
      topoRef.current = key;
      pokeNow(d, d.defs, engineRef.current, sourceValues(), timingMode, watchKeys());
    }
    return engineRef.current;
  }, [sourceValues, timingMode, watchKeys]);

  useEffect(() => {
    engineRef.current = null;
    topoRef.current = "";
  }, [timingMode]);

  useEffect(() => {
    if (!ed.ready) return;
    const d = edRef.current.doc;
    const eng = ensureEngine();
    pokeNow(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
    refresh(eng);
  }, [ed.ready, topo, srcKey, timingMode, ensureEngine, sourceValues, watchKeys, refresh]);

  const hasClock = useMemo(() => ed.doc.nodes.some((n) => n.type === "CLOCK"), [ed.doc.nodes]);

  useEffect(() => {
    if (!running) return;
    if (!hasClock && timingMode === "zero") return;
    const iv = setInterval(() => {
      const d = edRef.current.doc;
      const eng = ensureEngine();
      stepTime(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
      refresh(eng);
    }, Math.max(32, 480 / speed));
    return () => clearInterval(iv);
  }, [running, speed, hasClock, timingMode, ensureEngine, sourceValues, watchKeys, refresh]);

  const toggleSwitch = useCallback(
    (id: string) => {
      const n = ed.doc.nodes.find((x) => x.id === id);
      if (!n) return;
      if (n.type === "INPUT") {
        ed.commit(
          (d) => ({
            ...d,
            nodes: d.nodes.map((x) => (x.id === id ? { ...x, value: x.value === 1 ? 0 : 1 } : x)),
          }),
          "toggle",
        );
      } else if (n.type === "CLOCK") setRunning((r) => !r);
    },
    [ed],
  );

  const centerWorld = useCallback(() => {
    const r = centerRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (r.width / 2 - view.x) / view.z, y: (r.height / 2 - view.y) / view.z };
  }, [view]);

  const fit = useCallback(() => {
    const r = centerRef.current?.getBoundingClientRect();
    if (!r || !ed.doc.nodes.length) {
      setView({ x: 60, y: 40, z: 1 });
      return;
    }
    const target = ed.selection.length
      ? ed.doc.nodes.filter((n) => ed.selection.includes(n.id))
      : ed.doc.nodes;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of target) {
      const { w, h } = nodeSize(n, ed.doc.defs);
      x1 = Math.min(x1, n.x - 40);
      y1 = Math.min(y1, n.y - 40);
      x2 = Math.max(x2, n.x + w + 40);
      y2 = Math.max(y2, n.y + h + 40);
    }
    const z = Math.min(2.4, Math.max(0.2, Math.min((r.width - 32) / (x2 - x1), (r.height - 32) / (y2 - y1))));
    setView({ z, x: r.width / 2 - ((x1 + x2) / 2) * z, y: r.height / 2 - ((y1 + y2) / 2) * z });
  }, [ed.doc, ed.selection, setView]);

  const step = useCallback(() => {
    const d = edRef.current.doc;
    const eng = ensureEngine();
    stepTime(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
    refresh(eng);
  }, [ensureEngine, sourceValues, timingMode, watchKeys, refresh]);

  const resetSim = useCallback(() => {
    const d = edRef.current.doc;
    const eng = ensureEngine();
    resetEngine(d, d.defs, eng, sourceValues(), timingMode, watchKeys());
    refresh(eng);
    setRunning(false);
  }, [ensureEngine, sourceValues, timingMode, watchKeys, refresh]);

  useEffect(() => {
    const isField = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      if (isField(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePan(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        const isFieldT = !!tag && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable);
        if (!isFieldT) {
          e.preventDefault();
          // Open AI chat floating at top — T triggers a new window or ensures one is visible
          setAiWindows((prev) => prev.length ? prev : [{ id: `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2,4)}`, nodeId: undefined }]);
          return;
        }
      }
      if (isField(e.target)) return;
      const api = edRef.current;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
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
        import("@/lib/sim/circuitHdlConverter").then(({ downloadJsonFile: downloadJson }) => {
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
      }
      else if (e.key.toLowerCase() === "p" && !mod) {
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
      } else if (e.key === "1" && !mod) {
        setView((v) => {
          const r = centerRef.current?.getBoundingClientRect();
          if (!r) return { ...v, z: 1 };
          const cx = r.width / 2;
          const cy = r.height / 2;
          const k = 1 / v.z;
          return { z: 1, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
        });
      } else if (e.key === "Escape") {
        api.setSelection([]);
        api.setSelectedWires([]);
        setHelp(false);
        setFilesOpen(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        api.nudge(e.shiftKey ? -GRID * 5 : -GRID, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        api.nudge(e.shiftKey ? GRID * 5 : GRID, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        api.nudge(0, e.shiftKey ? -GRID * 5 : -GRID);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        api.nudge(0, e.shiftKey ? GRID * 5 : GRID);
      } else if (!mod && (e.key.toLowerCase() === "w" || e.key.toLowerCase() === "a" || e.key.toLowerCase() === "s" || e.key.toLowerCase() === "d")) {
        e.preventDefault();
        const k = e.key.toLowerCase();
        const speed = e.shiftKey ? 9 : 5;
        // Smooth WASD: apply impulse via inertia system so it eases, not jolts
        const vx = k === "a" ? speed * 14 : k === "d" ? -speed * 14 : 0;
        const vy = k === "w" ? speed * 14 : k === "s" ? -speed * 14 : 0;
        setView((v) => ({ ...v, x: v.x + vx * 0.65, y: v.y + vy * 0.65 }));
        startInertia(vx * 0.52, vy * 0.52);
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
  }, [fit, step, setView, aiWindows, openAIChat]);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const live = sim;

  if (!ed.ready) {
    return (
      <div className="grid h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="ui-kicker">Loading workspace</div>
      </div>
    );
  }

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden font-sans text-[var(--text)]"
      style={{ background: "var(--bg)" }}
    >
      <Toaster theme={theme.dark ? "dark" : "light"} position="bottom-right" />
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)]/85 px-2 sm:px-3 backdrop-blur-xl" style={{ backdropFilter: "blur(16px) saturate(1.15)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" } as any}>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: "var(--accent)" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="var(--accent-fg)" strokeWidth={2.2} strokeLinecap="round">
              <path d="M4 8h5l3 8h5" />
              <circle cx="12" cy="12" r="1.6" fill="var(--accent-fg)" stroke="none" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold tracking-tight">LogicForge</div>
            <div className="hidden text-micro uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
              {ed.fileName}
            </div>
          </div>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />
        <FileMenu ed={ed} onOpenFiles={() => setFilesOpen(true)} fileRef={fileRef} hdlFileRef={hdlFileRef} onOpenHdl={() => setHdlOpen(true)} />
        <button type="button" className="ui-btn-ghost hidden sm:inline-flex" onClick={() => setHdlOpen(true)} title="Circuit ↔ HDL">
          HDL
        </button>
        <button type="button" className="ui-btn-ghost" onClick={() => setHelp(true)}>
          Shortcuts
        </button>
        <button type="button" className="ui-btn-ghost hidden sm:inline-flex items-center gap-1" onClick={() => openAIChat()} title="AI Chat (T) — right-click component to ask about it">
          <span>AI</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importAnyFile(f, ed.load);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={hdlFileRef}
          type="file"
          accept=".v,.vhd,.vhdl,.sv,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importHdlFile(f, ed.load);
            e.currentTarget.value = "";
          }}
        />

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className={`ui-btn-ghost ${leftOpen ? "text-[var(--accent)]" : ""}`} onClick={() => setLeftOpen(!leftOpen)} title="Library">
            <PanelLeft className="size-3.5" />
          </button>
          <button type="button" className={`ui-btn-ghost ${waveOpen ? "text-[var(--accent)]" : ""}`} onClick={() => setWaveOpen(!waveOpen)} title="Waveform">
            <Activity className="size-3.5" />
          </button>
          <button type="button" className={`ui-btn-ghost ${rightOpen ? "text-[var(--accent)]" : ""}`} onClick={() => setRightOpen(!rightOpen)} title="Inspector">
            <PanelRight className="size-3.5" />
          </button>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="h-8 max-w-28 rounded-lg border border-[var(--border)] bg-[var(--panel2)] px-2 text-xs text-[var(--text)] outline-none"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <style>{`@keyframes panelIn{0%{opacity:0;transform:translateX(-8px);filter:blur(8px)}100%{opacity:1;transform:translateX(0);filter:blur(0)}} @keyframes panelInR{0%{opacity:0;transform:translateX(8px);filter:blur(8px)}100%{opacity:1;transform:translateX(0);filter:blur(0)}}`}</style>
      <div className="flex min-h-0 flex-1">
        {leftOpen && (
          <aside className={`${narrow ? "absolute inset-y-12 left-0 z-30 w-[min(18rem,90vw)] shadow-[var(--shadow)]" : "w-56"} shrink-0 border-r border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-xl animate-[panelIn_280ms_cubic-bezier(.2,.8,.2,1)]`} style={{ backdropFilter: "blur(18px) saturate(1.15)" } as any}>
            <Library ed={ed} centerWorld={centerWorld} />
          </aside>
        )}

        <main ref={centerRef} className="relative min-w-0 flex-1">
          {live && (
            <Canvas
              ed={ed}
              sim={live}
              view={view}
              setView={setView}
              startInertia={startInertia}
              stopInertia={stopInertia}
              running={running}
              wireStyle={wireStyle}
              snapOn={snapOn}
              wheelZoom={wheelZoom}
              spacePan={spacePan}
              reduceGlow={reduceGlow}
              glossy={glossy}
              onToggleSwitch={toggleSwitch}
              onCursor={setCursor}
              fit={fit}
              onOpenAI={openAIChat}
            />
          )}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 text-micro">
            <Badge>{ed.selection.length ? `${ed.selection.length} selected` : "no selection"}</Badge>
            {live && !live.stable && <Badge warn>oscillation</Badge>}
            {live && !!live.floating.length && (
              <Badge
                warn
                onClick={() => {
                  const ids = Array.from(new Set(live.floating.map((k) => k.split(":")[0])));
                  ed.setSelection(ids);
                  ed.setSelectedWires([]);
                }}
              >
                {live.floating.length} floating · locate
              </Badge>
            )}
            {live && !!live.contention.length && <Badge warn>bus fight</Badge>}
            {cursor && (
              <Badge>
                Cursor {Math.round(cursor.x)},{Math.round(cursor.y)}
              </Badge>
            )}
            {/* Split rather than merged ("zero delay · curve") — these are
                two unrelated settings (the simulation model and the wire
                rendering style) and reporting them as one string made it
                unclear which word referred to which. */}
            <Badge>Sim: {timingMode === "unit" ? "unit delay" : "zero delay"}</Badge>
            <Badge>Wires: {wireStyle === "ortho" ? "ortho" : "curve"}</Badge>
          </div>
        </main>

        {rightOpen && (
          <aside className={`${narrow ? "absolute inset-y-12 right-0 z-30 w-[min(20rem,92vw)] shadow-[var(--shadow)]" : "w-72"} shrink-0 border-l border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-xl animate-[panelIn_280ms_cubic-bezier(.2,.8,.2,1)]`} style={{ backdropFilter: "blur(18px) saturate(1.15)" } as any}>
            {live && <Inspector ed={ed} sim={live} />}
          </aside>
        )}
      </div>

      {/* Compact depth hint — dismissible, not obstructing canvas. Auto-hides after 9s. */}
      {showDepthHint && (
        <div className="pointer-events-auto fixed bottom-3 left-1/2 z-30 w-[min(560px,92vw)] -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--panel)]/88 px-3 py-2 shadow-[var(--shadow)] backdrop-blur-xl animate-[hintIn_420ms_cubic-bezier(.2,.8,.2,1)]" style={{ backdropFilter: "blur(16px) saturate(1.15)" } as any}>
          <div className="flex items-center gap-2.5 text-micro">
            <span className="hidden h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)] sm:grid">◈</span>
            <span className="flex-1 leading-none tracking-wide text-[var(--muted)]"><b className="text-[var(--text)]">Painterly depth</b> <span className="hidden sm:inline">— wheel scrolls page, slide vertically on canvas to travel layers (blurry→clear)</span><span className="sm:hidden">— slide on canvas to switch layers</span></span>
            <button type="button" onClick={() => { setShowDepthHint(false); try{ localStorage.setItem("logicforge.hideDepthHint","1"); }catch{} }} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]">×</button>
          </div>
        </div>
      )}
      <style>{`@keyframes hintIn{0%{opacity:0;transform:translate(-50%,8px) scale(.98);filter:blur(8px)}100%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}}`}</style>

      {waveOpen && live && (
        <div className="h-40 shrink-0 sm:h-44">
          <Waveform
            wave={wave}
            probes={probes}
            time={live.time}
            onClose={() => setWaveOpen(false)}
            onClear={() => {
              const eng = engineRef.current;
              if (eng) {
                eng.wave = [];
                setWave([]);
              }
            }}
            onSelect={(id) => {
              ed.setSelection([id]);
              ed.setSelectedWires([]);
            }}
          />
        </div>
      )}

      {live && (
        <Toolbar
          ed={ed}
          sim={live}
          running={running}
          setRunning={setRunning}
          step={step}
          resetSim={resetSim}
          tick={live.time}
          speed={speed}
          setSpeed={setSpeed}
          view={view}
          setView={setView}
          fit={fit}
          wireStyle={wireStyle}
          setWireStyle={setWireStyle}
          snapOn={snapOn}
          setSnapOn={setSnapOn}
          timingMode={timingMode}
          setTimingMode={setTimingMode}
          wheelZoom={wheelZoom}
          setWheelZoom={setWheelZoom}
          reduceGlow={reduceGlow}
          setReduceGlow={setReduceGlow}
          glossy={glossy}
          setGlossy={setGlossy}
        />
      )}

      {/* AI Chat windows — floating at top, multiple, memory, workflow, T to open, right-click component */}
      {live && aiWindows.map((w) => (
        <AIChatWindow
          key={w.id}
          id={w.id}
          ed={ed}
          sim={live}
          view={view}
          setView={setView}
          initialNodeId={w.nodeId}
          onClose={closeAIChat}
          onNewChat={() => openAIChat()}
        />
      ))}
      {/* Floating AI open button when no chat window — quick T hint */}
      {live && aiWindows.length === 0 && (
        <button
          type="button"
          onClick={() => openAIChat()}
          className="fixed left-1/2 top-[68px] z-30 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-1.5 text-micro font-bold shadow-[var(--shadow)] backdrop-blur-xl hover:bg-[var(--panel)]"
          title="Open AI Chat (T)"
        >
          <span className="inline-flex items-center gap-1.5">🤖 AI Chat <span className="rounded bg-[var(--panel2)] px-1 py-0.5 text-[10px] leading-none">T</span></span>
        </button>
      )}
      <ShortcutsModal open={help} onClose={() => setHelp(false)} />
      <FileDialog open={filesOpen} ed={ed} onClose={() => setFilesOpen(false)} />
      <HdlDialog open={hdlOpen} ed={ed} onClose={() => setHdlOpen(false)} />
    </div>
  );
}

function Badge({ children, warn, onClick }: { children: React.ReactNode; warn?: boolean; onClick?: () => void }) {
  const style = {
    borderColor: warn ? "var(--xx)" : "var(--border)",
    color: warn ? "var(--xx)" : "var(--muted)",
    background: "color-mix(in srgb, var(--panel) 75%, transparent)",
  };
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto rounded-md border px-2 py-1 font-semibold backdrop-blur transition hover:brightness-125"
        style={style}
      >
        {children}
      </button>
    );
  }
  return (
    <span className="rounded-md border px-2 py-1 font-semibold backdrop-blur" style={style}>
      {children}
    </span>
  );
}

import {
  Copy,
  Layers,
  Magnet,
  Maximize2,
  Pause,
  Play,
  Redo2,
  RotateCw,
  SkipForward,
  Spline,
  Trash2,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type SimResult } from "@/lib/sim/circuit";
import { type EditorAPI } from "@/lib/sim/store";
import { type TimingMode } from "@/lib/sim/timedSimulationEngine";
import { type View, clampZ } from "@/lib/sim/viewport";

interface Props {
  ed: EditorAPI;
  sim: SimResult;
  running: boolean;
  setRunning: (v: boolean) => void;
  step: () => void;
  resetSim: () => void;
  tick: number;
  speed: number;
  setSpeed: (n: number) => void;
  view: View;
  setView: (u: View | ((v: View) => View)) => void;
  fit: () => void;
  wireStyle: "curve" | "ortho";
  setWireStyle: (v: "curve" | "ortho") => void;
  snapOn: boolean;
  setSnapOn: (v: boolean) => void;
  timingMode: TimingMode;
  setTimingMode: (m: TimingMode) => void;
  wheelZoom: boolean;
  setWheelZoom: (v: boolean) => void;
  reduceGlow: boolean;
  setReduceGlow: (v: boolean) => void;
  glossy: boolean;
  setGlossy: (v: boolean) => void;
}

function B({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 disabled:opacity-30 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
          : "border-[var(--border)] bg-[var(--panel2)] text-[var(--text)] hover:border-[var(--accent)]"
      }`}
    >
      {children}
    </button>
  );
}

const Div = () => <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />;

export default function Toolbar(p: Props) {
  const { ed, sim } = p;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] bg-[var(--panel)]/88 px-3 py-2 backdrop-blur-xl" style={{ backdropFilter: "blur(16px) saturate(1.15)", boxShadow: "0 -8px 32px rgba(0,0,0,0.08)" } as any}>
      <B onClick={() => p.setRunning(!p.running)} active={p.running} title="Run / pause (P)">
        {p.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        <span className="hidden sm:inline">{p.running ? "Pause" : "Run"}</span>
      </B>
      <B onClick={p.step} title="Step one tick (.)">
        <SkipForward className="size-3.5" />
        <span className="hidden md:inline">Step</span>
      </B>
      <B onClick={p.resetSim} title="Reset simulation">
        Reset
      </B>
      <div className="flex items-center gap-1.5 px-1">
        <span className="hidden text-micro uppercase tracking-wider text-[var(--muted)] sm:inline">Speed</span>
        <input
          type="range"
          min={1}
          max={20}
          value={p.speed}
          onChange={(e) => p.setSpeed(+e.target.value)}
          className="h-1 w-16 accent-[var(--accent)] sm:w-20"
        />
      </div>
      <B onClick={() => p.setTimingMode(p.timingMode === "zero" ? "unit" : "zero")} active={p.timingMode === "unit"} title="Unit-delay propagation">
        Δt
      </B>

      <Div />
      <B onClick={ed.undo} disabled={!ed.canUndo} title={ed.undoLabel ? `Undo ${ed.undoLabel}` : "Undo"}>
        <Undo2 className="size-3.5" />
      </B>
      <B onClick={ed.redo} disabled={!ed.canRedo} title={ed.redoLabel ? `Redo ${ed.redoLabel}` : "Redo"}>
        <Redo2 className="size-3.5" />
      </B>
      <B onClick={() => ed.duplicateSelected()} disabled={!ed.selection.length} title="Duplicate">
        <Copy className="size-3.5" />
      </B>
      <B onClick={ed.rotateSelected} disabled={!ed.selection.length} title="Rotate">
        <RotateCw className="size-3.5" />
      </B>
      <B onClick={ed.deleteSelected} disabled={!ed.selection.length && !ed.selectedWires.length} title="Delete">
        <Trash2 className="size-3.5" />
      </B>

      <Div />
      <B
        onClick={() => ed.autoLayout()}
        disabled={!ed.doc.nodes.length}
        title="Auto layout (Signal flow) — Logic layer distribution, minimize wire crossing"
      >
        <Wand2 className="size-3.5" />
        <span className="hidden sm:inline">Auto layout</span>
      </B>
      <B onClick={() => p.setSnapOn(!p.snapOn)} active={p.snapOn} title="Snap to grid">
        <Magnet className="size-3.5" />
      </B>
      <B onClick={() => p.setWireStyle(p.wireStyle === "curve" ? "ortho" : "curve")} title="Wire routing">
        <Spline className="size-3.5" />
        <span className="hidden lg:inline">{p.wireStyle === "curve" ? "Curve" : "Ortho"}</span>
      </B>
      <B onClick={() => p.setWheelZoom(!p.wheelZoom)} active={p.wheelZoom} title="Mouse wheel zooms">
        Wheel z
      </B>
      <B
        onClick={() => p.setReduceGlow(!p.reduceGlow)}
        active={p.reduceGlow}
        title="Turn off glow/shadow effects — helps performance and clarity on dense circuits"
      >
        <span className="lg:hidden">Glow</span>
        <span className="hidden lg:inline">{p.reduceGlow ? "Glow off" : "Glow on"}</span>
      </B>
      <B
        onClick={() => p.setGlossy(!p.glossy)}
        active={p.glossy}
        title="Glossy bevel/highlight look on components — off is flat"
      >
        <span className="lg:hidden">Gloss</span>
        <span className="hidden lg:inline">{p.glossy ? "Glossy" : "Flat"}</span>
      </B>

      <Div />
      {/* Second/third-level View menu — layered with backdrop-blur (Apple continuity) */}
      <div className="hidden sm:flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel2)]/70 px-1 py-1 backdrop-blur-xl" style={{ backdropFilter: "blur(10px)" } as any}>
        <B onClick={() => p.setView((v) => ({ ...v, z: clampZ(v.z / 1.2) }))} title="Zoom out">
          <ZoomOut className="size-3.5" />
        </B>
        <span className="w-10 text-center text-micro font-semibold tabular-nums text-[var(--muted)]">
          {Math.round(p.view.z * 100)}%
        </span>
        <B onClick={() => p.setView((v) => ({ ...v, z: clampZ(v.z * 1.2) }))} title="Zoom in">
          <ZoomIn className="size-3.5" />
        </B>
        <B onClick={p.fit} title="Fit (0 / F / double-click)">
          <Maximize2 className="size-3.5" />
        </B>
      </div>
      {/* Layer continuity controls — blurred → clear, 3D connectivity */}
      <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)]/85 px-1.5 py-1 shadow-sm backdrop-blur-xl" style={{ backdropFilter: "blur(12px)" } as any}>
        <Layers className="ml-1 size-3.5 text-[var(--muted)]" />
        <span className="hidden px-1 text-micro font-bold uppercase tracking-wider text-[var(--muted)] lg:inline">Depth</span>
        <button
          type="button"
          onClick={() => (p.ed as any).toggleFlattenLayers?.()}
          className={`rounded-full px-2.5 py-1 text-micro font-bold transition-all ${ (p.ed as any).flattenLayers ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]"}`}
          title={(p.ed as any).flattenLayers ? "Flattened — single plane (click for 3D)" : "3D layers — click to flatten"}
        >
          {(p.ed as any).flattenLayers ? "Flat" : "3D"}
        </button>
        <div className="hidden items-center gap-1 lg:flex">
          {((p.ed as any).layers ?? []).map((ly:any)=> (
            <button
              key={ly.id}
              type="button"
              onClick={()=> (p.ed as any).setActiveLayer?.(ly.id)}
              className={`h-6 rounded-full px-2 text-micro font-semibold transition-all duration-700 ${ (p.ed as any).activeLayerId===ly.id ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow" : "bg-[var(--panel2)] text-[var(--muted)] hover:bg-[var(--panel)]"}`}
              style={{ borderLeft: `3px solid ${ly.color}` }}
            >
              {ly.name}
            </button>
          ))}
          <button type="button" onClick={()=> (p.ed as any).addLayer?.()} className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]" title="Add layer">+</button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 pr-1 text-micro uppercase tracking-wider text-[var(--muted)]">
        <span className="hidden sm:inline">
          t <b className="tabular-nums text-[var(--text)]">{p.tick}</b>
        </span>
        <span>
          nodes <b className="tabular-nums text-[var(--text)]">{ed.doc.nodes.length}</b>
        </span>
        <span className="hidden md:inline">
          nets <b className="tabular-nums text-[var(--text)]">{ed.doc.wires.length}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full" style={{ background: sim.stable ? "var(--hi)" : "var(--xx)" }} />
          {sim.stable ? "stable" : "unstable"}
        </span>
      </div>
    </div>
  );
}

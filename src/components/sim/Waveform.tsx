import { useEffect, useMemo, useRef, useState } from "react";
import { type Val } from "@/lib/sim/circuit";
import { type WaveSample } from "@/lib/sim/timed";

export interface Probe {
  key: string;
  name: string;
}

interface Props {
  wave: WaveSample[];
  probes: Probe[];
  time: number;
  onClose: () => void;
  onClear: () => void;
  /** Clicking a probe's name selects its underlying node on the canvas too. */
  onSelect?: (nodeId: string) => void;
}

const col = (v: Val) =>
  v === 1 ? "var(--hi)" : v === 0 ? "var(--lo)" : v === "Z" ? "var(--zz)" : "var(--xx)";

export default function Waveform({ wave, probes, time, onClose, onClear, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [span, setSpan] = useState(160);
  const [follow, setFollow] = useState(true);

  const start = useMemo(() => {
    if (!wave.length) return 0;
    const last = wave[wave.length - 1].t;
    if (follow) return Math.max(0, last - span + 1);
    return Math.max(0, (cursor ?? last) - Math.floor(span / 2));
  }, [wave, span, follow, cursor]);

  // Per-probe (t, v) tracks, built once per `wave`/`probes` change instead of being
  // rescanned from the start of history for every pixel column of every probe.
  // Rendering then does a binary search for "largest sample.t <= target" per lookup,
  // which keeps a redraw O(probes × pixels × log(waveSamples)) instead of
  // O(probes × pixels × waveSamples) — the latter gets slow once a simulation has
  // been running for a while and `wave` grows long.
  const tracks = useMemo(() => {
    const m = new Map<string, { t: number; v: Val }[]>();
    for (const p of probes) m.set(p.key, []);
    for (const s of wave) {
      for (const p of probes) {
        const v = s.vals[p.key];
        if (v === undefined) continue;
        const arr = m.get(p.key)!;
        if (arr.length && arr[arr.length - 1].t === s.t) arr[arr.length - 1].v = v;
        else arr.push({ t: s.t, v });
      }
    }
    return m;
  }, [wave, probes]);

  // Largest-index entry with entry.t <= t, i.e. "value in effect at time t".
  const sampleAt = useMemo(
    () =>
      (key: string, t: number): Val => {
        const arr = tracks.get(key);
        if (!arr || !arr.length) return "X";
        let lo = 0;
        let hi = arr.length - 1;
        if (t < arr[0].t) return "X";
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (arr[mid].t <= t) lo = mid;
          else hi = mid - 1;
        }
        return arr[lo].v;
      },
    [tracks],
  );

  useEffect(() => {
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
      let prev: Val = sampleAt(p.key, start);
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
        } else {
          ctx.moveTo(x0, yCur);
        }
        ctx.lineTo(x0 + px + 0.4, yCur);
        if (v === "X") {
          ctx.setLineDash([3, 3]);
        } else if (v === "Z") {
          ctx.setLineDash([1, 4]);
        } else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
        prev = v;
      }
    });

    const curT = cursor ?? time;
    const cx = (curT - start) * px;
    ctx.beginPath();
    ctx.strokeStyle = "var(--accent)";
    ctx.lineWidth = 1;
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
  }, [wave, probes, start, span, cursor, time, sampleAt]);

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      setFollow(false);
      setSpan((s) => Math.min(640, Math.max(24, Math.round(s * (e.deltaY > 0 ? 1.12 : 0.88)))));
    } else {
      setFollow(false);
      setCursor((c) => Math.max(0, (c ?? time) + Math.round(e.deltaX / 8)));
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left;
    const t = start + Math.round((x / r.width) * span);
    setFollow(false);
    setCursor(t);
  };

  const cur = cursor ?? time;
  const readout = (key: string) => sampleAt(key, cur);

  return (
    <div className="flex h-full flex-col border-t border-[var(--border)] bg-[var(--panel)]">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <span className="ui-kicker">Waveform</span>
        <span className="text-xs tabular-nums text-[var(--muted)]">t={time}</span>
        {cursor != null && <span className="text-xs tabular-nums text-[var(--accent)]">cursor {cursor}</span>}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          follow
        </label>
        <button type="button" className="ui-btn-ghost ml-auto" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="ui-btn-ghost" onClick={onClose} aria-label="Close waveform">
          Close
        </button>
      </div>
      {!probes.length && (
        <div className="px-3 pb-3 text-xs text-[var(--muted)]">Pin a node in the inspector or select I/O to plot traces.</div>
      )}
      {!!probes.length && (
        <div className="flex min-h-0 flex-1">
          <ul className="w-28 shrink-0 overflow-y-auto border-r border-[var(--border)]">
            {probes.map((p) => (
              <li key={p.key} className="flex h-7 items-center justify-between px-2 text-xs">
                <button
                  type="button"
                  className="truncate text-left text-[var(--text)] hover:text-[var(--accent)]"
                  title="Select on canvas"
                  onClick={() => onSelect?.(p.key.split(":")[0])}
                >
                  {p.name}
                </button>
                <span className="tabular-nums" style={{ color: col(readout(p.key)) }}>
                  {readout(p.key)}
                </span>
              </li>
            ))}
          </ul>
          <div ref={wrapRef} className="min-w-0 flex-1 overflow-hidden" onWheel={onWheel} onClick={onClick}>
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      )}
    </div>
  );
}

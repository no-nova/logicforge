import { useMemo, useState } from "react";
import {
  type CNode,
  type SimResult,
  type Val,
  CATALOG,
  GATE_INFO,
  type GateType,
  circuitTruthTable,
  gateTruthTable,
  inKey,
  isGate,
  nodeTitle,
  outKey,
  specOf,
} from "@/lib/sim/circuit";
import { type EditorAPI } from "@/lib/sim/store";
import { clockDomains, criticalPath, inspectCircuit } from "@/lib/sim/inspect";
import { emitVerilog } from "@/lib/sim/hdl";

const chip = (v: Val) =>
  v === 1
    ? "text-[var(--hi)] ring-[var(--hi)]/40 bg-[var(--hi)]/10"
    : v === 0
      ? "text-[var(--muted)] ring-[var(--border)] bg-[var(--panel2)]"
      : v === "Z"
        ? "text-[var(--zz)] ring-[var(--zz)]/40 bg-[var(--zz)]/10"
        : "text-[var(--xx)] ring-[var(--xx)]/40 bg-[var(--xx)]/10";

function ValChip({ v }: { v: Val }) {
  return (
    <span className={`inline-grid h-5 min-w-5 place-items-center rounded px-1 text-micro font-bold ring-1 ${chip(v)}`}>
      {v}
    </span>
  );
}

export default function Inspector({ ed, sim }: { ed: EditorAPI; sim: SimResult }) {
  const [tab, setTab] = useState<"props" | "truth" | "timing" | "lint">("props");
  const [packName, setPackName] = useState("");
  const { doc, selection } = ed;
  const node = selection.length === 1 ? (doc.nodes.find((n) => n.id === selection[0]) ?? null) : null;

  // Pass/fail summary across every Probe/LED that's been given a preset
  // expected value, so a whole circuit's outputs can be sanity-checked at
  // a glance instead of reading each indicator individually.
  const expectSummary = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let pending = 0;
    for (const n of doc.nodes) {
      if (n.expected == null || (n.type !== "OUTPUT" && n.type !== "LED")) continue;
      const v = sim.nodeIn.get(inKey(n.id, 0)) ?? "X";
      if (v !== 0 && v !== 1) pending++;
      else if (v === n.expected) pass++;
      else fail++;
    }
    const total = pass + fail + pending;
    return total ? { pass, fail, pending, total } : null;
  }, [doc.nodes, sim.nodeIn]);

  const update = (patch: Partial<CNode>) =>
    node && ed.commit((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)) }), "property");

  const ctt = useMemo(() => (tab === "truth" && !node ? circuitTruthTable(doc, doc.defs) : null), [tab, node, doc]);
  const issues = useMemo(() => inspectCircuit(doc, doc.defs, sim), [doc, sim]);
  const path = useMemo(() => criticalPath(doc, doc.defs), [doc]);
  const domains = useMemo(() => clockDomains(doc, doc.defs), [doc]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-[var(--border)] p-2">
        {(["props", "truth", "timing", "lint"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-1.5 py-1.5 text-micro font-bold uppercase tracking-[0.12em] transition ${
              tab === t ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--panel2)]"
            }`}
          >
            {t === "props" ? "Inspect" : t === "truth" ? "Truth" : t === "timing" ? "Timing" : "Lint"}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {tab === "props" && (
          <>
            {!node && (
              <>
                <Empty text={selection.length > 1 ? `${selection.length} nodes selected` : "No selection"} />
                {selection.length > 1 && (
                  <Card title="Pack into component">
                    <div className="flex gap-1.5">
                      <input value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="NAME" className="ui-input min-w-0 flex-1" />
                      <button type="button" onClick={() => { ed.makeCustom(packName || "BLOCK"); setPackName(""); }} className="ui-btn-primary">Pack</button>
                    </div>
                    <p className="mt-2 text-micro leading-relaxed text-[var(--muted)]">Need switches (inputs) and probes or LEDs (outputs).</p>
                  </Card>
                )}
                <Card title="Circuit">
                  <Row k="Name" v={doc.name || "Untitled"} />
                  <Row k="Nodes" v={String(doc.nodes.length)} />
                  <Row k="Wires" v={String(doc.wires.length)} />
                  <div className="flex items-center justify-between gap-2 py-0.5 text-xs">
                    <span className="text-[var(--muted)]">Floating</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--text)]">{sim.floating.length}</span>
                      {sim.floating.length > 0 && (
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--panel2)]"
                          onClick={() => {
                            const ids = Array.from(new Set(sim.floating.map((k) => k.split(":")[0])));
                            ed.setSelection(ids);
                            ed.setSelectedWires([]);
                          }}
                        >
                          Locate
                        </button>
                      )}
                    </span>
                  </div>
                  <Row k="Settled" v={sim.stable ? `yes · ${sim.iterations} it` : "oscillating"} />
                  <Row k="Time" v={`t=${sim.time}`} />
                  {expectSummary && (
                    <Row
                      k="Tests"
                      v={
                        expectSummary.fail > 0
                          ? `${expectSummary.pass}/${expectSummary.total} passing · ${expectSummary.fail} failing`
                          : expectSummary.pending > 0
                            ? `${expectSummary.pass}/${expectSummary.total} passing · ${expectSummary.pending} pending`
                            : `${expectSummary.pass}/${expectSummary.total} passing`
                      }
                    />
                  )}
                </Card>
              </>
            )}

            {node && (
              <>
                <Card title="Identity">
                  <Row k="Type" v={node.type} />
                  <Row k="ID" v={node.id} mono />
                  <label className="mt-2 block text-micro uppercase tracking-wider text-[var(--muted)]">Label</label>
                  <input value={node.label ?? ""} onChange={(e) => update({ label: e.target.value })} placeholder={nodeTitle(node, doc.defs)} className="ui-input mt-1" />
                  <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text)]">
                    <input type="checkbox" checked={!!node.watch} onChange={(e) => update({ watch: e.target.checked })} />
                    Pin on waveform
                  </label>
                </Card>
                <Card title="Geometry">
                  <div className="grid grid-cols-2 gap-2">
                    <NumField label="X" value={node.x} onChange={(v) => update({ x: v })} />
                    <NumField label="Y" value={node.y} onChange={(v) => update({ y: v })} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">Rotation {node.rot}°</span>
                    <button type="button" onClick={ed.rotateSelected} className="ui-btn-ghost">Rotate 90°</button>
                  </div>
                </Card>
                <Card title="Delay">
                  <NumField
                    label="Propagation (ticks)"
                    value={node.delay ?? (node.type === "CUSTOM" ? 0 : CATALOG[node.type as Exclude<CNode["type"], "CUSTOM">]?.defaultDelay ?? 0)}
                    onChange={(v) => update({ delay: Math.max(0, v) })}
                  />
                </Card>
                {isGate(node.type) && GATE_INFO[node.type].maxIn > 1 && (
                  <Card title="Fan-in"><Fanin node={node} update={update} /></Card>
                )}
                {node.type === "BUS" && <Card title="Drivers"><Fanin node={node} update={update} min={2} max={8} /></Card>}
                {node.type === "CLOCK" && (
                  <Card title="Clock">
                    <NumField label="Period (ticks)" value={node.period ?? 12} onChange={(v) => update({ period: Math.max(2, v) })} />
                    <label className="mt-2 block text-micro uppercase tracking-wider text-[var(--muted)]">Domain</label>
                    <input value={node.domain ?? "clk"} onChange={(e) => update({ domain: e.target.value })} className="ui-input mt-1" />
                  </Card>
                )}
                {node.type === "COUNTER" && (
                  <Card title="Width">
                    <NumField label="Bits" value={node.bits ?? 4} onChange={(v) => update({ bits: Math.min(8, Math.max(2, v)) })} />
                  </Card>
                )}
                <Card title="Ports"><PortStates node={node} ed={ed} sim={sim} /></Card>
                {isGate(node.type) && (
                  <Card title="Boolean">
                    <p className="text-xs leading-relaxed text-[var(--muted)]">{GATE_INFO[node.type].desc}</p>
                    <code className="mt-2 block rounded-md bg-[var(--panel2)] px-2 py-1.5 text-xs text-[var(--accent)]">
                      Y = {GATE_INFO[node.type].expr(Array.from({ length: node.inputs }, (_, i) => String.fromCharCode(65 + i)))}
                    </code>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {tab === "truth" && (
          <>
            {node && isGate(node.type) && (
              <Card title={`${node.type} truth table`}>
                <GateTable type={node.type} n={node.inputs} live={Array.from({ length: node.inputs }, (_, i) => sim.nodeIn.get(inKey(node.id, i)) ?? "X")} />
              </Card>
            )}
            {!node && ctt && (
              <Card title="Circuit truth table">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-micro">
                    <thead>
                      <tr className="text-[var(--muted)]">
                        {ctt.switches.map((s) => <th key={s.id} className="border-b border-[var(--border)] px-1.5 py-1 font-semibold">{nodeTitle(s, doc.defs)}</th>)}
                        {ctt.probes.map((p) => <th key={p.id} className="border-b border-[var(--border)] bg-[var(--panel2)] px-1.5 py-1 font-semibold text-[var(--accent)]">{nodeTitle(p, doc.defs)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ctt.rows.map((r, i) => (
                        <tr key={i} className="text-center">
                          {r.ins.map((v, j) => <td key={j} className="px-1.5 py-0.5 text-[var(--text)]">{v}</td>)}
                          {r.outs.map((v, j) => (
                            <td key={j} className="px-1.5 py-0.5 font-bold" style={{ color: v === 1 ? "var(--hi)" : v === "X" || v === "Z" ? "var(--xx)" : "var(--muted)" }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {!node && !ctt && <Empty text="Add switches and probes (≤ 8 switches) to generate a truth table." />}
            {node && !isGate(node.type) && <Empty text="Select a logic gate, or deselect to view the circuit table." />}
          </>
        )}

        {tab === "timing" && (
          <>
            <Card title="Critical path">
              {path.path.length ? (
                <>
                  <Row k="Delay" v={`${path.delay} ticks`} />
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text)]">
                    {path.path.map((id) => { const n = doc.nodes.find((x) => x.id === id); return n ? nodeTitle(n, doc.defs) : id; }).join(" → ")}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--muted)]">Add driven logic to measure a path.</p>
              )}
            </Card>
            <Card title="Clock domains">
              {!domains.length && <p className="text-xs text-[var(--muted)]">No clocks in this circuit.</p>}
              {domains.map((d) => (
                <div key={d.domain} className="mb-2 text-xs">
                  <div className="font-semibold text-[var(--text)]">{d.domain}</div>
                  <div className="text-[var(--muted)]">{d.clocks.length} clock · {d.seq.length} sequential</div>
                </div>
              ))}
            </Card>
            <Card title="Engine">
              <Row k="Time" v={String(sim.time)} />
              <Row k="Iterations" v={String(sim.iterations)} />
              <Row k="Flat nodes" v={String(sim.values.size)} />
              <Row k="Contention" v={String(sim.contention.length)} />
            </Card>
          </>
        )}

        {tab === "lint" && (
          <>
            <Card title="Diagnostics">
              <div className="space-y-1">
                {issues.slice(0, 24).map((i, k) => (
                  <div key={k} className="flex gap-2 rounded-md bg-[var(--panel2)] px-2 py-1.5 text-micro leading-snug">
                    <span style={{ color: i.level === "err" ? "var(--xx)" : i.level === "info" ? "var(--hi)" : "var(--muted)" }}>
                      {i.level === "err" ? "×" : i.level === "info" ? "✓" : "!"}
                    </span>
                    <span className="text-[var(--text)]">{i.msg}</span>
                  </div>
                ))}
              </div>
            </Card>
            {node && <Card title="Trace"><Trace ed={ed} sim={sim} node={node} /></Card>}
            <Card title="Verilog preview">
              <pre className="max-h-48 overflow-auto rounded-md bg-[var(--panel2)] p-2 text-micro text-[var(--text)]">{emitVerilog(doc).slice(0, 1200)}</pre>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Fanin({ node, update, min, max }: { node: CNode; update: (p: Partial<CNode>) => void; min?: number; max?: number }) {
  const spec = isGate(node.type) ? GATE_INFO[node.type] : { minIn: min ?? 2, maxIn: max ?? 8 };
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={node.inputs <= spec.minIn} onClick={() => update({ inputs: node.inputs - 1 })} className="h-8 w-8 rounded-md border border-[var(--border)] text-[var(--text)] disabled:opacity-30">−</button>
      <span className="w-8 text-center text-sm font-bold text-[var(--text)]">{node.inputs}</span>
      <button type="button" disabled={node.inputs >= spec.maxIn} onClick={() => update({ inputs: node.inputs + 1 })} className="h-8 w-8 rounded-md border border-[var(--border)] text-[var(--text)] disabled:opacity-30">+</button>
    </div>
  );
}

function PortStates({ node, ed, sim }: { node: CNode; ed: EditorAPI; sim: SimResult }) {
  const names = specOf(node, ed.doc.defs);
  return (
    <div className="space-y-1">
      {names.ins.map((nm, i) => {
        const v = sim.nodeIn.get(inKey(node.id, i)) ?? "X";
        const floating = sim.floating.includes(inKey(node.id, i));
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-[var(--muted)]">{nm}</span>
            <ValChip v={v} />
            {floating && <span className="text-micro text-[var(--xx)]">float</span>}
          </div>
        );
      })}
      {names.outs.map((nm, i) => (
        <div key={"o" + i} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-[var(--muted)]">{nm}</span>
          <ValChip v={sim.nodeOut.get(outKey(node.id, i)) ?? "X"} />
        </div>
      ))}
    </div>
  );
}

function GateTable({ type, n, live }: { type: GateType; n: number; live: Val[] }) {
  const rows = gateTruthTable(type, n);
  const cur = live.map((v) => (v === "X" || v === "Z" ? null : v));
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-[var(--muted)]">
          {Array.from({ length: Math.min(n, 4) }).map((_, i) => (
            <th key={i} className="border-b border-[var(--border)] px-2 py-1 font-semibold">{String.fromCharCode(65 + i)}</th>
          ))}
          <th className="border-b border-[var(--border)] bg-[var(--panel2)] px-2 py-1 font-semibold text-[var(--accent)]">Y</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const match = cur.every((c, j) => c === null || c === r.ins[j]) && !cur.includes(null as never);
          return (
            <tr key={i} className={`text-center ${match ? "bg-[var(--accent)]/12" : ""}`}>
              {r.ins.map((v, j) => <td key={j} className="px-2 py-0.5 text-[var(--text)]">{v}</td>)}
              <td className="px-2 py-0.5 font-bold" style={{ color: r.out === 1 ? "var(--hi)" : "var(--muted)" }}>{r.out}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Trace({ ed, sim, node }: { ed: EditorAPI; sim: SimResult; node: CNode }) {
  const { doc } = ed;
  const trace: { depth: number; label: string; val: Val }[] = [];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (depth > 6 || seen.has(id)) return;
    seen.add(id);
    const n = doc.nodes.find((x) => x.id === id);
    if (!n) return;
    trace.push({ depth, label: nodeTitle(n, doc.defs), val: sim.nodeOut.get(outKey(n.id, 0)) ?? "X" });
    doc.wires.filter((w) => w.to.node === id).forEach((w) => walk(w.from.node, depth + 1));
  };
  walk(node.id, 0);
  return (
    <>
      {trace.map((t, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5 text-xs" style={{ paddingLeft: t.depth * 12 }}>
          <span className="text-[var(--muted)]">{t.depth ? "└" : "●"}</span>
          <span className="text-[var(--text)]">{t.label}</span>
          <ValChip v={t.val} />
        </div>
      ))}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
      <h4 className="ui-kicker mb-2">{title}</h4>
      {children}
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="text-[var(--muted)]">{k}</span>
      <span className={`truncate text-[var(--text)] ${mono ? "font-mono text-micro" : ""}`}>{v}</span>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-micro uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="ui-input mt-1" />
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--muted)]">{text}</div>;
}

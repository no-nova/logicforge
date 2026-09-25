import { useMemo, useState } from "react";
import { CATALOG, GROUP_LABEL, type CompGroup, type NodeKind } from "@/lib/sim/circuit";
import { type EditorAPI } from "@/lib/sim/store";

const ORDER: CompGroup[] = ["gates", "io", "seq", "combo", "bus", "timing"];

function Tile({
  label, hint, payload, onAdd, accent,
}: {
  label: string; hint: string; payload: string; onAdd: () => void; accent?: boolean;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-node", payload);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onAdd}
      title={hint}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel2)] px-2.5 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--panel)] active:scale-[0.98]"
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-micro font-bold tracking-tight"
        style={{
          background: accent ? "var(--accent)" : "color-mix(in srgb, var(--accent) 16%, transparent)",
          color: accent ? "var(--accent-fg)" : "var(--accent)",
        }}
      >
        {label.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[var(--text)]">{label}</span>
        <span className="block truncate text-micro text-[var(--muted)]">{hint}</span>
      </span>
    </button>
  );
}

export default function Library({ ed, centerWorld }: { ed: EditorAPI; centerWorld: () => { x: number; y: number } }) {
  const [q, setQ] = useState("");
  const add = (type: NodeKind, defId?: string) => {
    const c = centerWorld();
    ed.addNode(type, c.x + (Math.random() * 60 - 30), c.y + (Math.random() * 60 - 30), defId);
  };

  const items = useMemo(() => {
    const all = Object.values(CATALOG);
    const needle = q.trim().toLowerCase();
    return ORDER.map((g) => ({
      g,
      list: all.filter((s) => s.group === g && (!needle || `${s.name} ${s.hint} ${s.type}`.toLowerCase().includes(needle))),
    })).filter((x) => x.list.length);
  }, [q]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] p-3">
        <label className="ui-kicker">Library</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search components" className="ui-input mt-2" />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {items.map(({ g, list }) => (
          <section key={g} className="space-y-2">
            <header className="flex items-center justify-between px-0.5">
              <h3 className="ui-kicker">{GROUP_LABEL[g]}</h3>
              <span className="rounded px-1.5 py-0.5 text-micro font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]">{list.length}</span>
            </header>
            <div className="grid grid-cols-1 gap-1.5">
              {list.map((s) => (
                <Tile key={s.type} label={s.name} hint={s.hint} payload={JSON.stringify({ type: s.type })} onAdd={() => add(s.type)} accent={g === "io"} />
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-2">
          <header className="flex items-center justify-between px-0.5">
            <h3 className="ui-kicker">Custom</h3>
            <span className="rounded px-1.5 py-0.5 text-micro font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]">{ed.doc.defs.length}</span>
          </header>
          {!ed.doc.defs.length && (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-2.5 py-3 text-micro leading-relaxed text-[var(--muted)]">
              Select a subcircuit with switches and probes, then Pack in the inspector.
            </p>
          )}
          <div className="grid grid-cols-1 gap-1.5">
            {ed.doc.defs.map((d) => (
              <div key={d.id} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Tile
                    label={d.name}
                    hint={`${d.inputs.length} in · ${d.outputs.length} out`}
                    payload={JSON.stringify({ type: "CUSTOM", defId: d.id })}
                    onAdd={() => add("CUSTOM", d.id)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    ed.commit((doc) => ({
                      ...doc,
                      defs: doc.defs.filter((x) => x.id !== d.id),
                      nodes: doc.nodes.filter((n) => n.defId !== d.id),
                    }), "remove component")
                  }
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--xx)] hover:text-[var(--xx)]"
                  title="Delete component"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

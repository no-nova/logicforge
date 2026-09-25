import { useEffect, useState } from "react";
import { type EditorAPI } from "@/lib/sim/store";
import { SAMPLES } from "@/lib/sim/demos";
import { downloadJson, downloadText, emitVerilog, emitVhdl } from "@/lib/sim/hdl";
import { type Doc } from "@/lib/sim/circuit";
import { toast } from "sonner";

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘ Z", action: "Undo" },
  { keys: "⌘ ⇧ Z / ⌘ Y", action: "Redo" },
  { keys: "⌘ C / X / V", action: "Copy / cut / paste" },
  { keys: "⌘ D", action: "Duplicate" },
  { keys: "⌘ A", action: "Select all" },
  { keys: "⌘ S", action: "Save as JSON" },
  { keys: "⌘ O", action: "Open files" },
  { keys: "⌘ G", action: "Pack selection" },
  { keys: "Delete", action: "Delete" },
  { keys: "R", action: "Rotate" },
  { keys: "L", action: "Lock / unlock selection" },
  { keys: "Right-click", action: "Context menu (copy · paste · lock · …)" },
  { keys: "Arrows", action: "Nudge · ⇧ for 5×" },
  { keys: "Alt-drag", action: "Duplicate while moving" },
  { keys: "Space-drag / middle-drag", action: "Pan canvas" },
  { keys: "Two-finger", action: "Pan (trackpad)" },
  { keys: "Pinch / ⌘-scroll", action: "Zoom to cursor" },
  { keys: "P", action: "Run / pause" },
  { keys: ". ", action: "Step tick" },
  { keys: "F / 0", action: "Fit view" },
  { keys: "1", action: "100% zoom" },
  { keys: "?", action: "This list" },
  { keys: "Esc", action: "Clear selection" },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Keyboard & gestures</h2>
          <button type="button" className="ui-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--muted)]">{s.action}</span>
              <kbd className="rounded-md border border-[var(--border)] bg-[var(--panel2)] px-2 py-0.5 font-mono text-micro text-[var(--text)]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FileDialog({
  open,
  ed,
  onClose,
}: {
  open: boolean;
  ed: EditorAPI;
  onClose: () => void;
}) {
  const [name, setName] = useState(ed.fileName);
  useEffect(() => {
    if (open) setName(ed.fileName);
  }, [open, ed.fileName]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Files</h2>
          <button type="button" className="ui-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="ui-input flex-1" />
            <button type="button" className="ui-btn-primary" onClick={() => ed.renameFile(name.trim() || "Untitled")}>
              Rename
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn-ghost" onClick={() => { ed.newFile(); onClose(); }}>
              New
            </button>
            <button type="button" className="ui-btn-ghost" onClick={() => { ed.saveAs(name.trim() || "Untitled"); toast.success("Saved a copy"); }}>
              Save as
            </button>
            <button type="button" className="ui-btn-ghost" onClick={() => { ed.duplicateFile(); toast.success("Duplicated"); }}>
              Duplicate
            </button>
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {ed.projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  ed.openFile(p.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                  p.id === ed.currentId ? "bg-[var(--panel2)] text-[var(--accent)]" : "text-[var(--text)] hover:bg-[var(--panel2)]"
                }`}
              >
                <span className="truncate font-semibold">{p.name}</span>
                <span className="ml-2 shrink-0 text-micro text-[var(--muted)]">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FileMenu({
  ed,
  onOpenFiles,
  fileRef,
}: {
  ed: EditorAPI;
  onOpenFiles: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [samples, setSamples] = useState(false);

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

  return (
    <div className="relative">
      <button type="button" className="ui-btn-ghost" onClick={() => setOpen((o) => !o)}>
        File
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => { setOpen(false); setSamples(false); }} aria-label="Close menu" />
          <div className="absolute left-0 top-9 z-40 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow)]">
            <MenuItem onClick={() => { ed.newFile(); setOpen(false); }}>New</MenuItem>
            <MenuItem onClick={() => { onOpenFiles(); setOpen(false); }}>Open…</MenuItem>
            <MenuItem onClick={() => { ed.renameFile(ed.fileName); toast.success("Saved"); setOpen(false); }}>Save</MenuItem>
            <MenuItem onClick={() => { onOpenFiles(); setOpen(false); }}>Save as…</MenuItem>
            <div className="my-1 h-px bg-[var(--border)]" />
            <MenuItem onClick={exportJson}>Export JSON</MenuItem>
            <MenuItem onClick={exportV}>Export Verilog</MenuItem>
            <MenuItem onClick={exportVhdl}>Export VHDL</MenuItem>
            <MenuItem onClick={() => fileRef.current?.click()}>Import JSON</MenuItem>
            <div className="my-1 h-px bg-[var(--border)]" />
            <div className="relative">
              <MenuItem onClick={() => setSamples((s) => !s)}>Samples</MenuItem>
              {samples && (
                <div className="absolute left-full top-0 ml-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow)]">
                  {SAMPLES.map((s) => (
                    <MenuItem
                      key={s.id}
                      onClick={() => {
                        ed.load(s.build());
                        setOpen(false);
                        setSamples(false);
                        toast.success(s.name);
                      }}
                    >
                      <span className="block">
                        {s.name}
                        <span className="block text-micro font-normal text-[var(--muted)]">{s.hint}</span>
                      </span>
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--panel2)]"
    >
      {children}
    </button>
  );
}

export function importJsonFile(file: File, load: (d: Doc) => void) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(String(r.result)) as Doc;
      if (Array.isArray(d.nodes) && Array.isArray(d.wires)) {
        load({ ...d, defs: d.defs ?? [] });
        toast.success("Imported circuit");
      } else toast.error("Not a LogicForge file");
    } catch {
      toast.error("Could not parse JSON");
    }
  };
  r.readAsText(file);
}

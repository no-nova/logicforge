import { useEffect, useMemo, useState } from "react";
import { type EditorAPI } from "@/lib/sim/store";
import { SAMPLES } from "@/lib/sim/demoCircuits";
import {
  downloadJsonFile as downloadJson,
  downloadTextFile as downloadText,
  generateVerilog as emitVerilog,
  generateVhdl as emitVhdl,
  parseHardwareDescriptionLanguage as parseHdl,
  parseVerilogHdl as parseVerilog,
  parseVhdlHdl as parseVhdl,
} from "@/lib/sim/circuitHdlConverter";
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
  hdlFileRef,
  onOpenHdl,
}: {
  ed: EditorAPI;
  onOpenFiles: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  hdlFileRef: React.RefObject<HTMLInputElement | null>;
  onOpenHdl: () => void;
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
          <div className="absolute left-0 top-9 z-40 w-60 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow)]">
            <MenuItem onClick={() => { ed.newFile(); setOpen(false); }}>New</MenuItem>
            <MenuItem onClick={() => { onOpenFiles(); setOpen(false); }}>Open…</MenuItem>
            <MenuItem onClick={() => { ed.renameFile(ed.fileName); toast.success("Saved"); setOpen(false); }}>Save</MenuItem>
            <MenuItem onClick={() => { onOpenFiles(); setOpen(false); }}>Save as…</MenuItem>
            <div className="my-1 h-px bg-[var(--border)]" />
            <MenuItem onClick={exportJson}>Export JSON</MenuItem>
            <MenuItem onClick={exportV}>Export Verilog (IR→HDL)</MenuItem>
            <MenuItem onClick={exportVhdl}>Export VHDL (IR→HDL)</MenuItem>
            <div className="my-1 h-px bg-[var(--border)]" />
            <MenuItem onClick={() => fileRef.current?.click()}>Import JSON</MenuItem>
            <MenuItem onClick={() => hdlFileRef.current?.click()}>Import HDL (Verilog/VHDL → IR)</MenuItem>
            <MenuItem onClick={() => { onOpenHdl(); setOpen(false); }}>HDL Editor (bidirectional)</MenuItem>
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

function MenuItem({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${disabled ? "opacity-40 cursor-not-allowed" : "text-[var(--text)] hover:bg-[var(--panel2)]"}`}
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

export function importHdlFile(file: File, load: (d: Doc) => void) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const text = String(r.result);
      // Try to auto-detect via content and extension
      const isVhdl = /\.vhd(l)?$/i.test(file.name) || /entity\s+\w+\s+is/i.test(text);
      const isVerilog = /\.v$/i.test(file.name) || /module\s+\w+/i.test(text);
      let res;
      if (isVhdl && !isVerilog) res = parseVhdl(text);
      else if (isVerilog && !isVhdl) res = parseVerilog(text);
      else res = parseHdl(text);
      if (res.doc.nodes.length === 0 && res.errors.length) {
        toast.error(res.errors[0] || "Could not parse HDL");
        return;
      }
      if (res.warnings.length) toast.message(res.warnings[0]);
      load(res.doc);
      // Set file name from HDL module/entity if available
      toast.success(`Imported HDL: ${res.doc.nodes.length} nodes, ${res.doc.wires.length} wires`);
    } catch (e) {
      toast.error(`HDL import failed: ${String(e)}`);
    }
  };
  r.readAsText(file);
}

export function importAnyFile(file: File, load: (d: Doc) => void) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return importJsonFile(file, load);
  if (ext === "v" || ext === "vhd" || ext === "vhdl") return importHdlFile(file, load);
  // Try JSON first, fallback to HDL
  const r = new FileReader();
  r.onload = () => {
    const text = String(r.result);
    try {
      const d = JSON.parse(text) as Doc;
      if (Array.isArray(d.nodes) && Array.isArray(d.wires)) {
        load({ ...d, defs: d.defs ?? [] });
        toast.success("Imported circuit");
        return;
      }
    } catch { /* not json */ }
    try {
      const res = parseHdl(text);
      if (res.doc.nodes.length) {
        if (res.warnings.length) toast.message(res.warnings[0]);
        load(res.doc);
        toast.success(`Imported HDL: ${res.doc.nodes.length} nodes`);
        return;
      }
    } catch { /* ignore */ }
    toast.error("Unsupported file format");
  };
  r.readAsText(file);
}

// ---------------------------------------------------------------------------
// HDL Dialog — bidirectional Circuit IR ↔ HDL editor
// ---------------------------------------------------------------------------

export function HdlDialog({
  open,
  onClose,
  ed,
}: {
  open: boolean;
  onClose: () => void;
  ed: EditorAPI;
}) {
  const [lang, setLang] = useState<"verilog" | "vhdl">("verilog");
  const initial = useMemo(() => {
    if (!open) return "";
    return lang === "verilog" ? emitVerilog(ed.doc) : emitVhdl(ed.doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang, ed.doc]);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(lang === "verilog" ? emitVerilog(ed.doc) : emitVhdl(ed.doc));
      setError(null);
      setInfo(null);
    }
  }, [open, lang, ed.doc]);

  const counts = useMemo(() => {
    try {
      const res = lang === "verilog" ? parseVerilog(text) : parseVhdl(text);
      if (!res.doc.nodes.length) return null;
      return `${res.doc.nodes.length} nodes · ${res.doc.wires.length} wires`;
    } catch {
      return null;
    }
  }, [text, lang]);

  if (!open) return null;

  const onApply = () => {
    try {
      const res = lang === "verilog" ? parseVerilog(text) : parseVhdl(text);
      // Also try generic if strict fails but still has nodes
      const effective = res.doc.nodes.length ? res : parseHdl(text);
      if (effective.errors.length && !effective.doc.nodes.length) {
        setError(effective.errors.join("\n"));
        return;
      }
      if (effective.warnings.length) setInfo(effective.warnings.join("\n"));
      else setInfo(null);
      if (!effective.doc.nodes.length) {
        setError("No logic found in HDL");
        return;
      }
      ed.load(effective.doc);
      toast.success(`HDL → Circuit: ${effective.doc.nodes.length} nodes`);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  const onDownload = () => {
    const ext = lang === "verilog" ? "v" : "vhd";
    downloadText(`${(ed.doc.name || "circuit").replace(/\s+/g, "-")}.${ext}`, text);
    toast.success(`Downloaded ${lang}`);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied HDL to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Circuit ↔ HDL</h2>
            <p className="text-micro text-[var(--muted)]">Bidirectional conversion. Edit HDL and apply to canvas, or update canvas and re-export.</p>
          </div>
          <button type="button" className="ui-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          <div className="flex rounded-lg border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setLang("verilog")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${lang === "verilog" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)]"}`}
            >
              Verilog
            </button>
            <button
              type="button"
              onClick={() => setLang("vhdl")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${lang === "vhdl" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)]"}`}
            >
              VHDL
            </button>
          </div>
          <span className="ml-auto text-micro text-[var(--muted)]">
            {ed.doc.nodes.length} nodes → HDL · {counts ?? "—"}
          </span>
          <span className="hidden text-micro text-[var(--muted)] sm:block">IR ↔ {lang}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            spellCheck={false}
            className="h-full min-h-[320px] w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel2)] p-3 font-mono text-xs leading-relaxed text-[var(--text)] outline-none focus:border-[var(--accent)]"
            placeholder={lang === "verilog" ? "module ..." : "entity ..."}
          />
        </div>

        {(error || info) && (
          <div className="mx-3 mb-2 rounded-lg border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: error ? "var(--xx)" : "var(--border)", background: error ? "color-mix(in srgb, var(--xx) 10%, transparent)" : "var(--panel2)", color: error ? "var(--xx)" : "var(--muted)" }}>
            {error ? <pre className="whitespace-pre-wrap font-mono">{error}</pre> : <span>{info}</span>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--panel)] px-4 py-3">
          <button type="button" className="ui-btn-ghost" onClick={onCopy}>Copy</button>
          <button type="button" className="ui-btn-ghost" onClick={onDownload}>Download .{lang === "verilog" ? "v" : "vhd"}</button>
          <button type="button" className="ui-btn-ghost" onClick={() => setText(lang === "verilog" ? emitVerilog(ed.doc) : emitVhdl(ed.doc))}>Reset from canvas (IR→HDL)</button>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="ui-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="ui-btn-primary" onClick={onApply}>Apply HDL → Circuit</button>
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--panel2)] px-4 py-2 text-micro leading-relaxed text-[var(--muted)]">
          <span className="font-bold text-[var(--text)]">How it works:</span> <span className="font-mono">Circuit IR</span> (nodes/wires on canvas) ↔ <span className="font-mono">HDL</span> (Verilog / VHDL text). Export embeds an IR comment for lossless round-trip; imported HDL without that comment is parsed structurally (gates, muxes, sequential).
        </div>
      </div>
    </div>
  );
}

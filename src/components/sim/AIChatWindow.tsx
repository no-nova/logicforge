import { useEffect, useRef, useState, useMemo } from "react";
import { Bot, X, Plus, Trash2, Maximize2, Minimize2, Send, Sparkles, Eye, Brain, Workflow, ChevronDown, ChevronUp, Copy, Check, Settings, KeyRound, Globe, Cpu } from "lucide-react";
import type { EditorAPI } from "@/lib/sim/store";
import type { SimResult } from "@/lib/sim/types";
import { buildAISnapshot, formatSnapshotForPrompt } from "@/lib/sim/aiSnapshot";
import { executeAICommand, generateTitleFromPrompt } from "@/lib/ai/assistant";
import {
  type AIChatSession,
  type AIMessage,
  loadSessions,
  saveSessions,
  createSession,
  addMessage,
  pushWorkflow,
  updateWorkflow,
} from "@/lib/ai/memory";

interface Props {
  id: string;
  ed: EditorAPI;
  sim: SimResult | null;
  view: { x: number; y: number; z: number };
  setView: (v: any) => void;
  initialNodeId?: unknown;
  onClose: (id: string) => void;
  onNewChat: () => void;
}

function safeNodeId(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0 && v.length < 80 && /^[a-zA-Z0-9_\-]+$/.test(v)) return v;
  if (typeof v === "string" && v.length > 0) return v.slice(0, 48);
  return undefined;
}

interface AIConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

const AI_PROVIDERS = [
  { id: "mock", name: "Mock (local)", endpoint: "", models: ["mock"] },
  { id: "openai", name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
  { id: "anthropic", name: "Anthropic", endpoint: "https://api.anthropic.com/v1/messages", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"] },
  { id: "openrouter", name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", models: ["openrouter/auto"] },
  { id: "custom", name: "Custom", endpoint: "", models: ["custom"] },
];

function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem("logicforge.ai.config.v1");
    if (raw) return JSON.parse(raw) as AIConfig;
  } catch {}
  return { provider: "mock", endpoint: "", apiKey: "", model: "mock" };
}
function saveAIConfig(c: AIConfig) {
  try { localStorage.setItem("logicforge.ai.config.v1", JSON.stringify(c)); } catch {}
}

export default function AIChatWindow({ id, ed, sim, view, setView, initialNodeId, onClose, onNewChat }: Props) {
  const safeId = safeNodeId(initialNodeId);
  const [session, setSession] = useState<AIChatSession>(() => {
    const sessions = loadSessions();
    let s = sessions.find((x) => x.id === id);
    if (s) return s;
    const fresh = createSession(safeId ? `Chat about ${safeId}` : "New Chat");
    if (safeId) {
      fresh.messages.push({
        id: `sys_${Date.now()}`,
        role: "system",
        content: `Context: component ${safeId} focused. You can ask about its coordinates, type, connections, on/off, layer, region.`,
        timestamp: Date.now(),
      });
    }
    return fresh;
  });
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    // top-center floating, stagger multiple windows
    const idx = parseInt(id.slice(-1), 36) % 4;
    return { x: 0, y: 56 + idx * 28 };
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => loadAIConfig());
  const [configSaved, setConfigSaved] = useState(false);

  // Settings must be automatically open every time the panel is accessed — force open on mount/id change
  useEffect(() => {
    setShowSettings(true);
  }, [id]);

  const snapshot = useMemo(() => buildAISnapshot(ed.doc, ed.doc.defs, sim, view, ed.selection, ed.selectedWires), [ed.doc, sim, view, ed.selection, ed.selectedWires]);
  const snapshotJson = useMemo(() => formatSnapshotForPrompt(snapshot), [snapshot]);

  // Keep session persisted
  useEffect(() => {
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    saveSessions(sessions);
  }, [session]);

  // Esc to close this chat window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  // Auto scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [session.messages, isThinking, thinkingSteps]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isThinking) return;
    setInput("");
    // Create user message
    const userMsg: AIMessage = { id: `u_${Date.now()}`, role: "user", content: prompt, timestamp: Date.now() };
    setSession((s) => {
      const ns = { ...s, messages: [...s.messages, userMsg] };
      if (ns.messages.length === 1 || ns.title === "New Chat") ns.title = generateTitleFromPrompt(prompt);
      // workflow start
      pushWorkflow(ns, "Received prompt", "running", prompt.slice(0, 80));
      return { ...ns };
    });
    setIsThinking(true);
    setThinkingSteps(["Analyzing prompt...", "Reading circuit disclosure..."]);

    // Simulate streaming workflow as AI works
    const steps = [
      `Disclosing ${snapshot.meta.nodeCount} components to AI`,
      `Checking selection (${snapshot.selection.count} items) + layers (${snapshot.layers.map((l) => l.name).join(", ")})`,
      `Parsing intent: "${prompt.slice(0, 64)}"`,
    ];
    let stepIdx = 0;
    const iv = setInterval(() => {
      if (stepIdx < steps.length) {
        setThinkingSteps((prev) => [...prev, steps[stepIdx++]]);
      } else clearInterval(iv);
    }, 340);

    // Slight delay to show workflow
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));
    clearInterval(iv);

    // Try real API if configured, otherwise use local mock
    let result: ReturnType<typeof executeAICommand>;
    const useReal = aiConfig.provider !== "mock" && !!aiConfig.apiKey && !!aiConfig.endpoint;
    if (useReal) {
      setThinkingSteps((prev) => [...prev, `Calling ${aiConfig.provider} · ${aiConfig.model}…`]);
      try {
        // Generic OpenAI-compatible call — disclosure as system prompt
        const sysDisclosure = `You are LogicForge AI. Full circuit JSON follows (coordinates, type, connections, on/off, selection, layer, region). Use it to answer and to issue tool calls.\n` + snapshotJson.slice(0, 12000);
        const payload: any = aiConfig.provider === "anthropic"
          ? { model: aiConfig.model, max_tokens: 1024, system: sysDisclosure, messages: [{ role: "user", content: prompt }] }
          : { model: aiConfig.model, messages: [{ role: "system", content: sysDisclosure }, { role: "user", content: prompt }], temperature: 0.3 };
        const headers: Record<string,string> = { "Content-Type": "application/json" };
        if (aiConfig.provider === "anthropic") {
          headers["x-api-key"] = aiConfig.apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${aiConfig.apiKey}`;
        }
        const resp = await fetch(aiConfig.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then((s)=> s.slice(0, 400))}`);
        const j: any = await resp.json();
        let content = "";
        if (j.choices?.[0]?.message?.content) content = j.choices[0].message.content;
        else if (typeof j.choices?.[0]?.text === "string") content = j.choices[0].text;
        else if (typeof j.content === "string") content = j.content;
        else if (Array.isArray(j.content) && j.content[0]?.text) content = j.content.map((c:any)=>c.text).join("\n");
        else content = JSON.stringify(j).slice(0, 2000);
        // Also run local command side-effect for demo (so circuit updates even with real AI)
        const local = executeAICommand(prompt, ed, snapshot);
        result = {
          success: true,
          message: content + (local.actions.length ? `\n\n[Local actions also run: ${local.actions.join(", ")}]` : ""),
          actions: local.actions,
          workflow: [...local.workflow, { label: `Real API: ${aiConfig.provider}/${aiConfig.model}`, detail: `ok ${resp.status}` }],
        };
      } catch (e:any) {
        // Fallback to local mock on real API failure — don't scare user with raw fetch error
        const local = executeAICommand(prompt, ed, snapshot);
        const hint = String(e?.message ?? e).slice(0, 120);
        const isNetwork = /network|fetch|failed to fetch|load failed/i.test(hint);
        result = {
          success: local.success,
          message: local.message + (isNetwork ? "\n\n[Note: Real API unreachable (\"" + hint.slice(0,60) + "\"), used local AI instead — set Mock provider or configure endpoint/key above.]" : "\n\n[Real API error: " + hint + " — used local AI.]"),
          actions: local.actions,
          workflow: [...local.workflow, { label: "API unreachable → used local mock", detail: hint.slice(0,80) }],
        };
      }
    } else {
      result = executeAICommand(prompt, ed, snapshot);
      if (aiConfig.provider !== "mock" && !aiConfig.apiKey) {
        result.message += "\n\n[Note: API key not set for " + aiConfig.provider + " — using local mock. Fill key in settings gear.]";
        result.workflow.push({ label: "Using mock (no key)", detail: aiConfig.provider });
      }
    }

    // Build workflow steps into session
    setSession((s) => {
      const ns = { ...s };
      // add thinking steps as workflow
      for (const label of result.workflow) {
        const st = pushWorkflow(ns, label.label, "done", label.detail);
        void st;
      }
      for (const a of result.actions) {
        pushWorkflow(ns, `Executed: ${a}`, "done");
      }
      // Add assistant message
      const asst: AIMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: result.message,
        timestamp: Date.now(),
        workflow: result.workflow.map((w, i) => ({ id: `wf_${Date.now()}_${i}`, label: w.label, status: "done" as const, detail: w.detail, timestamp: Date.now() })),
      };
      ns.messages = [...ns.messages, asst];
      // mark initial workflow pending -> done
      for (const wf of ns.workflowLog) if (wf.status === "running" && wf.label === "Received prompt") wf.status = "done";
      return { ...ns };
    });
    setIsThinking(false);
    setThinkingSteps([]);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onDragStart = (e: React.PointerEvent) => {
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setPos({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };
  const onDragEnd = () => {
    setDragging(false);
    dragRef.current = null;
  };

  if (minimized) {
    return (
      <div
        className="fixed z-40 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)]/95 px-3 py-2 shadow-[var(--shadow)] backdrop-blur-xl"
        style={{ left: `calc(50% + ${pos.x}px)`, top: pos.y, transform: "translateX(-50%)" }}
      >
        <Bot className="size-4 text-[var(--accent)]" />
        <span className="text-xs font-bold">{session.title}</span>
        <span className="text-micro text-[var(--muted)]">{session.messages.length} msgs</span>
        <button onClick={() => setMinimized(false)} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
          <Maximize2 className="size-3.5" />
        </button>
        <button onClick={() => onClose(id)} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel2)] text-[var(--muted)]">
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-40 flex w-[min(640px,94vw)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]/96 shadow-[var(--shadow)] backdrop-blur-xl"
      style={{
        left: `calc(50% + ${pos.x}px)`,
        top: pos.y,
        transform: "translateX(-50%)",
        backdropFilter: "blur(18px) saturate(1.15)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.22), 0 2px 12px rgba(0,0,0,0.14)",
        maxHeight: "min(72vh, 640px)",
      }}
    >
      {/* Header — draggable */}
      <div
        className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)]/90 px-3"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold leading-none">{session.title}</div>
          <div className="flex items-center gap-1.5 text-micro leading-none text-[var(--muted)]">
            <span className="hidden sm:inline">AI · disclosure {snapshot.meta.nodeCount}n/{snapshot.meta.wireCount}w</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--panel2)] px-1.5 py-0.5">
              <Brain className="size-3" /> memory {session.messages.length}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[var(--accent)]">
              <Cpu className="size-3" /> {aiConfig.provider}:{aiConfig.model}
            </span>
            {safeId && <span className="rounded-full bg-[var(--accent)]/15 px-1.5 py-0.5 text-[var(--accent)]">ctx: {safeId.slice(0, 8)}</span>}
          </div>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onNewChat(); }}
          className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel2)] px-2.5 py-1.5 text-micro font-bold hover:bg-[var(--panel)]"
          title="New Chat (multiple windows)"
        >
          <Plus className="size-3.5" /> New Chat
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowSnapshot((v) => !v)}
          className={`grid h-7 w-7 place-items-center rounded-full border ${showSnapshot ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)]"}`}
          title="Disclosure to AI (coordinates, type, connections, on/off, selection, layers, regions)"
        >
          <Eye className="size-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowSettings(true)}
          className="grid h-7 w-7 place-items-center rounded-full border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
          title="AI API (provider/endpoint/key/model) — always visible directly within chat window"
        >
          <Settings className="size-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized(true)}
          className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]"
          title="Minimize"
        >
          <Minimize2 className="size-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onClose(id)}
          className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel2)] text-[var(--xx)] hover:bg-[var(--xx)] hover:text-white"
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Disclosure panel */}
      {showSnapshot && (
        <div className="max-h-48 shrink-0 overflow-auto border-b border-[var(--border)] bg-[var(--panel2)]/70 p-3 text-micro">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[var(--muted)]">AI Disclosure — full interface state</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(snapshotJson);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-micro font-bold"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-micro">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2">
              <div className="font-bold text-[var(--text)]">View & Layers</div>
              <div>Active: {snapshot.view.activeLayerName} ({snapshot.view.activeLayerId?.slice(0, 6)})</div>
              <div>Flatten: {String(snapshot.view.flattenLayers)}</div>
              <div>Zoom: {snapshot.view.z.toFixed(2)} at ({Math.round(snapshot.view.x)},{Math.round(snapshot.view.y)})</div>
              <div>Layers: {snapshot.layers.map((l) => `${l.name}:${l.nodeCount}`).join(", ")}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2">
              <div className="font-bold text-[var(--text)]">Selection & Regions</div>
              <div>Selected: {snapshot.selection.nodeIds.join(", ") || "none"}</div>
              <div>Wires: {snapshot.selection.wireIds.join(", ") || "none"}</div>
              <div>Regions: {snapshot.regions.map((r) => `${r.name}(${r.nodeIds.length})`).join(", ") || "none"}</div>
              <div>Defs: {snapshot.defs.map((d) => d.name).join(", ") || "none"}</div>
            </div>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer font-bold text-[var(--accent)]">Full JSON (coordinates, type, connection, on/off, layer, group) — for AI API</summary>
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 text-[10px] leading-[1.3]">{snapshotJson.slice(0, 8000)}{snapshotJson.length > 8000 ? "\n…truncated" : ""}</pre>
          </details>
        </div>
      )}

      
      {/* AI API — always directly within chat window, automatically open every time (no collapsed state) */}
      {true ? (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--panel2)]/80 p-3 text-micro">
          <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-[var(--muted)]">
            <Settings className="size-3.5" /> AI API Settings
            <span className="ml-auto rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-micro text-[var(--accent)]">{aiConfig.provider}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold text-[var(--muted)]">Provider</span>
              <select
                value={aiConfig.provider}
                onChange={(e) => {
                  const prov = e.target.value;
                  const def = AI_PROVIDERS.find((p) => p.id === prov) ?? AI_PROVIDERS[0];
                  setAIConfig((c) => ({ ...c, provider: prov, endpoint: def.endpoint || c.endpoint, model: def.models[0] || c.model }));
                }}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-xs outline-none focus:border-[var(--accent)]"
              >
                {AI_PROVIDERS.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold text-[var(--muted)]">Model</span>
              <select
                value={aiConfig.model}
                onChange={(e) => setAIConfig((c) => ({ ...c, model: e.target.value }))}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-xs outline-none focus:border-[var(--accent)]"
              >
                {(AI_PROVIDERS.find((p) => p.id === aiConfig.provider)?.models ?? [aiConfig.model]).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {!(AI_PROVIDERS.find((p) => p.id === aiConfig.provider)?.models ?? []).includes(aiConfig.model) && (
                  <option value={aiConfig.model}>{aiConfig.model} (custom)</option>
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="flex items-center gap-1 font-bold text-[var(--muted)]"><Globe className="size-3" /> Endpoint (API URL)</span>
              <input
                value={aiConfig.endpoint}
                onChange={(e) => setAIConfig((c) => ({ ...c, endpoint: e.target.value }))}
                placeholder={AI_PROVIDERS.find((p) => p.id === aiConfig.provider)?.endpoint || "https://api.example.com/v1/chat/completions"}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="flex items-center gap-1 font-bold text-[var(--muted)]"><KeyRound className="size-3" /> API Key</span>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAIConfig((c) => ({ ...c, apiKey: e.target.value }))}
                placeholder="sk-... (stored locally)"
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                saveAIConfig(aiConfig);
                setConfigSaved(true);
                setTimeout(() => setConfigSaved(false), 1400);
              }}
              className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent-fg)] shadow"
            >
              {configSaved ? "Saved ✓" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                const c = loadAIConfig();
                setAIConfig(c);
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-bold"
            >
              Reset
            </button>
            <span className="ml-auto text-micro text-[var(--muted)]">{aiConfig.provider === "mock" ? "Using local mock AI (no key needed)" : aiConfig.apiKey ? "Key set · will call endpoint" : "No key — fallback to mock"}</span>
          </div>
          <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 text-micro leading-relaxed text-[var(--muted)]">
            <div className="font-bold text-[var(--text)]">How to use</div>
            <div>1) Provider/endpoint/key/model are here in the chat window — not hidden.</div>
            <div>2) Pick model for that provider — shows currently used AI: <b className="text-[var(--text)]">{aiConfig.model}</b> · saved locally.</div>
            <div>3) Chat below — AI receives full disclosure (coordinates, type, connections, on/off, selection, layer, region). Try "move selected to Foreground". <span className="text-[var(--muted)]">Press <b>Esc</b> to close chat.</span></div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel2)]/50 px-3 py-1.5 text-micro">
          <span className="inline-flex items-center gap-1.5 text-[var(--muted)]"><Cpu className="size-3" /> AI: {aiConfig.provider}/{aiConfig.model}</span>
          <span className="text-[var(--muted)]">·</span>
          <span className={`${aiConfig.apiKey ? "text-[var(--hi)]" : "text-amber-600"} font-medium`}>{aiConfig.provider === "mock" ? "mock (no key)" : aiConfig.apiKey ? "key set" : "no key — mock fallback"}</span>
          <button type="button" onClick={() => setShowSettings(true)} className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-micro font-bold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Settings className="size-3" /> Show API</button>
        </div>
      )}

      {/* Workflow log */}
      {session.workflowLog.length > 0 && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--panel)]/70">
          <button onClick={() => setShowWorkflow((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-micro font-bold">
            <Workflow className="size-3.5 text-[var(--accent)]" /> Workflow ({session.workflowLog.length}) — recorded correctly
            {showWorkflow ? <ChevronUp className="ml-auto size-3.5" /> : <ChevronDown className="ml-auto size-3.5" />}
          </button>
          {showWorkflow && (
            <div className="max-h-28 overflow-auto px-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {session.workflowLog.slice(-12).map((w) => (
                  <span
                    key={w.id}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-micro"
                    style={{
                      borderColor: w.status === "done" ? "var(--hi)" : w.status === "error" ? "var(--xx)" : "var(--border)",
                      background: w.status === "done" ? "color-mix(in srgb, var(--hi) 10%, var(--panel))" : "var(--panel2)",
                      color: w.status === "done" ? "var(--hi)" : w.status === "error" ? "var(--xx)" : "var(--muted)",
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${w.status === "done" ? "bg-[var(--hi)]" : w.status === "running" ? "bg-amber-500 animate-pulse" : "bg-[var(--muted)]"}`} />
                    {w.label}
                    {w.detail ? <span className="max-w-28 truncate opacity-70">· {w.detail.slice(0, 32)}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages — prompts visible while working */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-auto bg-[var(--bg)] p-3">
        {session.messages.length === 0 && !isThinking && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)]/60 p-4 text-center">
            <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              <Sparkles className="size-4" />
            </div>
            <div className="mt-2 text-xs font-bold">Ask AI about this circuit</div>
            <div className="mx-auto mt-1 max-w-96 text-micro leading-relaxed text-[var(--muted)]">
              I see coordinates, type, connections, on/off, selection, layers, and groups. Try <b className="text-[var(--text)]">"explain circuit"</b>, <b className="text-[var(--text)]">"move selected to Foreground"</b>, or <b className="text-[var(--text)]">"add AND gate"</b>. Press <b>T</b> to open me.
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["explain circuit", "move selected to Foreground", "add AND gate", "what's floating?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-micro font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {session.messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role !== "user" && <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--panel)] text-[var(--accent)] border border-[var(--border)]"><Bot className="size-3.5" /></div>}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-[var(--accent)] text-[var(--accent-fg)] rounded-br-sm"
                    : m.role === "system"
                      ? "bg-amber-500/10 border border-amber-500/20 text-[var(--muted)] text-micro"
                      : "bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] rounded-bl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                {m.workflow && m.workflow.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.workflow.map((w) => (
                      <span key={w.id} className="rounded-full bg-[var(--panel2)] px-1.5 py-0.5 text-micro leading-none text-[var(--muted)]">
                        {w.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className={`mt-1 text-micro leading-none ${m.role === "user" ? "text-white/70" : "text-[var(--muted)]"}`}>{new Date(m.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex gap-2">
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--panel)] text-[var(--accent)] border border-[var(--border)]">
                <Bot className="size-3.5 animate-pulse" />
              </div>
              <div className="max-w-[82%] rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" /> AI is working…
                </div>
                <div className="mt-1 space-y-1">
                  {thinkingSteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-micro leading-none text-[var(--muted)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--accent)]" /> {s}
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — prompts while AI is working are still visible above */}
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--panel)]/95 p-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isThinking ? "AI is working — your prompts stay visible above…" : "Ask AI… e.g. 'move selected to Midground' (T to open)"}
            disabled={isThinking}
            className="h-9 flex-1 rounded-full border border-[var(--border)] bg-[var(--panel2)] px-3.5 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow disabled:opacity-40"
            title="Send (Enter)"
          >
            <Send className="size-4" />
          </button>
          <button
            onClick={() => {
              setSession((s) => ({ ...s, messages: [], workflowLog: [] }));
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--xx)]"
            title="Clear chat (memory stays in other windows)"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-micro leading-none text-[var(--muted)]">
          <span>Press <b>T</b> to open · Right-click component → AI Chat · Memory persisted</span>
          <span className="hidden sm:inline">{snapshot.meta.nodeCount} comps · {snapshot.layers.length} layers disclosure live</span>
        </div>
      </div>
    </div>
  );
}

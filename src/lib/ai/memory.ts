/**
 * AI Memory — persisted chat history, workflow log, and context.
 * Standard naming: AIChatMemory, AIMessage, AIWorkflowStep
 */

export type AIMessageRole = "user" | "assistant" | "system";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: number;
  snapshotAtSend?: string; // ID of snapshot
  workflow?: AIWorkflowStep[];
}

export interface AIWorkflowStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  timestamp: number;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIMessage[];
  workflowLog: AIWorkflowStep[];
  model?: string;
}

const LS_CHAT = "logicforge.ai.chat.sessions.v1";
const LS_ACTIVE = "logicforge.ai.chat.active.v1";

function uid(prefix = "m"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function loadSessions(): AIChatSession[] {
  try {
    const raw = localStorage.getItem(LS_CHAT);
    if (raw) {
      const arr = JSON.parse(raw) as AIChatSession[];
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

export function saveSessions(sessions: AIChatSession[]) {
  try {
    localStorage.setItem(LS_CHAT, JSON.stringify(sessions.slice(0, 30)));
  } catch {}
}

export function createSession(title = "New Chat"): AIChatSession {
  const now = Date.now();
  return {
    id: uid("sess_"),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    workflowLog: [],
  };
}

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string) {
  try {
    localStorage.setItem(LS_ACTIVE, id);
  } catch {}
}

export function addMessage(session: AIChatSession, msg: Omit<AIMessage, "id" | "timestamp"> & { id?: string }): AIMessage {
  const m: AIMessage = {
    id: msg.id ?? uid("msg_"),
    role: msg.role,
    content: msg.content,
    timestamp: Date.now(),
    snapshotAtSend: msg.snapshotAtSend,
    workflow: msg.workflow,
  };
  session.messages.push(m);
  session.updatedAt = Date.now();
  return m;
}

export function pushWorkflow(session: AIChatSession, label: string, status: AIWorkflowStep["status"] = "running", detail?: string): AIWorkflowStep {
  const step: AIWorkflowStep = { id: uid("wf_"), label, status, detail, timestamp: Date.now() };
  session.workflowLog.push(step);
  // keep last 80
  if (session.workflowLog.length > 80) session.workflowLog.splice(0, session.workflowLog.length - 80);
  session.updatedAt = Date.now();
  return step;
}

export function updateWorkflow(session: AIChatSession, id: string, patch: Partial<AIWorkflowStep>) {
  const hit = session.workflowLog.find((s) => s.id === id);
  if (hit) Object.assign(hit, patch, { timestamp: Date.now() });
  session.updatedAt = Date.now();
}

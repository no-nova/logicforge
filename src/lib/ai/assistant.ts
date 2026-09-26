/**
 * Mock AI Assistant — parses natural language and executes circuit commands.
 * Exposes executeAICommand which AI Chat window calls; also available via global bridge for external AI.
 * Standard naming: AICommand, AIResponse
 */
import type { EditorAPI } from "@/lib/sim/store";
import type { AISnapshot } from "@/lib/sim/aiSnapshot";
import { CATALOG } from "@/lib/sim/catalog";

export interface AICommandResult {
  success: boolean;
  message: string;
  actions: string[];
  workflow: { label: string; detail?: string }[];
}

export function executeAICommand(
  prompt: string,
  ed: EditorAPI,
  snapshot: AISnapshot
): AICommandResult {
  const lower = prompt.toLowerCase().trim();
  const actions: string[] = [];
  const workflow: { label: string; detail?: string }[] = [];

  const say = (msg: string) => ({ success: true, message: msg, actions, workflow });

  // Helper to find layer by name
  const findLayer = (name: string) => {
    const layers: any[] = (ed as any).layers ?? snapshot.layers;
    const hit = layers.find((l: any) => l.name.toLowerCase().includes(name.toLowerCase()) || l.id.toLowerCase() === name.toLowerCase());
    return hit;
  };

  // Detect move to layer intents
  if (/(move|send|put).*layer/.test(lower)) {
    workflow.push({ label: "Analyzing selection and layers", detail: `Selection: ${snapshot.selection.nodeIds.length} nodes` });
    const layerNames = snapshot.layers.map((l) => l.name.toLowerCase());
    let targetLayer: any = null;
    for (const ln of layerNames) {
      if (lower.includes(ln)) {
        targetLayer = findLayer(ln);
        break;
      }
    }
    // also try "background", "mid", "fore", "foreground"
    if (!targetLayer) {
      if (lower.includes("background") || lower.includes("bg")) targetLayer = findLayer("background");
      else if (lower.includes("mid")) targetLayer = findLayer("mid");
      else if (lower.includes("fore")) targetLayer = findLayer("fore");
    }
    // fallback to last mentioned layer id
    if (!targetLayer && snapshot.layers.length) {
      // try extract "layer X" phrase
      const m = lower.match(/layer\s+(\w+)/);
      if (m) targetLayer = findLayer(m[1]);
    }
    if (!targetLayer) {
      workflow.push({ label: "Resolving target layer", detail: "No layer matched, listing available" });
      return {
        success: false,
        message: `I couldn't identify the target layer. Available layers: ${snapshot.layers.map((l) => l.name).join(", ")}. Try "move selected to Foreground" or "move to Background".`,
        actions,
        workflow,
      };
    }
    const ids = snapshot.selection.nodeIds.length ? snapshot.selection.nodeIds : snapshot.nodes.slice(0, 1).map((n) => n.id);
    if (!ids.length) {
      return { success: false, message: "No components selected. Select one or more components first, or tell me which component to move (e.g., 'move AND gate to Midground').", actions, workflow };
    }
    workflow.push({ label: `Moving ${ids.length} component(s) to ${targetLayer.name}`, detail: ids.join(", ") });
    try {
      (ed as any).moveSelectionToLayer?.(targetLayer.id, ids);
      // also ensure committed
      if (!ids.length) {
        // fallback direct commit handled inside moveSelectionToLayer
      }
      actions.push(`moveSelectionToLayer(${targetLayer.id}, [${ids.join(", ")}])`);
      workflow.push({ label: "Update active layer", detail: targetLayer.name });
      (ed as any).setActiveLayer?.(targetLayer.id);
      return say(`Moved ${ids.length} component(s) to layer "${targetLayer.name}" and activated it. Current selection: ${ids.length} nodes. Layer snapshot updated.`);
    } catch (e: any) {
      return { success: false, message: `Failed to move: ${e?.message ?? String(e)}`, actions, workflow };
    }
  }

  if (/(create|add|place|insert).*?(and|or|not|nand|nor|xor|xnor|input|output|led|switch|clock|dff|mux|adder|counter)/.test(lower)) {
    workflow.push({ label: "Parsing component type from prompt" });
    const types = Object.keys(CATALOG).map((k) => k.toLowerCase());
    let found: string | null = null;
    for (const t of types) if (lower.includes(t)) { found = t.toUpperCase(); break; }
    if (!found && lower.includes("switch")) found = "INPUT";
    if (!found) found = "AND";
    workflow.push({ label: `Adding ${found} gate to canvas`, detail: `Type: ${found}` });
    try {
      const cx = snapshot.view.x + 400 / snapshot.view.z;
      const cy = snapshot.view.y + 250 / snapshot.view.z;
      const id = ed.addNode(found as any, cx, cy);
      actions.push(`addNode(${found}, ${cx}, ${cy}) -> ${id}`);
      return say(`Added ${found} component (${id}) near center of view. It is now selected. You can move it or connect it next.`);
    } catch (e: any) {
      return { success: false, message: `Failed to add: ${e?.message}`, actions, workflow };
    }
  }

  if (/(delete|remove).*(select|component|wire|all)/.test(lower)) {
    workflow.push({ label: "Deleting selected components/wires" });
    if (snapshot.selection.count === 0) return { success: false, message: "Nothing selected to delete.", actions, workflow };
    ed.deleteSelected();
    actions.push("deleteSelected()");
    workflow.push({ label: "Cleared selection", detail: `${snapshot.selection.count} items removed` });
    return say(`Deleted ${snapshot.selection.count} selected item(s).`);
  }

  if (/(duplicate|copy)/.test(lower) && /(select|component)/.test(lower)) {
    workflow.push({ label: "Duplicating selection" });
    const ids = ed.duplicateSelected();
    actions.push(`duplicateSelected() -> ${ids.join(",")}`);
    return say(`Duplicated ${ids.length} component(s): ${ids.join(", ")}.`);
  }

  if (/(rotate|turn)/.test(lower)) {
    ed.rotateSelected();
    actions.push("rotateSelected()");
    workflow.push({ label: "Rotated selection 90°" });
    return say("Rotated selected component(s) by 90°.");
  }

  if (/(connect|wire).*between/.test(lower) || (/connect/.test(lower) && snapshot.selection.nodeIds.length >= 2)) {
    workflow.push({ label: "Connecting selected nodes" });
    if (snapshot.selection.nodeIds.length >= 2) {
      const a = snapshot.selection.nodeIds[0];
      const b = snapshot.selection.nodeIds[1];
      try {
        ed.connect({ node: a, port: 0 }, { node: b, port: 0 });
        actions.push(`connect(${a}:0 -> ${b}:0)`);
        return say(`Connected ${a} port 0 → ${b} port 0.`);
      } catch (e: any) {
        return { success: false, message: `Connect failed: ${e?.message}`, actions, workflow };
      }
    }
    return { success: false, message: "Select two components then ask to connect them (e.g., 'connect selected').", actions, workflow };
  }

  if (/(explain|describe|what|analyze|status|how many|list)/.test(lower)) {
    workflow.push({ label: "Gathering circuit state", detail: `${snapshot.meta.nodeCount} nodes, ${snapshot.meta.wireCount} wires` });
    workflow.push({ label: "Analyzing layers and connections" });
    const lines = [
      `Circuit "${snapshot.meta.name}" has ${snapshot.meta.nodeCount} components and ${snapshot.meta.wireCount} wires.`,
      `Layers: ${snapshot.layers.map((l) => `${l.name} (${l.nodeCount})`).join(", ")} — active is "${snapshot.view.activeLayerName}".`,
      `Selection: ${snapshot.selection.nodeIds.length} nodes, ${snapshot.selection.wireIds.length} wires.`,
      `Regions: ${snapshot.regions.length} (${snapshot.regions.map((r) => r.name).join(", ") || "none"}).`,
      `Floating inputs: ${snapshot.sim.floating.length ? snapshot.sim.floating.join(", ") : "none"}.`,
      `Stable: ${snapshot.sim.stable ? "yes" : "oscillation detected"}.`,
    ];
    // Add per-node on/off summary for selected
    if (snapshot.selection.nodeIds.length) {
      lines.push(`Selected components:`);
      for (const id of snapshot.selection.nodeIds) {
        const n = snapshot.flattened.nodeById[id];
        if (n) lines.push(`- ${n.title} (${n.type}) at (${n.x},${n.y}) layer=${n.layerName} onOff=${n.runtime.onOff} wires=${n.connectionStatus.totalWires} locked=${n.locked}`);
      }
    }
    return say(lines.join("\n"));
  }

  if (/(help|what can you do|commands)/.test(lower)) {
    return say(
      `I can help with your circuit. Try:\n` +
        `• "move selected to Foreground" / "move AND gate to Background"\n` +
        `• "add AND gate" / "add INPUT" / "add LED"\n` +
        `• "delete selected" / "duplicate selected"\n` +
        `• "rotate selected" / "connect selected"\n` +
        `• "explain circuit" / "analyze selection" / "what's floating?"\n` +
        `I see ${snapshot.meta.nodeCount} components across ${snapshot.layers.length} layers. Which action would you like?`
    );
  }

  // Default: general assistant, echo snapshot context and offer help
  workflow.push({ label: "Interpreting general prompt", detail: prompt.slice(0, 80) });
  workflow.push({ label: "Checking circuit state", detail: `${snapshot.meta.nodeCount} nodes` });
  return say(
    `Got it: "${prompt}". I have full context on your circuit (${snapshot.meta.nodeCount} nodes, ${snapshot.meta.wireCount} wires, active layer "${snapshot.view.activeLayerName}"). ` +
      `I can move layers, add components, connect, duplicate, delete, or explain. Try "move selected to ${snapshot.layers[0]?.name ?? "Foreground"}" or "explain circuit".`
  );
}

export function generateTitleFromPrompt(prompt: string): string {
  const t = prompt.trim().slice(0, 48);
  return t.length < 3 ? "New Chat" : t;
}

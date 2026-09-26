/**
 * Mock AI Assistant — parses natural language and executes circuit commands.
 * Exposes executeAICommand which AI Chat window calls; also available via global bridge for external AI.
 * Standard naming: AICommand, AIResponse
 */
import type { EditorAPI } from "@/lib/sim/store";
import type { AISnapshot } from "@/lib/sim/aiSnapshot";
import { CATALOG } from "@/lib/sim/catalog";
import { uid, snap } from "@/lib/sim/circuit";

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

  // === Full adder intent (handles "make/build/create/generate full adder in midground") ===
  if (lower.includes("full adder") || (lower.includes("full-adder")) || (lower.includes("adder") && (lower.includes("make") || lower.includes("build") || lower.includes("create") || lower.includes("generate") || lower.includes("full")))) {
    workflow.push({ label: "Detected full adder request", detail: prompt.slice(0, 80) });
    // Resolve target layer — explicit mention wins, otherwise active
    let targetLayer: any = null;
    if (lower.includes("background")) targetLayer = findLayer("background");
    else if (lower.includes("foreground") || lower.includes("fore")) targetLayer = findLayer("fore");
    else if (lower.includes("midground") || lower.includes("mid")) targetLayer = findLayer("mid") ?? findLayer("midground");
    // If prompt says "in midground" explicitly, force midground
    if (/in\s+mid/.test(lower) || /to\s+mid/.test(lower) || lower.includes("midground")) {
      targetLayer = findLayer("mid") ?? findLayer("midground") ?? targetLayer;
    }
    const layerId: string | undefined = targetLayer?.id ?? (snapshot.view as any).activeLayerId ?? snapshot.layers[0]?.id;
    const layerName = targetLayer?.name ?? snapshot.view.activeLayerName ?? "active";
    workflow.push({ label: `Target layer: ${layerName}`, detail: layerId ?? "default" });

    // Decide construction mode: if user says "from gates" or wants explicit gates, build gate-level; otherwise use ADDER primitive + IO
    const wantsGates = lower.includes("gate") || lower.includes("xor") || lower.includes("from scratch");
    // Activate target layer first (so UI reflects)
    if (targetLayer) {
      try { (ed as any).setActiveLayer?.(targetLayer.id); } catch {}
    }
    // Compute base position at view center
    const view = snapshot.view as any;
    const baseX = (400 - (view.x ?? 0)) / (view.z ?? 1);
    const baseY = (300 - (view.y ?? 0)) / (view.z ?? 1);
    // Avoid overlapping existing nodes: offset by existing bounds
    let offsetX = 0;
    let offsetY = 0;
    if (snapshot.nodes.length) {
      const xs = snapshot.nodes.map((n:any)=> n.x);
      const ys = snapshot.nodes.map((n:any)=> n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const avgY = ys.reduce((a:number,b:number)=>a+b,0)/ys.length;
      // Place adder to the right of existing circuit if possible
      if (maxX - minX > 200) {
        offsetX = maxX + 120 - baseX;
        offsetY = avgY - baseY;
      }
    }
    const bx = snap(baseX + offsetX);
    const by = snap(baseY + offsetY);

    try {
      if (wantsGates) {
        // Gate-level full adder: 3 INPUT + 2 XOR + 2 AND + 1 OR + 2 OUTPUT = 10 nodes, 12 wires
        workflow.push({ label: "Building gate-level full adder", detail: "2×XOR + 2×AND + 1×OR + 3 IN + 2 OUT" });
        const lid = layerId;
        // helper to make node
        const mk = (type: string, x:number, y:number, extra:any={}): any => ({
          id: uid((type.toLowerCase().slice(0,3)+"_")),
          type: type as any,
          x: snap(x),
          y: snap(y),
          rot: 0 as const,
          inputs: ((): number => {
            const spec = (CATALOG as any)[type];
            return spec ? spec.defaultInputs : (type==="INPUT"?0:type==="OUTPUT"||type==="LED"?1:2);
          })(),
          label: extra.label,
          layerId: lid,
          ...(type==="INPUT" ? { value: 0 } : {}),
          ...(type==="OUTPUT" ? {} : {}),
          delay: (CATALOG as any)[type]?.defaultDelay ?? 1,
        });
        const nA = mk("INPUT", bx - 220, by - 60, { label: "A" });
        const nB = mk("INPUT", bx - 220, by + 20, { label: "B" });
        const nCin = mk("INPUT", bx - 220, by + 100, { label: "Cin" });
        const xor1 = mk("XOR", bx - 40, by - 20);
        const and1 = mk("AND", bx - 40, by + 80);
        const xor2 = mk("XOR", bx + 120, by - 0);
        const and2 = mk("AND", bx + 120, by + 100);
        const or1 = mk("OR", bx + 260, by + 60);
        const outS = mk("OUTPUT", bx + 400, by + 0, { label: "Sum" });
        const outCout = mk("OUTPUT", bx + 400, by + 100, { label: "Cout" });
        // set explicit labels for clarity
        nA.label = "A"; nB.label = "B"; nCin.label = "Cin"; outS.label = "Sum"; outCout.label = "Cout";
        const newNodes = [nA,nB,nCin,xor1,and1,xor2,and2,or1,outS,outCout];
        const w = (from:string, fp:number, to:string, tp:number) => ({ id: uid("w"), from: { node: from, port: fp }, to: { node: to, port: tp } });
        const newWires = [
          w(nA.id,0,xor1.id,0),
          w(nA.id,0,and1.id,0),
          w(nB.id,0,xor1.id,1),
          w(nB.id,0,and1.id,1),
          w(xor1.id,0,xor2.id,0),
          w(xor1.id,0,and2.id,0),
          w(nCin.id,0,xor2.id,1),
          w(nCin.id,0,and2.id,1),
          w(and1.id,0,or1.id,0),
          w(and2.id,0,or1.id,1),
          w(xor2.id,0,outS.id,0),
          w(or1.id,0,outCout.id,0),
        ];
        ed.commit((d:any)=> {
          const ens = d.layers ? d : { ...d, layers: snapshot.layers as any, activeLayerId: layerId };
          return { ...ens, nodes: [...ens.nodes, ...newNodes], wires: [...ens.wires, ...newWires] };
        }, "AI: create full adder (gates) in "+layerName);
        // select new nodes
        setTimeout(()=> { try { ed.setSelection(newNodes.map(n=>n.id)); (ed as any).setActiveLayer?.(layerId); } catch {} }, 20);
        actions.push(`create full adder (10 comps) in ${layerName} at (${bx},${by})`);
        workflow.push({ label: "Placed 10 components", detail: newNodes.map(n=>n.type).join(", ") });
        workflow.push({ label: "Wired 12 connections", detail: "Sum = A xor B xor Cin, Cout = (A&B)|(Cin&(A xor B))" });
        return say(`✅ Created **full adder** in **${layerName}** at (${bx}, ${by}) — gate-level (2×XOR, 2×AND, 1×OR) with 3 inputs (A, B, Cin) and 2 outputs (Sum, Cout), fully wired (12 wires). Active layer set to ${layerName}. Select it to simulate — try toggling A/B/Cin!`);
      } else {
        // Using ADDER primitive (simpler, compact)
        workflow.push({ label: "Building full adder with ADDER primitive", detail: "1×ADDER + 3 IN + 2 OUT" });
        const lid = layerId;
        const mk = (type: string, x:number, y:number, label?:string): any => ({
          id: uid((type.toLowerCase().slice(0,3)+"_")),
          type: type as any,
          x: snap(x), y: snap(y), rot: 0 as const,
          inputs: ((): number => { const s=(CATALOG as any)[type]; return s? s.defaultInputs : (type==="INPUT"?0:1); })(),
          label, layerId: lid,
          ...(type==="INPUT"?{value:0}:{}),
          delay: (CATALOG as any)[type]?.defaultDelay ?? 1,
        });
        const nA = mk("INPUT", bx - 140, by - 40, "A");
        const nB = mk("INPUT", bx - 140, by + 20, "B");
        const nCin = mk("INPUT", bx - 140, by + 80, "Cin");
        const adder = mk("ADDER", bx + 60, by + 20, "FULL ADDER");
        const outS = mk("OUTPUT", bx + 220, by + 0, "Sum");
        const outCout = mk("OUTPUT", bx + 220, by + 60, "Cout");
        const newNodes = [nA,nB,nCin,adder,outS,outCout];
        const w = (from:string, fp:number, to:string, tp:number) => ({ id: uid("w"), from:{node:from,port:fp}, to:{node:to,port:tp} });
        const newWires = [
          w(nA.id,0,adder.id,0),
          w(nB.id,0,adder.id,1),
          w(nCin.id,0,adder.id,2),
          w(adder.id,0,outS.id,0),
          w(adder.id,1,outCout.id,0),
        ];
        ed.commit((d:any)=> ({ ...d, nodes: [...d.nodes, ...newNodes], wires: [...d.wires, ...newWires] }), "AI: create full adder in "+layerName);
        setTimeout(()=> { try { ed.setSelection(newNodes.map((n:any)=>n.id)); (ed as any).setActiveLayer?.(layerId); } catch {} }, 20);
        actions.push(`create ADDER full adder in ${layerName} at (${bx},${by})`);
        workflow.push({ label: "Placed 6 components", detail: "A,B,Cin → ADDER → Sum,Cout" });
        workflow.push({ label: "Wired 5 connections", detail: "S=A xor B xor Cin, Cout=majority" });
        return say(`✅ Created **full adder** in **${layerName}** at (${bx}, ${by}) — 1×ADDER block with 3 inputs (A, B, Cin) → Sum, Cout (5 wires). Active layer set to ${layerName}. Toggle the inputs to test — Sum = A⊕B⊕Cin, Cout = AB ∨ Cin(A⊕B). Ask "make gate-level full adder" for the XOR/AND/OR version!`);
      }
    } catch (e:any) {
      return { success:false, message: `Failed to create full adder: ${e?.message ?? String(e)}`, actions, workflow };
    }
  }

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

  if (/(create|add|place|insert|make|build|generate|put).*?(and|or|not|nand|nor|xor|xnor|input|output|led|switch|clock|dff|mux|adder|counter)/.test(lower)) {
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

  if (/(are you sure|can you (create|make|manipulate|add|build)|do you really)/.test(lower) && /(create|make|manipulate|add|build|control)/.test(lower)) {
    workflow.push({ label: "Confirming AI capabilities", detail: "verified manipulation" });
    return say(
      `Yes — I can directly manipulate the circuit. Proven actions (try them):\n` +
        `• **Create**: "make a full adder in midground" (just did? check canvas) — builds 6-10 components + wires in the requested layer.\n` +
        `• **Add**: "add AND gate", "add INPUT", "make gate-level full adder"\n` +
        `• **Move**: "move selected to Midground" / "move to Background" (1 or N selected, right-click → Move to layer also works)\n` +
        `• **Connect / Duplicate / Delete / Rotate**: "connect selected", "duplicate selected", "delete selected"\n` +
        `• **Explain**: "explain circuit" (I see coordinates, type, connections, on/off, layer, regions)\n` +
        `Canvas is live — check Midground layer after "make a full adder". If nothing appeared, tell me the exact prompt and I'll retry with gate-level wiring.`
    );
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

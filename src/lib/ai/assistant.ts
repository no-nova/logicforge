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

  // === 8-bit adder / N-bit calculator intent (constrained) ===
  // Handles "8-bit addition calculator", "8 bit adder", "8-bit adder" with possible constraints like "only uses switch, LED, OR, XOR" and "current layer"
  const is8Bit = (lower.includes("8-bit") || lower.includes("8 bit") || lower.includes("8bit")) && (lower.includes("add") || lower.includes("calcul") || lower.includes("adder"));
  const isConstrainedORXOR = (lower.includes("only") && lower.includes("or") && lower.includes("xor")) || (lower.includes("only uses") && lower.includes("switch") && lower.includes("led"));
  const wantsCurrentLayer = lower.includes("current layer") || lower.includes("current") && lower.includes("layer");
  const forbidCustom = lower.includes("custom") && (lower.includes("not allowed") || lower.includes("no custom") || lower.includes("without custom")) || lower.includes("custom components are not allowed");

  if (is8Bit) {
    // 8-bit ripple-carry adder on target layer (current layer if specified, else active/midground)
    workflow.push({ label: "Detected 8-bit adder request", detail: prompt.slice(0, 80) });
    let targetLayer: any = null;
    if (lower.includes("midground") || lower.includes("mid")) targetLayer = findLayer("mid") ?? findLayer("midground");
    else if (lower.includes("background")) targetLayer = findLayer("background");
    else if (lower.includes("foreground") || lower.includes("fore")) targetLayer = findLayer("fore");
    else if (wantsCurrentLayer) targetLayer = null; // use active
    // If explicitly current layer, use active
    const layerId: string | undefined = targetLayer?.id ?? (snapshot.view as any).activeLayerId ?? snapshot.layers[0]?.id;
    const layerName = targetLayer?.name ?? (wantsCurrentLayer ? (snapshot.view.activeLayerName ?? "current") : (snapshot.view.activeLayerName ?? "active"));
    workflow.push({ label: `Target layer: ${layerName}`, detail: layerId ?? "default" });
    if (targetLayer) try { (ed as any).setActiveLayer?.(targetLayer.id); } catch {}
    const view = snapshot.view as any;
    const baseX0 = (400 - (view.x ?? 0)) / (view.z ?? 1);
    const baseY0 = (300 - (view.y ?? 0)) / (view.z ?? 1);
    let offX = 0, offY = 0;
    if (snapshot.nodes.length) {
      const xs = snapshot.nodes.map((n:any)=> n.x);
      const ys = snapshot.nodes.map((n:any)=> n.y);
      const maxX = Math.max(...xs);
      const avgY = ys.reduce((a:number,b:number)=>a+b,0)/ys.length;
      if (Math.max(...xs) - Math.min(...xs) > 200) {
        offX = maxX + 180 - baseX0;
        offY = avgY - baseY0;
      }
    }
    const bx = snap(baseX0 + offX);
    const by0 = snap(baseY0 + offY);
    // Use only allowed types if constrained, otherwise default to allowed set anyway (switch/LED/OR/XOR) as requested
    const useOnlyORXOR = true; // for 8-bit calculator, always respect "only switch, LED, OR, XOR" — don't use AND/ADDER
    workflow.push({ label: `Building 8-bit adder`, detail: useOnlyORXOR ? "16×INPUT(switch) + 9×LED + 56×XOR/OR (AND via OR+XOR)" : "using ADDER" });
    try {
      const lid = layerId;
      const mk = (type: string, x:number, y:number, label?:string): any => ({
        id: uid((type.toLowerCase().slice(0,3)+"_")),
        type: type as any,
        x: snap(x), y: snap(y), rot: 0 as const,
        inputs: ((): number => { const s=(CATALOG as any)[type]; return s? s.defaultInputs : (type==="INPUT"?0:type==="LED"?1:2); })(),
        label, layerId: lid,
        ...(type==="INPUT"?{value:0}:{}),
        delay: (CATALOG as any)[type]?.defaultDelay ?? 1,
      });
      const newNodes: any[] = [];
      const newWires: any[] = [];
      const w = (from:string, fp:number, to:string, tp:number) => ({ id: uid("w"), from:{node:from,port:fp}, to:{node:to,port:tp} });
      // Create Cin0 switch for LSB
      const cin0 = mk("INPUT", bx - 340, by0 - 320, "Cin0");
      cin0.label = "Cin0";
      newNodes.push(cin0);
      // For each bit 0..7
      const bitCoutOrIds: string[] = [];
      const bitSumXorIds: string[] = [];
      for (let i=0;i<8;i++) {
        const y = by0 + i*90 - 315; // centered vertical stack
        const xBase = bx - 80; // center of gates for this bit
        // Inputs A_i, B_i
        const a = mk("INPUT", bx - 280, y, `A${i}`);
        a.label = `A${i}`;
        const b = mk("INPUT", bx - 280, y+30, `B${i}`);
        b.label = `B${i}`;
        newNodes.push(a,b);
        // Gates for this bit (7 gates)
        const xor_ab = mk("XOR", xBase - 40, y+5);
        const or_ab = mk("OR", xBase - 40, y+35);
        const and1_xor = mk("XOR", xBase + 40, y+15); // AND via XOR(OR,XOR)
        const xor_c = mk("XOR", xBase + 120, y+5); // also Sum
        const or_c = mk("OR", xBase + 120, y+35);
        const and2_xor = mk("XOR", xBase + 200, y+15);
        const cout_or = mk("OR", xBase + 280, y+15);
        // LED for sum
        const sumLed = mk("LED", bx + 380, y+15, `S${i}`);
        sumLed.label = `S${i}`;
        newNodes.push(xor_ab, or_ab, and1_xor, xor_c, or_c, and2_xor, cout_or, sumLed);
        // Wires for this bit's internal logic (except Cin which may be from previous)
        // A->xor_ab, A->or_ab, B->xor_ab, B->or_ab
        newWires.push(w(a.id,0,xor_ab.id,0));
        newWires.push(w(a.id,0,or_ab.id,0));
        newWires.push(w(b.id,0,xor_ab.id,1));
        newWires.push(w(b.id,0,or_ab.id,1));
        // xor_ab & or_ab -> and1_xor (AND1)
        newWires.push(w(xor_ab.id,0,and1_xor.id,0));
        newWires.push(w(or_ab.id,0,and1_xor.id,1));
        // xor_ab and Cin -> xor_c and or_c
        // Cin source: for i=0, cin0; for i>0, previous cout_or
        const cinSourceId = i===0 ? cin0.id : bitCoutOrIds[i-1];
        newWires.push(w(xor_ab.id,0,xor_c.id,0));
        newWires.push(w(cinSourceId,0,xor_c.id,1));
        newWires.push(w(xor_ab.id,0,or_c.id,0));
        newWires.push(w(cinSourceId,0,or_c.id,1));
        // or_c & xor_c -> and2_xor
        newWires.push(w(or_c.id,0,and2_xor.id,0));
        newWires.push(w(xor_c.id,0,and2_xor.id,1));
        // and1 & and2 -> cout_or
        newWires.push(w(and1_xor.id,0,cout_or.id,0));
        newWires.push(w(and2_xor.id,0,cout_or.id,1));
        // xor_c -> sum LED
        newWires.push(w(xor_c.id,0,sumLed.id,0));
        // remember for next iteration
        bitCoutOrIds.push(cout_or.id);
        bitSumXorIds.push(xor_c.id);
      }
      // Final Cout LED from last cout_or
      const finalCout = mk("LED", bx + 380, by0 + 7*90 -315 + 45, "Cout");
      finalCout.label = "Cout";
      newNodes.push(finalCout);
      newWires.push(w(bitCoutOrIds[7],0,finalCout.id,0));

      ed.commit((d:any)=> ({ ...d, nodes: [...d.nodes, ...newNodes], wires: [...d.wires, ...newWires] }), "AI: create 8-bit adder (OR/XOR only) in "+layerName);
      setTimeout(()=> { try { ed.setSelection(newNodes.map((n:any)=>n.id)); if (layerId) (ed as any).setActiveLayer?.(layerId); } catch {} }, 20);
      actions.push(`create 8-bit adder (16 switches +9 LEDs +56 gates) in ${layerName} at (${bx},${by0})`);
      workflow.push({ label: `Placed ${newNodes.length} components`, detail: `16×INPUT, 9×LED, 32×XOR, 24×OR` });
      workflow.push({ label: `Wired ${newWires.length} connections`, detail: "ripple-carry, AND via OR+XOR" });
      return say(`✅ Created **8-bit addition calculator** in **${layerName}** at (${bx}, ${by0}) — **only** \`switch\` (INPUT), \`LED\`, \`OR\`, \`XOR\` (no custom, no AND/ADDER). 16 switches (A0-7, B0-7 + Cin0), 8 sum LEDs (S0-7) + Cout LED, 56 gates (4×XOR +3×OR per bit with AND synthesized as \`XOR(OR,XOR)\`). Ripple-carry fully wired (${newWires.length} wires). Layer: ${layerName}. Toggle A/B to test — e.g., A=00000011 + B=00000001 → S=00000100, Cout=0.`);
    } catch (e:any) {
      return { success:false, message: `Failed to create 8-bit adder: ${e?.message ?? String(e)}`, actions, workflow };
    }
  }

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
    // If prompt says "only uses switch, LED, OR, XOR" or "only OR and XOR" etc., force constrained OR/XOR synthesis (no AND/ADDER, no custom)
    const constrainedORXOR = (lower.includes("only") && lower.includes("or") && lower.includes("xor")) || (lower.includes("only uses") && lower.includes("switch") && lower.includes("led")) || lower.includes("only uses switch, led, or, and xor");
    const wantsGates = constrainedORXOR || lower.includes("gate") || lower.includes("xor") || lower.includes("from scratch");
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
        if (constrainedORXOR) {
          // Constrained: only switch(INPUT), LED, OR, XOR — synthesize AND via XOR(OR,XOR), use LED for outputs
          workflow.push({ label: "Building constrained full adder", detail: "only OR/XOR + switch/LED (AND via XOR(OR,XOR))" });
          const lid = layerId;
          const mk = (type: string, x:number, y:number, extra:any={}): any => ({
            id: uid((type.toLowerCase().slice(0,3)+"_")),
            type: type as any,
            x: snap(x),
            y: snap(y),
            rot: 0 as const,
            inputs: ((): number => { const spec = (CATALOG as any)[type]; return spec ? spec.defaultInputs : (type==="INPUT"?0:type==="LED"?1:2); })(),
            label: extra.label,
            layerId: lid,
            ...(type==="INPUT" ? { value: 0 } : {}),
            delay: (CATALOG as any)[type]?.defaultDelay ?? 1,
          });
          const nA = mk("INPUT", bx - 220, by - 60, { label: "A" });
          const nB = mk("INPUT", bx - 220, by + 20, { label: "B" });
          const nCin = mk("INPUT", bx - 220, by + 100, { label: "Cin" });
          // AND via OR+XOR: and = XOR(OR(a,b), XOR(a,b))
          const xor_ab = mk("XOR", bx - 40, by - 20);
          const or_ab = mk("OR", bx - 40, by + 10);
          const and1 = mk("XOR", bx + 40, by - 5); // will be XOR(or_ab, xor_ab) = A&B
          const xor_c = mk("XOR", bx + 120, by - 0); // also Sum = xor_ab xor Cin
          const or_c = mk("OR", bx + 120, by + 30);
          const and2 = mk("XOR", bx + 200, by - 5); // = (xor_ab & Cin)
          const or_out = mk("OR", bx + 280, by + 15); // Cout = and1 or and2
          const outS = mk("LED", bx + 400, by + 0, { label: "Sum" });
          const outCout = mk("LED", bx + 400, by + 60, { label: "Cout" });
          nA.label="A"; nB.label="B"; nCin.label="Cin"; outS.label="Sum"; outCout.label="Cout";
          const newNodes = [nA,nB,nCin,xor_ab,or_ab,and1,xor_c,or_c,and2,or_out,outS,outCout];
          const w = (from:string, fp:number, to:string, tp:number) => ({ id: uid("w"), from: { node: from, port: fp }, to: { node: to, port: tp } });
          const newWires = [
            w(nA.id,0,xor_ab.id,0), w(nA.id,0,or_ab.id,0),
            w(nB.id,0,xor_ab.id,1), w(nB.id,0,or_ab.id,1),
            w(xor_ab.id,0,and1.id,0), w(or_ab.id,0,and1.id,1),
            w(xor_ab.id,0,xor_c.id,0), w(nCin.id,0,xor_c.id,1),
            w(xor_ab.id,0,or_c.id,0), w(nCin.id,0,or_c.id,1),
            w(or_c.id,0,and2.id,0), w(xor_c.id,0,and2.id,1),
            w(and1.id,0,or_out.id,0), w(and2.id,0,or_out.id,1),
            w(xor_c.id,0,outS.id,0), w(or_out.id,0,outCout.id,0),
          ];
          ed.commit((d:any)=> {
            const ens = d.layers ? d : { ...d, layers: snapshot.layers as any, activeLayerId: layerId };
            return { ...ens, nodes: [...ens.nodes, ...newNodes], wires: [...ens.wires, ...newWires] };
          }, "AI: create constrained full adder in "+layerName);
          setTimeout(()=> { try { ed.setSelection(newNodes.map(n=>n.id)); (ed as any).setActiveLayer?.(layerId); } catch {} }, 20);
          actions.push(`create constrained full adder (only OR/XOR) in ${layerName} at (${bx},${by})`);
          workflow.push({ label: "Placed 12 components", detail: newNodes.map(n=>n.type).join(", ") });
          workflow.push({ label: "Wired 16 connections", detail: "AND via XOR(OR,XOR), no custom" });
          return say(`✅ Created **full adder (constrained)** in **${layerName}** at (${bx}, ${by}) — **only** \`switch\` (INPUT), \`LED\`, \`OR\`, \`XOR\` (no AND, no custom, no ADDER). 3 switches (A,B,Cin) + 2 LEDs (Sum, Cout) + 4×XOR +3×OR = 12 components, 16 wires with AND synthesized as \`XOR(OR,XOR)\`. Active layer: ${layerName}. Toggle A/B/Cin to test!`);
        }
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

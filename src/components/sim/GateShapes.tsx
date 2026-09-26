export function gateShape(type: string, w: number, h: number): { body: string; bubble: boolean; arch?: string } {
  const r = h / 2;
  if (type === "AND") {
    return { body: `M0 0 H${w - r} A${r} ${r} 0 0 1 ${w - r} ${h} H0 Z`, bubble: false };
  }
  if (type === "NAND") {
    return { body: `M0 0 H${w - r - 10} A${r} ${r} 0 0 1 ${w - r - 10} ${h} H0 Z`, bubble: true };
  }
  if (type === "BUFFER") {
    return { body: `M0 0 L${w} ${h / 2} L0 ${h} Z`, bubble: false };
  }
  if (type === "NOT") {
    return { body: `M0 0 L${w - 10} ${h / 2} L0 ${h} Z`, bubble: true };
  }
  const orPath = (offset = 0, tipInset = 0) => {
    const left = 0.18 * w + offset;
    const ctrlConcave = 0.28 * w + offset;
    const c1 = 0.38 * w + offset;
    const c2 = 0.62 * w + offset;
    const tipX = w - tipInset;
    return `M${left} 0 C${c1} 0 ${c2} ${h * 0.12} ${tipX} ${h / 2} C${c2} ${h * 0.88} ${c1} ${h} ${left} ${h} C${ctrlConcave} ${h * 0.68} ${ctrlConcave} ${h * 0.32} ${left} 0 Z`;
  };
  if (type === "OR") return { body: orPath(0, 0), bubble: false };
  if (type === "NOR") return { body: orPath(0, 10), bubble: true };
  if (type === "XOR") {
    return { body: orPath(12, 0), bubble: false, arch: `M0 0 C${w * 0.12} ${h * 0.32} ${w * 0.12} ${h * 0.68} 0 ${h}` };
  }
  if (type === "XNOR") {
    return { body: orPath(12, 10), bubble: true, arch: `M0 0 C${w * 0.12} ${h * 0.32} ${w * 0.12} ${h * 0.68} 0 ${h}` };
  }
  // fallback
  return { body: `M0 0 H${w} V${h} H0 Z`, bubble: false };
}

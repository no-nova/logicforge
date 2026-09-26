import { portCounts } from "./catalog";
import type { CNode, CustomDef } from "./types";

/**
 * Standard, descriptive geometry helpers for the circuit canvas.
 * Legacy short names (uid, GRID, snap, nodeSize, localPort, portPos, portDir)
 * are kept as aliases for backward compatibility — new code should use the
 * descriptive exports below.
 */

let uniqueIdCounter = 0;

/** Generate a unique identifier with a prefix — standard replacement for `uid`. */
export const generateUniqueId = (prefix = "n"): string =>
  `${prefix}${Date.now().toString(36).slice(-5)}${(uniqueIdCounter++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;

/** Legacy alias */
export const uid = generateUniqueId;

/** Standard grid size for canvas snapping */
export const GRID_SIZE = 20;
/** Legacy alias */
export const GRID = GRID_SIZE;

/** Snap a coordinate to the grid — standard replacement for `snap`. */
export const snapToGrid = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;
/** Legacy alias */
export const snap = snapToGrid;

/** Calculate the rendered size of a node — standard replacement for `nodeSize`. */
export function getNodeSize(node: CNode, customDefinitions: CustomDef[]): { w: number; h: number } {
  const { ins, outs } = portCounts(node, customDefinitions);
  if (node.type === "TEXT") {
    // Text box: width based on longest line, height based on line count
    const textContent = node.text ?? node.label ?? "Note";
    const lines = String(textContent).split("\n");
    const longest = Math.max(...lines.map((l) => l.length), 8);
    const width = Math.min(320, Math.max(120, longest * 7 + 24));
    const height = Math.max(48, lines.length * 16 + 24);
    return { w: width, h: height };
  }
  if (node.type === "VCC" || node.type === "GND") return { w: 56, h: 40 };
  if (node.type === "LED") return { w: 64, h: 64 };
  if (node.type === "INPUT" || node.type === "OUTPUT" || node.type === "CLOCK") return { w: 80, h: 50 };
  // Cap component icons to switch size — no gate larger than Switch (80×50)
  const rowCount = Math.max(ins, outs, 1);
  const isSmallGate = ["AND","OR","NOT","NAND","NOR","XOR","XNOR","BUFFER"].includes(node.type);
  if (isSmallGate) {
    return { w: 80, h: Math.max(46, 24 + rowCount * 16) };
  }
  const width = node.type === "CUSTOM" ? 92 : node.type === "COUNTER" || node.type === "MUX4" ? 88 : 80;
  return { w: width, h: Math.max(50, 26 + rowCount * 18) };
}
/** Legacy alias */
export const nodeSize = getNodeSize;

/** Calculate the local (unrotated) position of a port — standard for `localPort`. */
export function getLocalPortPosition(
  node: CNode,
  customDefinitions: CustomDef[],
  direction: "in" | "out",
  portIndex: number,
): { x: number; y: number } {
  const { w, h } = getNodeSize(node, customDefinitions);
  const { ins, outs } = portCounts(node, customDefinitions);
  const portCount = direction === "in" ? ins : outs;
  const y = portCount <= 1 ? h / 2 : 16 + ((h - 28) * portIndex) / Math.max(1, portCount - 1);
  if (direction === "in") return { x: 0, y };
  // Bubble gates: port at bubble tip (bubble center + radius)
  if (["NOT","NAND","NOR","XNOR"].includes(node.type)) {
    const r = h / 2;
    let bubbleX: number;
    if (node.type === "NOT") bubbleX = w - 5;
    else if (node.type === "NAND") bubbleX = w - r - 5;
    else if (node.type === "NOR" || node.type === "XNOR") bubbleX = w - 5;
    else bubbleX = w - 5;
    return { x: bubbleX + 5, y };
  }
  return { x: w, y };
}
/** Legacy alias */
export const localPort = getLocalPortPosition;

/** Calculate the world position of a port, accounting for rotation — standard for `portPos`. */
export function getPortPosition(
  node: CNode,
  customDefinitions: CustomDef[],
  direction: "in" | "out",
  portIndex: number,
): { x: number; y: number } {
  const { w, h } = getNodeSize(node, customDefinitions);
  const localPosition = getLocalPortPosition(node, customDefinitions, direction, portIndex);
  const centerX = w / 2;
  const centerY = h / 2;
  const angleRadians = (node.rot * Math.PI) / 180;
  const deltaX = localPosition.x - centerX;
  const deltaY = localPosition.y - centerY;
  return {
    x: node.x + centerX + (deltaX * Math.cos(angleRadians) - deltaY * Math.sin(angleRadians)),
    y: node.y + centerY + (deltaX * Math.sin(angleRadians) + deltaY * Math.cos(angleRadians)),
  };
}
/** Legacy alias */
export const portPos = getPortPosition;

/** Calculate the outward direction vector of a port — standard for `portDir`. */
export function getPortDirection(node: CNode, direction: "in" | "out"): { x: number; y: number } {
  const baseDirection = direction === "in" ? -1 : 1;
  const angleRadians = (node.rot * Math.PI) / 180;
  return { x: baseDirection * Math.cos(angleRadians), y: baseDirection * Math.sin(angleRadians) };
}
/** Legacy alias */
export const portDir = getPortDirection;

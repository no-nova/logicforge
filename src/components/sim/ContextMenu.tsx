import type { ReactNode } from "react";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Renders a divider directly above this item. */
  divider?: boolean;
}

/**
 * Small floating action menu used for right-click (and two-finger-tap, on a
 * trackpad) context actions on the canvas. Positioned at a fixed screen
 * point and clamped to stay on-screen; a full-viewport transparent overlay
 * behind it closes the menu on any outside click or a second right-click.
 */
export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  if (!items.length) return null;
  const W = 190;
  const H = items.length * 30 + items.filter((i) => i.divider).length * 9 + 8;
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : x + W) - W - 8);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : y + H) - H - 8);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={(e) => {
          // Stop this from bubbling any further — the canvas underneath has
          // its own pointerdown handler (for marquee-select/pan) that we
          // don't want to also fire when the only intent here is "dismiss
          // the menu".
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="fixed z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 text-xs shadow-[var(--shadow)]"
        style={{ left: Math.max(8, left), top: Math.max(8, top), width: W }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          // Critical: without this, a pointerdown on a menu button bubbles
          // up to the canvas container, whose own onPointerDown closes this
          // menu (setMenu(null)) synchronously. That unmounts the button
          // before the browser gets to fire the follow-up "click" event, so
          // the action (Copy, Delete, ...) silently never runs — the exact
          // "right-click Copy does nothing" bug.
          e.stopPropagation();
        }}
      >
        {items.map((it, i) => (
          <div key={i}>
            {it.divider && <div className="my-1 h-px bg-[var(--border)]" />}
            <button
              type="button"
              disabled={it.disabled}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel2)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              style={it.danger && !it.disabled ? { color: "var(--xx)" } : undefined}
              onClick={() => {
                it.onSelect();
                onClose();
              }}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

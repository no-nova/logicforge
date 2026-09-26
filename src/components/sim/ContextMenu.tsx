import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  /** Second-level submenu — continuity: always there, only state changes */
  children?: MenuItem[];
}

/**
 * Layered floating menu with second/third-level submenus, blurred backdrops and
 * Apple-continuity animations (scale/blur). Clicking outside dismisses.
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
  const W = 210;
  const H = items.length * 32 + items.filter((i) => i.divider).length * 9 + 10;
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : x + W) - W - 8);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : y + H) - H - 8);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={(e) => {
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
        className="fixed z-50 overflow-visible rounded-xl border border-[var(--border)] bg-[var(--panel)]/96 py-1.5 text-xs shadow-[var(--shadow)] backdrop-blur-xl animate-[menuIn_180ms_cubic-bezier(.2,.8,.2,1)]"
        style={
          {
            left: Math.max(8, left),
            top: Math.max(8, top),
            width: W,
            backdropFilter: "blur(16px) saturate(1.15)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.12)",
          } as any
        }
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* subtle painting edge highlight for layered depth */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent opacity-60" />
        {items.map((it, i) => (
          <div key={i}>
            {it.divider && <div className="my-1 h-px bg-[var(--border)]/70" />}
            {it.children && it.children.length ? (
              <SubMenu item={it} onClose={onClose} />
            ) : (
              <button
                type="button"
                disabled={it.disabled}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-medium text-[var(--text)] transition-all duration-200 hover:bg-[var(--panel2)] hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                style={it.danger && !it.disabled ? { color: "var(--xx)" } : undefined}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (it.disabled) return;
                  try { it.onSelect?.(); } catch (err) { console.error(err); }
                  setTimeout(() => onClose(), 10);
                }}
              >
                {it.icon && <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--panel2)] text-[var(--muted)]">{it.icon}</span>}
                <span className="flex-1">{it.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes menuIn{0%{opacity:0;transform:scale(.96) translateY(4px);filter:blur(6px)}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}}`}</style>
    </>
  );
}

function SubMenu({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const scheduleClose = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(false), 160);
  };
  useEffect(() => {
    return () => clearTimer();
  }, []);
  return (
    <div
      className="relative"
      onPointerEnter={() => {
        clearTimer();
        setOpen(true);
      }}
      onPointerLeave={scheduleClose}
      onFocus={() => setOpen(true)}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        disabled={item.disabled}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel2)]"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {item.icon && <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--panel2)] text-[var(--muted)]">{item.icon}</span>}
        <span className="flex-1">{item.label}</span>
        <ChevronRight className="size-3.5 text-[var(--muted)]" />
      </button>
      {open && (
        <div
          className="absolute left-full top-0 z-10 ml-1 min-w-44 overflow-visible rounded-xl border border-[var(--border)] bg-[var(--panel)]/96 py-1.5 shadow-[var(--shadow)] backdrop-blur-xl animate-[menuIn_160ms_cubic-bezier(.2,.8,.2,1)]"
          onPointerEnter={() => {
            clearTimer();
            setOpen(true);
          }}
          onPointerLeave={scheduleClose}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--accent)]/20" />
          {item.children!.map((ch, idx) => (
            <div key={idx}>
              {ch.divider && <div className="my-1 h-px bg-[var(--border)]/60" />}
              {ch.children ? (
                <SubMenu item={ch} onClose={onClose} />
              ) : (
                <button
                  type="button"
                  disabled={ch.disabled}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-[var(--text)] hover:bg-[var(--panel2)] disabled:opacity-40"
                  style={ch.danger ? { color: "var(--xx)" } : undefined}
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (ch.disabled) return;
                    try { ch.onSelect?.(); } catch (err) { console.error(err); }
                    // Close after action — timeout ensures state flush for N-move & AI chat
                    setTimeout(() => onClose(), 10);
                  }}
                >
                  {ch.icon}
                  <span>{ch.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

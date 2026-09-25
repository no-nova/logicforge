import { useCallback, useEffect, useRef, useState } from "react";

export interface View {
  x: number;
  y: number;
  z: number;
}

export const MIN_Z = 0.18;
export const MAX_Z = 3.2;

export function clampZ(z: number) {
  return Math.min(MAX_Z, Math.max(MIN_Z, z));
}

export function zoomToward(view: View, mx: number, my: number, nextZ: number): View {
  const z = clampZ(nextZ);
  const k = z / view.z;
  return { z, x: mx - (mx - view.x) * k, y: my - (my - view.y) * k };
}

export function useViewport(initial?: View) {
  const [view, setViewState] = useState<View>(initial ?? { x: 72, y: 48, z: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const vel = useRef({ x: 0, y: 0, on: false });
  const raf = useRef(0);

  const stopInertia = useCallback(() => {
    vel.current.on = false;
    cancelAnimationFrame(raf.current);
  }, []);

  const apply = useCallback((v: View) => {
    viewRef.current = v;
    setViewState(v);
  }, []);

  const setView = useCallback(
    (u: View | ((v: View) => View)) => {
      stopInertia();
      const cur = viewRef.current;
      apply(typeof u === "function" ? u(cur) : u);
    },
    [apply, stopInertia],
  );

  const startInertia = useCallback(
    (vx: number, vy: number) => {
      if (Math.hypot(vx, vy) < 0.45) return;
      vel.current = { x: vx, y: vy, on: true };
      const tick = () => {
        if (!vel.current.on) return;
        const v = viewRef.current;
        apply({ ...v, x: v.x + vel.current.x, y: v.y + vel.current.y });
        vel.current.x *= 0.9;
        vel.current.y *= 0.9;
        if (Math.hypot(vel.current.x, vel.current.y) < 0.18) {
          vel.current.on = false;
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(tick);
    },
    [apply],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { view, setView, viewRef, startInertia, stopInertia, apply };
}

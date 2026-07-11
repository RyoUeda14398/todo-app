"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Color } from "three";

// This component is only ever mounted client-side (loaded via next/dynamic
// with ssr:false), so it's safe to read window/document directly here.

const THEME_CHANGE_EVENT = "theme-change";

function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function getIsDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// Reuses the same "theme-change" event ThemeToggle dispatches on toggle, so
// this component re-renders with the other theme's colors immediately.
function useIsDarkMode() {
  return useSyncExternalStore(subscribeToTheme, getIsDarkSnapshot, () => false);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    function handleChange(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

function useIsPageVisible() {
  const [visible, setVisible] = useState(
    () => document.visibilityState === "visible"
  );

  useEffect(() => {
    function handleVisibilityChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return visible;
}

function useIsNarrowViewport() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    function handleResize() {
      setNarrow(window.innerWidth < 640);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return narrow;
}

const DARK_PALETTE = [
  "#a5b4fc",
  "#c4b5fd",
  "#818cf8",
  "#93c5fd",
  "#f0abfc",
  "#5eead4",
  "#fca5a5",
  "#fde047",
  "#fb923c",
  "#67e8f9",
];
const LIGHT_PALETTE = [
  "#4f46e5",
  "#7c3aed",
  "#4338ca",
  "#6d28d9",
  "#be185d",
  "#0891b2",
  "#be123c",
  "#a16207",
  "#c2410c",
  "#0e7490",
];
const MAX_PARTICLE_COUNT = 1980;

function buildSizePool(count: number) {
  return Float32Array.from({ length: count }, () => (2 + Math.random() * 8) * 10);
}

function buildColorPool(count: number, palette: string[]) {
  const values = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const color = new Color(palette[Math.floor(Math.random() * palette.length)]);
    values[i * 3] = color.r;
    values[i * 3 + 1] = color.g;
    values[i * 3 + 2] = color.b;
  }
  return values;
}

// Random size/color per particle is generated once, here at module load
// (not on every render), then sliced down to the current particle count.
// This keeps size/color selection a pure, deterministic operation during
// render (required by React's rules) while still varying per particle.
const SIZE_POOL = buildSizePool(MAX_PARTICLE_COUNT);
const DARK_COLOR_POOL = buildColorPool(MAX_PARTICLE_COUNT, DARK_PALETTE);
const LIGHT_COLOR_POOL = buildColorPool(MAX_PARTICLE_COUNT, LIGHT_PALETTE);

export default function ParticleBackground() {
  const isDarkMode = useIsDarkMode();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = useIsPageVisible();
  const isNarrow = useIsNarrowViewport();

  // Respect "reduce motion" by freezing the animation (render once, no
  // continuous drift) rather than hiding the particles altogether — the
  // decorative effect stays, only the motion that could bother sensitive
  // users goes away.
  const frameloop = !isPageVisible
    ? "never"
    : prefersReducedMotion
      ? "demand"
      : "always";

  const count = isNarrow ? 324 : 792;
  // The soft glow radius scales with particle size, and that same haze reads
  // as much stronger "blur" against a light background than a dark one, so
  // light mode gets slightly smaller particles to ease that off.
  const sizePool = SIZE_POOL.subarray(0, count);
  const sizes = isDarkMode
    ? sizePool
    : Float32Array.from(sizePool, (value) => value * 0.7);
  const colors = (isDarkMode ? DARK_COLOR_POOL : LIGHT_COLOR_POOL).subarray(
    0,
    count * 3
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-95 dark:opacity-100">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 60 }}
        frameloop={frameloop}
      >
        <Sparkles
          count={count}
          scale={[11, 7, 6]}
          size={sizes}
          speed={prefersReducedMotion ? 0 : 0.25}
          opacity={1}
          color={colors}
          noise={1}
        />
      </Canvas>
    </div>
  );
}

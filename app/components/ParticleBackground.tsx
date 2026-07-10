"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// This component is only ever mounted client-side (loaded via next/dynamic
// with ssr:false), so it's safe to read window/document directly here.

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

export default function ParticleBackground() {
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

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-40 dark:opacity-100">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 60 }}
        frameloop={frameloop}
      >
        <Sparkles
          count={isNarrow ? 60 : 130}
          scale={[11, 7, 6]}
          size={5}
          speed={prefersReducedMotion ? 0 : 0.25}
          opacity={1}
          color="#a5b4fc"
          noise={1}
        />
      </Canvas>
    </div>
  );
}

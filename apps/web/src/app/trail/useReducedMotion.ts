"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The one place the trail asks whether the visitor wants the system still.
 *
 * Replaces the module-local `prefersReducedMotion()` copies that grew up in
 * `Teletype` and `Telemetry`, and unlike them it subscribes: an OS-level flip
 * mid-run settles the world without a reload. Reads `.matches` at mount — the
 * test harness's matchMedia mock has a no-op listener, so tests set the value
 * before mounting.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;

    const media = window.matchMedia(QUERY);

    const onChange = (event: MediaQueryListEvent | { matches: boolean }) =>
      setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

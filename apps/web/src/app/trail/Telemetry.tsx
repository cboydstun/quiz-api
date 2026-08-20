"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ds";
import { useReducedMotion } from "./useReducedMotion";

/** How often the last digits move. Slow enough to read, fast enough to live. */
const TICK_MS = 900;

export interface TelemetryProps {
  /** Seeds the readings so two legs do not show identical numbers. */
  seed: string;
  className?: string;
}

function baseFrom(seed: string): { alt: number; hdg: number; link: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const n = Math.abs(h);
  return { alt: 180 + (n % 200), hdg: n % 360, link: 82 + (n % 14) };
}

/**
 * A live telemetry strip. Its only job is to not be still.
 *
 * Its own component with its own interval on purpose: ticking this inside the
 * page would re-render the whole run four times a minute for the sake of two
 * digits.
 *
 * Under reduced motion the interval never starts — the numbers render once and
 * hold. That is a real difference from letting it tick at zero duration: this
 * is content changing, not an animation, and CSS cannot switch it off.
 */
export function Telemetry({ seed, className }: TelemetryProps) {
  const base = baseFrom(seed);
  const reduced = useReducedMotion();
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    if (reduced) return;

    const timer = setInterval(() => setDrift((d) => d + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [seed, reduced]);

  // Deterministic wander rather than Math.random: a value that jumps by a
  // different amount every tick reads as broken instrumentation, not drift.
  const wobble = (n: number, range: number) =>
    n + (Math.sin(drift * 0.7 + n) * range);

  const readings = [
    ["ALT", `${Math.round(wobble(base.alt, 3))}ft`],
    ["HDG", `${String(Math.round(wobble(base.hdg, 2)) % 360).padStart(3, "0")}°`],
    ["LINK", `${Math.round(wobble(base.link, 2))}%`],
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-6 gap-y-1 font-mono text-3xs tracking-mono text-mute-600",
        className,
      )}
      // Decorative. A screen reader announcing a number that changes every
      // 900ms would be unusable, and none of it is information the run needs.
      aria-hidden
    >
      {readings.map(([label, value]) => (
        <span key={label}>
          {label} {value}
        </span>
      ))}
    </div>
  );
}

import { useMemo } from "react";
import { cn } from "@/components/ds";
import { buildBand, PROFILE_HEIGHT, PROFILE_WIDTH } from "./terrain";
import { Drone } from "./Drone";
import type { FlightMode } from "./useFlightClock";
import type { TrailLeg } from "./types";

/**
 * Weather, as a flat wash keyed to the terrain name. Flat colour at partial
 * opacity — never a gradient; the system bans them and a feed artifact is
 * flat anyway.
 */
const WEATHER: Record<string, string> = {
  "ICING LAYER": "bg-bone-100/5",
  "LAST LIGHT": "bg-ink-950/40",
  MAYDAY: "bg-abort/5",
};

export interface WorldProps {
  legs: TrailLeg[];
  /** The leg under the aircraft, for the weather wash. */
  terrain: string;
  mode: FlightMode;
  className?: string;
}

/**
 * The downlink feed: the whole route's ground as one band, scrolled under a
 * fixed aircraft by `--flight-progress`. The variable is written by the
 * flight clock onto an ancestor of this subtree, so the scroll costs no React
 * render — the transform math lives entirely in CSS.
 *
 * Three copies of the band at three rates make the parallax: a far ridgeline
 * creeping, a mid line, and the near ground carrying the full scroll. Depth
 * sells the speed better than any one line can, and the same deterministic
 * path keeps it free.
 */
export function World({ legs, terrain, mode, className }: WorldProps) {
  const band = useMemo(
    () => buildBand(legs.map((leg) => leg.terrain)),
    [legs],
  );

  const layer = (rate: number) => ({
    transform: `translateX(calc(var(--flight-progress, 0) * ${-PROFILE_WIDTH * rate}px))`,
    transition: "transform var(--duration-fast) linear",
  });
  const weather = WEATHER[terrain];

  return (
    <div className={className}>
      <div className="grid-overlay grid-drift relative overflow-hidden">
        <span
          aria-hidden
          className="scan-line pointer-events-none absolute inset-x-0 top-0 h-4 bg-bone-100/3"
        />
        <svg
          viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`}
          preserveAspectRatio="none"
          className="relative block h-auto w-full"
          aria-hidden
        >
          {/* Far ridgeline: lifted, dim, barely moving. */}
          <g style={{ transform: "translateY(-14px)" }}>
            <g style={layer(0.3)}>
              <path
                d={band.ground}
                fill="none"
                stroke="var(--color-ink-600)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
          {/* Mid ground. */}
          <g style={{ transform: "translateY(-6px)" }}>
            <g style={layer(0.65)}>
              <path
                d={band.ground}
                fill="none"
                stroke="var(--color-mute-600)"
                strokeOpacity={0.5}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
          {/* The near ground the aircraft actually flies. */}
          <g style={layer(1)}>
            <path d={band.fill} fill="var(--color-ink-700)" />
            <path
              d={band.ground}
              fill="none"
              stroke="var(--color-mute-600)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <Drone
            x={PROFILE_WIDTH * 0.15}
            y={PROFILE_HEIGHT * 0.35}
            mode={mode}
          />
        </svg>
        {weather && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0",
              weather,
            )}
          />
        )}
      </div>
    </div>
  );
}

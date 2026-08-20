import type { FlightMode } from "./useFlightClock";

export interface DroneProps {
  /** Where the mark sits in the world's viewBox, in user units. */
  x: number;
  y: number;
  mode: FlightMode;
}

/**
 * The aircraft, as the downlink feed shows it. A mark rather than a picture —
 * at this size a drawing of a quadcopter is four grey pixels, and the system's
 * language is marks anyway. Same glyph as the route strip and the terrain
 * profile, so the three read as one aircraft.
 *
 * Motion is rotate and translate only — never scale. The lean reads
 * `--flight-speed` straight off the clock's node, so the burst tips the nose
 * with no React in the loop; the crash is a class because DOWN is state, not
 * speed.
 */
export function Drone({ x, y, mode }: DroneProps) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <g className={mode === "CRASH" ? "drone-down" : "drone-hover"}>
        <g
          style={{
            transform:
              "rotate(calc((var(--flight-speed, 1) - 1) * -1.2deg))",
            transition: "transform var(--duration-fast) linear",
          }}
        >
          <path
            d="M-4 0 L4 0 M0 -3 L0 3 M-4 -3 L-4 3 M4 -3 L4 3"
            stroke="var(--color-signal)"
            strokeWidth={1.5}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    </g>
  );
}

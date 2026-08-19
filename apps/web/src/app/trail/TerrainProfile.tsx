import { buildSilhouette, PROFILE_HEIGHT, PROFILE_WIDTH } from "./terrain";

export interface TerrainProfileProps {
  terrain: string;
  hazard?: boolean;
  className?: string;
}

/**
 * The leg, drawn: a hairline ground line with the aircraft tracking across it.
 *
 * The aircraft rides the ground with `offset-path`, so when the silhouette
 * climbs the drone climbs — the shape and the flight are the same data rather
 * than two things kept in step by hand.
 *
 * `translate` and `offset-distance` only. The design system's ban is on chrome
 * that scales or lifts under a cursor; an aircraft crossing a profile is the
 * subject, not chrome. **No `scale` anywhere in here** — the standing
 * regression grep would catch it, and it would be wrong regardless.
 */
export function TerrainProfile({
  terrain,
  hazard = false,
  className,
}: TerrainProfileProps) {
  const { ground, fill } = buildSilhouette(terrain);
  const line = hazard ? "var(--color-abort)" : "var(--color-mute-600)";

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`}
        // Fills its column and scales with it, so a 360px phone gets the same
        // picture rather than a cropped one.
        className="block h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Terrain profile for ${terrain}`}
      >
        <path d={fill} fill="var(--color-ink-700)" />
        <path
          d={ground}
          fill="none"
          stroke={line}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/*
          The aircraft. A mark rather than a picture: at this size a drawing of
          a quadcopter is four grey pixels, and the system's language is marks
          anyway.
        */}
        <g
          className="drone-track"
          style={{ offsetPath: `path("${ground}")` }}
          aria-hidden
        >
          <path
            d="M-4 0 L4 0 M0 -3 L0 3 M-4 -3 L-4 3 M4 -3 L4 3"
            stroke="var(--color-signal)"
            strokeWidth={1.5}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

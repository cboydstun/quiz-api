import { Button, Label, Panel, Status } from "@/components/ds";
import { Teletype } from "../Teletype";
import { TerrainProfile } from "../TerrainProfile";
import { Telemetry } from "../Telemetry";
import type { TrailLeg } from "../types";

export interface CrossingProps {
  leg: TrailLeg;
  legCount: number;
  onContinue: () => void;
}

/**
 * The crossing. A hairline draws across, the terrain resolves in, then the
 * dispatch types. Continue is available throughout — the beat is atmosphere,
 * not a gate, and gating it would make the eighth run of the week a chore.
 */
export function Crossing({ leg, legCount, onContinue }: CrossingProps) {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Leg {String(leg.index).padStart(2, "0")} of{" "}
        {String(legCount).padStart(2, "0")}
      </Label>

      {/* The ground, and the aircraft crossing it. This replaced a flat
          hairline: a line drawing across says "something is happening", but a
          profile says which leg you are on. */}
      <div className="grid-overlay grid-drift relative overflow-hidden">
        {/* One low bar crossing the panel, like a feed refreshing. Behind the
            profile, never over the type. */}
        <span
          aria-hidden
          className="scan-line pointer-events-none absolute inset-x-0 top-0 h-4 bg-bone-100/3"
        />
        <TerrainProfile
          terrain={leg.terrain}
          hazard={leg.hazard}
          className="relative"
        />
      </div>
      <Telemetry seed={leg.terrain} className="mt-2 mb-2" />
      <div className="mb-8 h-px bg-ink-600">
        <div className="route-draw h-px bg-signal" />
      </div>

      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="signal-in m-0 font-mono text-3xl font-medium tracking-tight text-bone-100">
          {leg.terrain}
        </h1>
        {leg.hazard && (
          <Status tone="abort" filled>
            Hazard
          </Status>
        )}
      </div>

      <Panel label={leg.domain} tag="///" padding="md">
        <Teletype lines={leg.dispatch} />
        <div className="mt-6 border-t border-line-hairline pt-5">
          <Button variant="signal" size="md" onClick={onContinue} autoFocus>
            Fly the leg
          </Button>
        </div>
      </Panel>
    </div>
  );
}

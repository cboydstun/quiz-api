import { Button, Panel, Status } from "@/components/ds";
import { Teletype } from "../Teletype";
import { TerrainProfile } from "../TerrainProfile";
import type { TrailLeg } from "../types";

export interface DispatchProps {
  leg: TrailLeg;
  legCount: number;
  onContinue: () => void;
}

/**
 * The crossing beat, as a panel. Keeps every job the full-page Crossing screen
 * had — the terrain reveal, the name and hazard status, the dispatch
 * transmission, the "Fly the leg" gate, and (via the page's paused set) the
 * daylight hold. Continue is available throughout: the beat is atmosphere, not
 * a gate, and gating it would make the eighth run of the week a chore.
 */
export function Dispatch({ leg, legCount, onContinue }: DispatchProps) {
  return (
    <div>
      <div className="grid-overlay grid-drift relative overflow-hidden">
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

      <Panel
        label={leg.domain}
        tag="///"
        meta={`Leg ${String(leg.index).padStart(2, "0")} of ${String(
          legCount,
        ).padStart(2, "0")}`}
        padding="md"
      >
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

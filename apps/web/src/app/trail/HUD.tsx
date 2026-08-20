import { Alert, Label, Meter, Status, cn } from "@/components/ds";
import { RouteStrip } from "./RouteStrip";
import { Telemetry } from "./Telemetry";
import { routePosition, TRAIL_RULES, type TrailState } from "./engine";
import type { DebriefEntry, TrailLeg } from "./types";

export interface HudProps {
  run: TrailState;
  legs: TrailLeg[];
  operator: string;
  daylight: number;
  /**
   * The verdict on screen, if any. Drives the abort wash and the damage
   * marks — declarative, so it lasts exactly as long as the reason for it.
   */
  verdict: DebriefEntry | null;
  /** Leg index whose dispatch beat is on screen, or null while in the air. */
  crossing: number | null;
  notice: string | null;
  onDismissNotice: () => void;
  /** The audio toggle, when the shell has one to offer. */
  audioSlot?: React.ReactNode;
}

/**
 * The instrument row of the ground station. Never unmounts during a run, so
 * every meter animates its own CSS transition when a value lands — the whole
 * reason the Animated* wrappers could be deleted.
 *
 * Damage marks are keyed by `run.answered` (and dispatch marks by the leg
 * index): a fresh element per verdict restarts its CSS animation without any
 * setTimeout choreography.
 */
export function HUD({
  run,
  legs,
  operator,
  daylight,
  verdict,
  crossing,
  notice,
  onDismissNotice,
  audioSlot,
}: HudProps) {
  const leg = legs[run.legIndex];
  const damaged = verdict !== null && !verdict.isCorrect;

  return (
    <div className="mb-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Label tag="///">
          {operator} · Leg {leg?.index ?? run.legIndex + 1} of {legs.length} ·{" "}
          {leg?.terrain}
        </Label>
        <div className="flex items-center gap-3">
          {leg?.hazard && (
            <Status tone="abort" filled>
              Hazard
            </Status>
          )}
          {audioSlot}
        </div>
      </div>

      <RouteStrip
        total={legs.length}
        current={run.legIndex}
        position={routePosition(run, legs)}
        hazards={legs.map((item) => item.hazard)}
        className="mb-3"
      />
      <Telemetry seed={leg?.terrain ?? "GROUND"} className="mb-6" />

      <div className="relative">
        {/* What the last beat cost, floating off the instruments. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-5 flex justify-between font-mono text-2xs tracking-mono"
        >
          <span>
            {damaged && (
              <span key={run.answered} className="damage-mark text-abort">
                −{TRAIL_RULES.MISS_COST}% BATTERY
                {verdict?.hazardStruck
                  ? ` · −${TRAIL_RULES.HAZARD_DAMAGE}% AIRFRAME`
                  : ""}
              </span>
            )}
          </span>
          <span>
            {crossing !== null && (
              <span key={crossing} className="damage-mark text-mute-500">
                TRANSIT −{TRAIL_RULES.TRANSIT_COST}%
              </span>
            )}
          </span>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-px bg-line-hairline transition-fast sm:grid-cols-3",
            damaged && "bg-abort",
          )}
        >
          <div className="signal-in bg-ink-800">
            <Meter label="Battery" value={run.battery} />
          </div>
          <div
            className="signal-in bg-ink-800"
            style={{ animationDelay: "var(--duration-fast)" }}
          >
            <Meter label="Airframe" value={run.airframe} />
          </div>
          <div
            className="signal-in bg-ink-800"
            style={{ animationDelay: "calc(var(--duration-fast) * 2)" }}
          >
            <Meter
              label="Daylight"
              value={(daylight / TRAIL_RULES.SECONDS_PER_QUESTION) * 100}
              readout={`${daylight}s`}
            />
          </div>
        </div>
      </div>

      {notice && (
        <div className="mt-6">
          <Alert tone="caution" kicker="NOTICE" onDismiss={onDismissNotice}>
            {notice}
          </Alert>
        </div>
      )}
    </div>
  );
}

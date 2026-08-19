import { Meter, cn } from "@/components/ds";
import { AnimatedMeter } from "../AnimatedMeter";
import { TRAIL_RULES, type TrailState } from "../engine";

export interface InstrumentsProps {
  run: TrailState;
  /** Seconds of daylight left on the current question. */
  daylight: number;
  /**
   * Washes the row abort. Driven by whether a miss verdict is on screen rather
   * than by a timer: declarative, and it lasts exactly as long as the reason
   * for it does.
   */
  damaged?: boolean;
  /**
   * Battery and airframe as they stood before the last answer. Given, the two
   * meters drain from there rather than arriving already spent.
   */
  before?: { battery: number; airframe: number };
}

/** Battery, airframe, daylight — the three things a run is measured in. */
export function Instruments({
  run,
  daylight,
  damaged = false,
  before,
}: InstrumentsProps) {
  return (
    <div
      className={cn(
        "mb-px grid grid-cols-1 gap-px bg-line-hairline transition-fast sm:grid-cols-3",
        damaged && "bg-abort",
      )}
    >
      <div className="bg-ink-800">
        {before ? (
          <AnimatedMeter label="Battery" from={before.battery} to={run.battery} />
        ) : (
          <Meter label="Battery" value={run.battery} />
        )}
      </div>
      <div className="bg-ink-800">
        {before ? (
          <AnimatedMeter
            label="Airframe"
            from={before.airframe}
            to={run.airframe}
          />
        ) : (
          <Meter label="Airframe" value={run.airframe} />
        )}
      </div>
      <div className="bg-ink-800">
        <Meter
          label="Daylight"
          value={(daylight / TRAIL_RULES.SECONDS_PER_QUESTION) * 100}
          readout={`${daylight}s`}
        />
      </div>
    </div>
  );
}

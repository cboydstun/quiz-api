import { Meter, cn } from "@/components/ds";
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
}

/** Battery, airframe, daylight — the three things a run is measured in. */
export function Instruments({ run, daylight, damaged = false }: InstrumentsProps) {
  return (
    <div
      className={cn(
        "mb-px grid grid-cols-1 gap-px bg-line-hairline transition-fast sm:grid-cols-3",
        damaged && "bg-abort",
      )}
    >
      <div className="bg-ink-800">
        <Meter label="Battery" value={run.battery} />
      </div>
      <div className="bg-ink-800">
        <Meter label="Airframe" value={run.airframe} />
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

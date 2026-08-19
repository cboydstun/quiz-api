import { Button, Panel, Status } from "@/components/ds";
import { Teletype } from "../Teletype";
import type { TrailState } from "../engine";
import type { TrailLeg } from "../types";

export interface EndingProps {
  run: TrailState;
  legs: TrailLeg[];
  trailDate: string;
  onContinue: () => void;
}

/**
 * The last beat before the numbers. This is the only place the fiction gets to
 * land the outcome, so the debrief can stay a scoreboard.
 */
export function Ending({ run, legs, trailDate, onContinue }: EndingProps) {
  const arrived = run.status === "ARRIVED";
  const where = legs[run.legIndex]?.terrain ?? "the leg";

  const lines = arrived
    ? [
        `All ${legs.length} legs flown. Cards are full.`,
        `${run.battery}% charge and the airframe intact.`,
        "The client gets the shots.",
      ]
    : run.airframe === 0
      ? [
          `Telemetry stopped over ${where}.`,
          "The airframe did not survive the crossing.",
          "The client is not getting the shots.",
        ]
      : [
          `Charge ran out over ${where}.`,
          "It came down where it came down.",
          "The client is not getting the shots.",
        ];

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Panel
        label={arrived ? "On The Ground" : "Signal Lost"}
        tag="///"
        meta={trailDate}
        padding="md"
      >
        <Status tone={arrived ? "go" : "abort"} filled>
          {arrived ? "Arrived" : "Down"}
        </Status>
        <div className="mt-5">
          <Teletype lines={lines} />
        </div>
        <div className="mt-6 border-t border-line-hairline pt-5">
          <Button variant="signal" size="md" onClick={onContinue} autoFocus>
            Debrief
          </Button>
        </div>
      </Panel>
    </div>
  );
}

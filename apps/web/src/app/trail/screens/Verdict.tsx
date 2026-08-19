import { Button, Panel, Status } from "@/components/ds";
import { Instruments } from "./Instruments";
import { RouteStrip } from "../RouteStrip";
import type { TrailState } from "../engine";
import type { DebriefEntry, TrailLeg } from "../types";

export interface VerdictProps {
  run: TrailState;
  legs: TrailLeg[];
  entry: DebriefEntry;
  daylight: number;
  /** Resources as they stood before this answer, so the meters can drain. */
  before?: { battery: number; airframe: number };
  onContinue: () => void;
}

/** What the last answer was, and what it cost. */
export function Verdict({
  run,
  legs,
  entry,
  daylight,
  before,
  onContinue,
}: VerdictProps) {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <RouteStrip
        total={legs.length}
        current={run.legIndex}
        hazards={legs.map((item) => item.hazard)}
        className="mb-6"
      />
      <Instruments
        run={run}
        daylight={daylight}
        damaged={!entry.isCorrect}
        before={before}
      />
      {/* The stutter a miss earns. One shot, three steps, 2px — a reaction
          rather than a shake, and it is over before it asks for attention. */}
      <Panel
        label={entry.terrain}
        tag="///"
        meta={entry.isCorrect ? "CLEARED" : "STRUCK"}
        padding="md"
        className={entry.isCorrect ? undefined : "glitch"}
      >
        <Status tone={entry.isCorrect ? "go" : "abort"} filled>
          {entry.isCorrect ? "Correct" : "Missed"}
        </Status>

        {!entry.isCorrect && (
          <div className="mt-5 flex flex-col gap-1 border-t border-line-hairline pt-5">
            {entry.chosen ? (
              <div className="text-sm text-mute-500">
                <span className="label-mono text-abort">Chose</span>{" "}
                {entry.chosen}
              </div>
            ) : (
              <div className="text-sm text-mute-500">
                <span className="label-mono text-abort">Daylight</span> Out of
                daylight — no answer committed.
              </div>
            )}
            {entry.correctAnswer && (
              <div className="text-sm text-bone-100">
                <span className="label-mono text-go">Answer</span>{" "}
                {entry.correctAnswer}
              </div>
            )}
            {entry.explanation && (
              <p className="m-0 mt-2 max-w-[68ch] text-sm leading-normal text-mute-400">
                {entry.explanation}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          {/*
            Always "Continue" — what comes next is a crossing, or the ending
            beat, never the debrief directly. Naming it for the destination
            would be wrong three times out of four.
          */}
          <Button variant="signal" size="md" onClick={onContinue} autoFocus>
            Continue
          </Button>
        </div>
      </Panel>
    </div>
  );
}

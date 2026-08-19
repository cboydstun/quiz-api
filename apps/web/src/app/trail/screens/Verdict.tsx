import { Button, Panel, Status } from "@/components/ds";
import { Instruments } from "./Instruments";
import type { TrailState } from "../engine";
import type { DebriefEntry } from "../types";

export interface VerdictProps {
  run: TrailState;
  entry: DebriefEntry;
  daylight: number;
  onContinue: () => void;
}

/** What the last answer was, and what it cost. */
export function Verdict({ run, entry, daylight, onContinue }: VerdictProps) {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Instruments run={run} daylight={daylight} damaged={!entry.isCorrect} />
      <Panel
        label={entry.terrain}
        tag="///"
        meta={entry.isCorrect ? "CLEARED" : "STRUCK"}
        padding="md"
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

import Link from "next/link";
import { buttonClass, Label, Panel, Readout, Status } from "@/components/ds";
import type { TrailState } from "../engine";
import type { DebriefEntry, TrailLeg } from "../types";

export interface DebriefProps {
  run: TrailState;
  legs: TrailLeg[];
  entries: DebriefEntry[];
  trailDate: string;
  signedIn: boolean;
}

/** The scoreboard, and the only screen that teaches. */
export function Debrief({
  run,
  legs,
  entries,
  trailDate,
  signedIn,
}: DebriefProps) {
  const arrived = run.status === "ARRIVED";

  const readouts = [
    {
      label: "Reached",
      value: `${run.legIndex + 1} / ${legs.length}`,
      tone: arrived ? ("go" as const) : ("abort" as const),
    },
    { label: "Correct", value: `${run.correct} / ${run.answered}` },
    { label: "Battery", value: run.battery, unit: "%" },
    { label: "Airframe", value: run.airframe, unit: "%" },
  ];

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Panel
        label={arrived ? "Arrived" : "Down"}
        tag="///"
        meta={trailDate}
        padding="none"
      >
        {/*
          The readouts fill in one after another rather than appearing as a
          block — an instrument panel coming up, not a scorecard being handed
          over. The delay is inline because it is index-driven; the animation
          itself is a token, so reduced motion zeroes it.

          The prose summary that used to sit under here is gone: the ending beat
          now says where the run stopped, and hearing it twice in two screens
          made the debrief read like it was padding.
        */}
        <div className="grid grid-cols-2 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-4">
          {readouts.map((readout, i) => (
            <div
              key={readout.label}
              className="signal-in bg-ink-800"
              style={{ animationDelay: `calc(var(--duration-fast) * ${i})` }}
            >
              <Readout
                label={readout.label}
                value={readout.value}
                unit={readout.unit}
                tone={readout.tone}
              />
            </div>
          ))}
        </div>

        {/* The review. Only the misses carry a correction — repeating a right
            answer back is noise. */}
        <div className="flex flex-col gap-2 px-5 py-5">
          {entries.map((entry, i) => (
            <div
              key={`${entry.questionText}-${i}`}
              className={`border border-line-hairline border-l-2 bg-ink-700 px-4 py-3 ${
                entry.isCorrect ? "border-l-go" : "border-l-abort"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-3xs tracking-mono text-mute-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm text-mute-400">
                  {entry.questionText}
                </span>
                <Status tone={entry.isCorrect ? "go" : "abort"}>
                  {entry.isCorrect ? "Correct" : "Missed"}
                </Status>
              </div>

              {!entry.isCorrect && entry.correctAnswer && (
                <div className="mt-3 flex flex-col gap-1 border-t border-line-hairline pt-3 pl-9">
                  <div className="text-sm text-bone-100">
                    <span className="label-mono text-go">Answer</span>{" "}
                    {entry.correctAnswer}
                  </div>
                  {entry.explanation && (
                    <p className="m-0 mt-1 max-w-[68ch] text-sm leading-normal text-mute-400">
                      {entry.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/*
          The wall, placed at the end of the run rather than at the door. A
          visitor who has just gone down on leg five has something worth
          keeping; one who has seen nothing yet does not.
        */}
        {!signedIn && (
          <div className="border-t border-line-hairline bg-ink-700 px-5 py-6">
            <Label tag="///" className="mb-3">
              Not Recorded
            </Label>
            <p className="m-0 mb-5 max-w-[52ch] text-sm leading-normal text-mute-400">
              This run was graded but not saved. Create an account to keep your
              trail results, track accuracy by knowledge area, and appear in the
              standings.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/register"
                className={buttonClass({ variant: "signal", size: "md" })}
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className={buttonClass({ variant: "outline", size: "md" })}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line-hairline px-5 py-4">
          <Link
            href="/quiz"
            className={buttonClass({ variant: "outline", size: "md" })}
          >
            Take an Untimed Run
          </Link>
          {signedIn && (
            <Link
              href="/profile"
              className={buttonClass({ variant: "ghost", size: "md" })}
            >
              View Record
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}

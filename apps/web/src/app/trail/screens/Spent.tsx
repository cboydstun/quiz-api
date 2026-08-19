import Link from "next/link";
import { buttonClass, Panel, Readout } from "@/components/ds";
import type { TrailRunRecord } from "../types";

export interface SpentProps {
  run: TrailRunRecord;
  legCount: number;
}

/** The day is used up. Shown to whoever already flew, signed in or not. */
export function Spent({ run, legCount }: SpentProps) {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Panel label="Trail Flown" tag="///" meta={run.trailDate} padding="none">
        <div className="grid grid-cols-2 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-4">
          <div className="bg-ink-800">
            <Readout label="Reached" value={`${run.legsReached} / ${legCount}`} />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Outcome"
              value={run.completed ? "Arrived" : "Down"}
              tone={run.completed ? "go" : "abort"}
            />
          </div>
          <div className="bg-ink-800">
            <Readout label="Correct" value={`${run.correct} / ${run.total}`} />
          </div>
          <div className="bg-ink-800">
            <Readout label="Battery" value={run.batteryLeft} unit="%" />
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="m-0 max-w-[52ch] text-sm leading-normal text-mute-400">
            One trail a day. The next route is plotted at 00:00 UTC.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/quiz"
              className={buttonClass({ variant: "signal", size: "md" })}
            >
              Take an Untimed Run
            </Link>
            <Link
              href="/leaderboard"
              className={buttonClass({ variant: "outline", size: "md" })}
            >
              Standings
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}

import { Button, Label, Panel, Status } from "@/components/ds";
import { Teletype } from "../Teletype";
import { TRAIL_RULES } from "../engine";
import type { DailyTrail } from "../types";

export interface BriefingProps {
  trail: DailyTrail;
  signedIn: boolean;
  onLaunch: () => void;
}

/** The door: the job, the route, and what a miss costs. */
export function Briefing({ trail, signedIn, onLaunch }: BriefingProps) {
  const legs = trail.legs;
  const totalQuestions = legs.reduce(
    (sum, item) => sum + item.questions.length,
    0,
  );

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Trail {trail.date}
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        Today&apos;s trail
      </h1>
      <p className="m-0 mb-8 max-w-[62ch] text-sm leading-normal text-mute-500">
        Every operator flies this same route today. {legs.length} legs,{" "}
        {totalQuestions} questions, one attempt. A wrong answer costs{" "}
        {TRAIL_RULES.MISS_COST}% battery; a wrong answer over a hazard costs{" "}
        {TRAIL_RULES.HAZARD_DAMAGE}% airframe. Run either to zero and the run
        ends where it ended.
      </p>

      {/* The job. Types out, because a briefing that is simply there has
          already been read before the operator decides to read it. */}
      <Panel label="The Job" tag="///" padding="md" className="mb-px">
        <Teletype lines={trail.mission} />
      </Panel>

      <Panel label="Route" meta={`${legs.length} legs`} padding="none">
        <div className="grid gap-px bg-line-hairline sm:grid-cols-2">
          {legs.map((item) => (
            <div key={item.domain} className="bg-ink-800 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="label-mono text-mute-500">
                  Leg {String(item.index).padStart(2, "0")}
                </span>
                {item.hazard && <Status tone="abort">Hazard</Status>}
              </div>
              <div className="mb-1 font-mono text-sm tracking-mono text-bone-100">
                {item.terrain}
              </div>
              <div className="text-sm text-mute-500">{item.domain}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-line-hairline px-5 py-4">
          <Button variant="signal" size="md" onClick={onLaunch}>
            Launch
          </Button>
        </div>
      </Panel>

      {!signedIn && (
        <p className="m-0 mt-6 max-w-[62ch] text-sm leading-normal text-mute-500">
          You can fly without an account. Nothing will be recorded.
        </p>
      )}
    </div>
  );
}

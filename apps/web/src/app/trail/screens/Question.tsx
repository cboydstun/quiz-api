import { Alert, Button, Label, QuestionCard, Status } from "@/components/ds";
import { Instruments } from "./Instruments";
import { RouteStrip } from "../RouteStrip";
import { Telemetry } from "../Telemetry";
import { routePosition, TRAIL_RULES, type TrailState } from "../engine";
import type { TrailLeg } from "../types";

export interface QuestionProps {
  run: TrailState;
  leg: TrailLeg;
  /** The whole route, for the strip. */
  legs: TrailLeg[];
  legCount: number;
  operator: string;
  daylight: number;
  selected: string | null;
  grading: boolean;
  showHint: boolean;
  notice: string | null;
  onSelect: (answer: string) => void;
  onToggleHint: () => void;
  onDismissNotice: () => void;
  onCommit: () => void;
}

/** The only screen that asks anything. */
export function Question({
  run,
  leg,
  legs,
  legCount,
  operator,
  daylight,
  selected,
  grading,
  showHint,
  notice,
  onSelect,
  onToggleHint,
  onDismissNotice,
  onCommit,
}: QuestionProps) {
  const item = leg.questions[run.questionIndex];
  if (!item) return null;

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Label tag="///">
          {operator} · Leg {leg.index} of {legCount} · {leg.terrain}
        </Label>
        {leg.hazard && (
          <Status tone="abort" filled>
            Hazard
          </Status>
        )}
      </div>

      <RouteStrip
        total={legCount}
        current={run.legIndex}
        position={routePosition(run, legs)}
        hazards={legs.map((item) => item.hazard)}
        className="mb-3"
      />
      <Telemetry seed={leg.terrain} className="mb-6" />

      <Instruments run={run} daylight={daylight} />

      {notice && (
        <div className="mb-6">
          <Alert tone="caution" kicker="NOTICE" onDismiss={onDismissNotice}>
            {notice}
          </Alert>
        </div>
      )}

      <QuestionCard
        label={leg.domain}
        index={run.questionIndex + 1}
        total={leg.questions.length}
        points={item.points}
        timeRemaining={daylight}
        prompt={item.prompt}
        questionText={item.questionText}
        answers={item.answers}
        selected={selected ?? undefined}
        onSelect={onSelect}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label-mono text-mute-500">
              {leg.hazard
                ? `Miss: −${TRAIL_RULES.MISS_COST}% battery, −${TRAIL_RULES.HAZARD_DAMAGE}% airframe`
                : `Miss: −${TRAIL_RULES.MISS_COST}% battery`}
            </span>
            <Button
              variant="signal"
              size="sm"
              disabled={!selected || grading}
              onClick={onCommit}
            >
              {grading ? "Grading" : "Commit"}
            </Button>
          </div>
        }
      >
        {item.hint && (
          <div>
            <Button variant="caution" size="sm" onClick={onToggleHint}>
              {showHint ? "Hide Hint" : "Show Hint"}
            </Button>
            {showHint && (
              <div className="mt-4">
                <Alert tone="caution" kicker="HINT">
                  {item.hint}
                </Alert>
              </div>
            )}
          </div>
        )}
      </QuestionCard>
    </div>
  );
}

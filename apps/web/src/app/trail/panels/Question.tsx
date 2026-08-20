import { Alert, Button, QuestionCard } from "@/components/ds";
import { TRAIL_RULES, type TrailState } from "../engine";
import type { TrailLeg } from "../types";

export interface QuestionProps {
  run: TrailState;
  leg: TrailLeg;
  daylight: number;
  selected: string | null;
  grading: boolean;
  showHint: boolean;
  onSelect: (answer: string) => void;
  onToggleHint: () => void;
  onCommit: () => void;
}

/** The only panel that asks anything. Instruments live in the HUD now. */
export function Question({
  run,
  leg,
  daylight,
  selected,
  grading,
  showHint,
  onSelect,
  onToggleHint,
  onCommit,
}: QuestionProps) {
  const item = leg.questions[run.questionIndex];
  if (!item) return null;

  return (
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
  );
}

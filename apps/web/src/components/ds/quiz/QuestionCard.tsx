import type { ReactNode } from "react";
import { Panel } from "../core/Panel";
import { AnswerOption } from "../forms/AnswerOption";
import { cn } from "../cn";

const KEYS = ["A", "B", "C", "D", "E", "F"];

export interface QuestionCardProps {
  label?: string;
  /** One-based position in the run. */
  index?: number;
  total?: number;
  points?: number;
  /** Seconds left. Turns abort-red at 10 and below. */
  timeRemaining?: number | null;
  /** Optional setup text above the question itself. */
  prompt?: ReactNode;
  questionText: ReactNode;
  answers?: string[];
  selected?: string;
  onSelect?: (answer: string) => void;
  footer?: ReactNode;
  children?: ReactNode;
}

export function QuestionCard({
  label = "Evaluation",
  index = 1,
  total = 10,
  points,
  timeRemaining,
  prompt,
  questionText,
  answers = [],
  selected,
  onSelect,
  footer,
  children,
}: QuestionCardProps) {
  const pct = Math.round((index / total) * 100);
  return (
    <Panel
      label={label}
      tag={String(index).padStart(2, "0")}
      meta={`${index} / ${total}`}
      padding="none"
    >
      <div className="h-0.5 bg-ink-950">
        <div
          className="h-0.5 bg-signal transition-[width] duration-[var(--duration-base)] ease-default"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between label-mono text-mute-500">
          <span>{points !== undefined ? `${points} pts` : ""}</span>
          {timeRemaining !== undefined && timeRemaining !== null && (
            <span
              className={cn(
                timeRemaining <= 10 ? "text-abort" : "text-mute-400",
              )}
            >
              T&minus;{String(timeRemaining).padStart(2, "0")}s
            </span>
          )}
        </div>
        {prompt && (
          <p className="m-0 mb-4 max-w-[70ch] text-sm leading-normal text-mute-500">
            {prompt}
          </p>
        )}
        <p className="m-0 mb-8 max-w-[44ch] text-2xl font-medium leading-snug tracking-tight text-bone-100">
          {questionText}
        </p>
        <div className="mb-6 flex flex-col gap-2">
          {answers.map((a, i) => (
            <AnswerOption
              key={a}
              index={KEYS[i]}
              name="answer"
              value={a}
              checked={selected === a}
              onChange={() => onSelect?.(a)}
            >
              {a}
            </AnswerOption>
          ))}
        </div>
        {children}
      </div>
      {footer && (
        <div className="border-t border-line-hairline px-8 py-4">{footer}</div>
      )}
    </Panel>
  );
}

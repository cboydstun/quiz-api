"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";

/** `idle` until the run is graded, then `correct` / `incorrect`. */
export type AnswerState = "idle" | "correct" | "incorrect";

export interface AnswerOptionProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> {
  /** Zero-padded two-digit counter shown in the box: `01`, `02`. */
  index: ReactNode;
  state?: AnswerState;
  children: ReactNode;
  className?: string;
}

const GRADED: Record<Exclude<AnswerState, "idle">, string> = {
  correct: "border-go",
  incorrect: "border-abort",
};

const GRADED_INDEX: Record<Exclude<AnswerState, "idle">, string> = {
  correct: "border-go text-go",
  incorrect: "border-abort text-abort",
};

export function AnswerOption({
  index,
  state = "idle",
  className,
  children,
  ...rest
}: AnswerOptionProps) {
  const graded = state !== "idle";
  // The index letter is decoration; the accessible name of the radio must be
  // the answer itself, so it is pointed at the text span rather than
  // inheriting the whole label's text content.
  const textId = useId();
  return (
    // `has-[:checked]` drives selection off the real radio, so the component
    // stays uncontrolled-friendly and needs no hover/selected state of its own.
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 border bg-ink-700 p-4 transition-fast",
        "has-[:focus-visible]:border-signal has-[:focus-visible]:shadow-glow-focus",
        graded
          ? GRADED[state as Exclude<AnswerState, "idle">]
          : "border-line-hairline hover:border-line-strong hover:bg-ink-600 has-[:checked]:border-signal has-[:checked]:bg-signal-wash",
        className,
      )}
    >
      <input
        type="radio"
        aria-labelledby={textId}
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center border",
          "font-mono text-3xs tracking-mono",
          graded
            ? GRADED_INDEX[state as Exclude<AnswerState, "idle">]
            : "border-line-hairline text-mute-500 peer-checked:border-signal peer-checked:bg-signal peer-checked:text-ink-950",
        )}
      >
        {index}
      </span>
      <span id={textId} className="font-display text-base text-bone-100">
        {children}
      </span>
    </label>
  );
}

"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "../cn";

export interface FlipCardProps {
  front: ReactNode;
  /** A single answer, or several when the card has multiple correct answers. */
  back: ReactNode | ReactNode[];
  meta?: ReactNode;
  /** Regulatory citation, quoted precisely: "14 CFR 107.51 — ...". */
  citation?: ReactNode;
  index?: number;
  total?: number;
  height?: number;
  /** Cards still queued behind this one, drawn as 4px offset shells (max 3). */
  stack?: number;
  /** Controlled flip state. Omit to let the card manage its own. */
  flipped?: boolean;
  onFlip?: () => void;
}

const KICKER = "font-mono text-2xs uppercase tracking-label whitespace-nowrap";

function Bracket({
  corner,
  tone = "border-line-strong",
}: {
  corner: "tl" | "tr" | "bl" | "br";
  tone?: string;
}) {
  const top = corner[0] === "t";
  const left = corner[1] === "l";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute size-[9px]",
        top ? "-top-px border-t" : "-bottom-px border-b",
        left ? "-left-px border-l" : "-right-px border-r",
        tone,
      )}
    />
  );
}

const FACE =
  "absolute inset-0 flex flex-col justify-between overflow-hidden border p-8 font-display [backface-visibility:hidden] transition-fast";

export function FlipCard({
  front,
  back,
  meta,
  citation,
  index,
  total,
  height = 340,
  stack = 0,
  flipped,
  onFlip,
}: FlipCardProps) {
  const [internal, setInternal] = useState(false);
  const isFlipped = flipped ?? internal;
  const answers = Array.isArray(back) ? back : [back];
  const depth = Math.min(stack, 3);

  return (
    <div className="relative w-full" style={{ height }}>
      {Array.from({ length: depth }).map((_, i) => {
        const n = depth - i;
        return (
          <div
            key={n}
            aria-hidden="true"
            className="absolute z-0 border border-line-hairline bg-ink-900"
            style={{
              left: n * 4,
              right: -n * 4,
              top: n * 4,
              bottom: -n * 4,
              opacity: 1 - n * 0.22,
            }}
          />
        );
      })}

      {/*
        A button rather than a click-handled div: the card is the control, and
        this gets Space and Enter for free — which the design asks for anyway
        ("Space to reveal").
      */}
      <button
        type="button"
        aria-pressed={isFlipped}
        aria-label={isFlipped ? "Show prompt" : "Reveal answer"}
        onClick={() => (onFlip ? onFlip() : setInternal((v) => !v))}
        className="group relative z-1 size-full cursor-pointer text-left [perspective:1400px]"
      >
        <div
          className={cn(
            "relative size-full [transform-style:preserve-3d]",
            "transition-transform duration-[var(--duration-flip)] ease-default",
          )}
          style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div
            className={cn(
              FACE,
              "bg-ink-800",
              isFlipped
                ? "border-signal"
                : "border-line-hairline group-hover:border-line-strong",
            )}
          >
            <Bracket corner="tl" />
            <Bracket corner="tr" />
            <Bracket corner="bl" />
            <Bracket corner="br" />
            <div className="flex justify-between gap-4">
              <span className={cn(KICKER, "text-mute-500")}>Prompt</span>
              {meta && (
                <span className={cn(KICKER, "text-mute-500")}>{meta}</span>
              )}
            </div>
            <p className="m-0 text-2xl font-medium leading-snug tracking-tight text-pretty text-bone-100">
              {front}
            </p>
            <div className="flex justify-between gap-4">
              <span className={cn(KICKER, "text-mute-500")}>
                Space to reveal
              </span>
              {index !== undefined && (
                <span className={cn(KICKER, "text-mute-400")}>
                  {String(index).padStart(2, "0")}
                  {total ? ` / ${String(total).padStart(2, "0")}` : ""}
                </span>
              )}
            </div>
          </div>

          <div
            className={cn(
              FACE,
              "grid-overlay border-signal bg-ink-700 [transform:rotateY(180deg)]",
            )}
          >
            <Bracket corner="tl" tone="border-signal" />
            <Bracket corner="tr" tone="border-signal" />
            <Bracket corner="bl" tone="border-signal" />
            <Bracket corner="br" tone="border-signal" />
            <div className="flex justify-between gap-4">
              <span className={cn(KICKER, "text-signal")}>Answer</span>
              {meta && (
                <span className={cn(KICKER, "text-mute-500")}>{meta}</span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {answers.map((b, i) => (
                <div key={i} className="flex items-baseline gap-4">
                  {answers.length > 1 && (
                    <span className={cn(KICKER, "text-signal")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <p
                    className={cn(
                      "m-0 font-medium leading-snug tracking-tight text-bone-100",
                      answers.length > 1 ? "text-md" : "text-xl",
                    )}
                  >
                    {b}
                  </p>
                </div>
              ))}
            </div>
            <span
              className={cn(
                KICKER,
                citation ? "text-mute-400" : "text-mute-500",
              )}
            >
              {citation || "Space to return"}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Milliseconds a character takes to arrive. Fast enough to read along with,
 * slow enough to read as a transmission rather than a paste.
 */
export const TELETYPE_MS_PER_CHAR = 18;

export interface TeletypeProps {
  /**
   * One entry per line. Authored as lines rather than one string because these
   * are radio traffic — and because a line is the unit that gets a caret.
   */
  lines: string[];
  /** Fired exactly once, when the last character lands or the reader skips. */
  onDone?: () => void;
  className?: string;
}

/** True when the visitor has asked the system to stop moving. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Types a transmission out a character at a time.
 *
 * A pure-CSS `steps()` typewriter would suit this repo better — `ds/Navbar`
 * makes the point that CSS beats a matchMedia listener — but that technique
 * needs `white-space: nowrap`, and a dispatch line has to wrap on a phone
 * rather than run off the side. So the reveal is JS and the caret is CSS.
 *
 * Reduced motion is answered twice over: the duration tokens are zeroed in
 * global.css, and this renders complete on first paint rather than typing at
 * infinite speed, which would still flash.
 */
export function Teletype({ lines, onDone, className }: TeletypeProps) {
  const full = lines.join("\n");
  const [revealed, setRevealed] = useState(() =>
    prefersReducedMotion() ? full.length : 0,
  );

  // onDone is called from an interval and from a click; the latch is what keeps
  // a skip that races the final character from reporting twice.
  const doneRef = useRef(false);

  /**
   * The latest callback, held in a ref so the typing effect does not list
   * `onDone` as a dependency — callers pass an inline arrow, and depending on
   * it would restart the transmission from the first character on every parent
   * render.
   *
   * Synced in an effect rather than assigned during render: writing a ref while
   * rendering is not safe under concurrent React, and the lint rule is right to
   * refuse it. Declared before the typing effect so it is already current by
   * the time that one runs.
   */
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    doneRef.current = false;
    const complete = prefersReducedMotion() || full.length === 0;
    setRevealed(complete ? full.length : 0);

    if (complete) {
      doneRef.current = true;
      onDoneRef.current?.();
      return;
    }

    const timer = setInterval(() => {
      setRevealed((prev) => {
        const next = prev + 1;
        if (next >= full.length) {
          clearInterval(timer);
          if (!doneRef.current) {
            doneRef.current = true;
            onDoneRef.current?.();
          }
          return full.length;
        }
        return next;
      });
    }, TELETYPE_MS_PER_CHAR);

    return () => clearInterval(timer);
  }, [full]);

  const complete = revealed >= full.length;

  const skip = () => {
    setRevealed(full.length);
    if (!doneRef.current) {
      doneRef.current = true;
      onDoneRef.current?.();
    }
  };

  // Slice the joined text, then split it back apart, so the caret always sits
  // on the line currently being typed rather than at the end of the block.
  const shown = full.slice(0, revealed).split("\n");

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 font-mono text-sm leading-relaxed text-mute-400">
        {shown.map((line, i) => (
          <p key={i} className="m-0 max-w-[60ch]">
            <span className="text-signal">&gt;</span> {line}
            {!complete && i === shown.length - 1 && (
              <span
                aria-hidden
                className="cursor-blink ml-px inline-block w-[0.6ch] bg-signal align-baseline"
              >
                &nbsp;
              </span>
            )}
          </p>
        ))}
      </div>

      {/*
        A real button rather than a click handler on the panel: skipping is an
        action, and it has to be reachable from the keyboard like every other
        one. It disappears once there is nothing left to skip.
      */}
      {!complete && (
        <button
          type="button"
          onClick={skip}
          className="mt-4 label-mono text-mute-500 transition-fast hover:text-bone-100 focus-signal"
        >
          Skip transmission
        </button>
      )}
    </div>
  );
}

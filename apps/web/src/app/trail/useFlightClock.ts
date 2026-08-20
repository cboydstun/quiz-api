"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a burst takes, regardless of how much daylight it compresses. */
export const BURST_MS = 900;

/** Peak `--flight-speed` at the start of a burst; eases back to idle. */
const BURST_PEAK_SPEED = 6;

export type FlightMode = "HOLD" | "AWAITING_LINK" | "BURST" | "CRASH";

export interface FlightClockOptions {
  /** Daylight per question, in seconds. */
  seconds: number;
  /** True while a question is open — the only time daylight burns. */
  running: boolean;
  /** Switches the rAF loop for a 1s tick and makes moves snap. */
  reducedMotion: boolean;
  /** Fired once when daylight reaches zero; rearmed by `resetDaylight`. */
  onExpire: () => void;
}

export interface FlightClock {
  /** Attach to the node the CSS variables land on — the World/Drone subtree,
   *  never the shell root: a per-frame write there recalcs everything. */
  ref: React.RefObject<HTMLElement | null>;
  /** Whole seconds remaining, for the readout. The only per-second state. */
  daylight: number;
  mode: FlightMode;
  /** Commit clicked: the grade is in flight, the clock stops. */
  freeze: () => void;
  /** The grade failed: back to HOLD exactly where the clock stopped. */
  release: () => void;
  /** An advancing verdict landed: fly to `to` over `BURST_MS`. */
  burst: (to: number) => void;
  /** A DOWN verdict landed: the aircraft descends where it is. */
  crash: () => void;
  /** Snap the aircraft somewhere — launch, or a dispatch handoff. */
  setPosition: (position: number) => void;
  /** New question: fresh daylight, expiry rearmed. */
  resetDaylight: () => void;
}

/**
 * The trail's one clock.
 *
 * The verdict drives; the clock animates. Position never derives from raw
 * elapsed time — progress in this game is bought by graded answers arriving
 * over a slow network, so the loop only moves the aircraft when a verdict
 * said to (`burst`), and daylight is a countdown, not a position.
 *
 * The rAF loop never calls setState. It writes `--flight-progress` and
 * `--flight-speed` onto the ref'd node; the world and the drone read them in
 * CSS. Easing happens here in the loop because unregistered custom properties
 * do not interpolate. The single exception is the whole-second daylight
 * readout, which is real state because the meter renders it.
 *
 * A hidden tab pauses the clock — a free pause on purpose. The clock is a
 * difficulty knob, not a reading-speed test, and anti-cheat is a non-goal
 * here for the same reason the anonymous one-a-day gate is honest about
 * being bypassable.
 */
export function useFlightClock({
  seconds,
  running,
  reducedMotion,
  onExpire,
}: FlightClockOptions): FlightClock {
  const ref = useRef<HTMLElement | null>(null);

  const [daylight, setDaylight] = useState(seconds);
  const [mode, setMode] = useState<FlightMode>("HOLD");

  const remainingMs = useRef(seconds * 1000);
  const expired = useRef(false);
  const position = useRef(0);
  const burstFrom = useRef(0);
  const burstTo = useRef(0);
  const burstElapsed = useRef(0);
  const lastSpeed = useRef<string | null>(null);
  const hidden = useRef(false);

  // Read by the loop instead of listed as effect dependencies, so a parent
  // render never tears the loop down mid-frame.
  const modeRef = useRef<FlightMode>("HOLD");
  const runningRef = useRef(running);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    runningRef.current = running;
    onExpireRef.current = onExpire;
  });

  const writeProgress = useCallback((value: number) => {
    position.current = value;
    ref.current?.style.setProperty("--flight-progress", String(value));
  }, []);

  const writeSpeed = useCallback((value: number) => {
    const rounded = String(Math.round(value * 100) / 100);
    if (rounded === lastSpeed.current) return;
    lastSpeed.current = rounded;
    ref.current?.style.setProperty("--flight-speed", rounded);
  }, []);

  const setModeBoth = useCallback((next: FlightMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  /** Spends daylight and fires expiry, shared by both loop flavours. */
  const spend = useCallback((dt: number) => {
    if (modeRef.current !== "HOLD" || !runningRef.current || hidden.current)
      return;

    remainingMs.current = Math.max(0, remainingMs.current - dt);
    const whole = Math.ceil(remainingMs.current / 1000);
    setDaylight((prev) => (prev === whole ? prev : whole));

    if (remainingMs.current === 0 && !expired.current) {
      expired.current = true;
      onExpireRef.current();
    }
  }, []);

  // The loop. rAF normally; a 1s interval under reduced motion, because a
  // zero-duration animation frame loop is a busy loop, not stillness.
  useEffect(() => {
    if (reducedMotion) {
      const timer = setInterval(() => spend(1000), 1000);
      return () => clearInterval(timer);
    }

    let frame = 0;
    let last: number | null = null;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      if (last === null) {
        last = now;
        return;
      }
      const dt = now - last;
      last = now;
      if (hidden.current) return;

      spend(dt);

      if (modeRef.current === "BURST") {
        burstElapsed.current += dt;
        const t = Math.min(1, burstElapsed.current / BURST_MS);
        // Ease-out cubic on position; speed starts at peak and eases home.
        const eased = 1 - (1 - t) ** 3;
        writeSpeed(1 + (BURST_PEAK_SPEED - 1) * (1 - t));

        if (t >= 1) {
          writeProgress(burstTo.current);
          writeSpeed(1);
          setModeBoth("HOLD");
        } else {
          writeProgress(
            burstFrom.current +
              (burstTo.current - burstFrom.current) * eased,
          );
        }
      } else {
        writeSpeed(modeRef.current === "CRASH" ? 0 : 1);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, spend, writeProgress, writeSpeed, setModeBoth]);

  // A hidden tab stops rAF anyway; the listener makes the pause deliberate
  // (dt discarded, not banked) and gives audio a hook to suspend on.
  useEffect(() => {
    const onVisibility = () => {
      hidden.current = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const freeze = useCallback(() => {
    if (modeRef.current === "HOLD") setModeBoth("AWAITING_LINK");
  }, [setModeBoth]);

  const release = useCallback(() => {
    if (modeRef.current === "AWAITING_LINK") setModeBoth("HOLD");
  }, [setModeBoth]);

  const burst = useCallback(
    (to: number) => {
      if (reducedMotion) {
        writeProgress(to);
        expired.current = true;
        setModeBoth("HOLD");
        return;
      }
      burstFrom.current = position.current;
      burstTo.current = to;
      burstElapsed.current = 0;
      // A burst spends the question's remaining daylight by definition — the
      // clock must neither expire nor keep draining once the verdict landed.
      expired.current = true;
      setModeBoth("BURST");
    },
    [reducedMotion, writeProgress, setModeBoth],
  );

  const crash = useCallback(() => {
    setModeBoth("CRASH");
  }, [setModeBoth]);

  const setPosition = useCallback(
    (value: number) => writeProgress(value),
    [writeProgress],
  );

  const resetDaylight = useCallback(() => {
    remainingMs.current = seconds * 1000;
    expired.current = false;
    setDaylight(seconds);
    if (modeRef.current !== "CRASH") setModeBoth("HOLD");
  }, [seconds, setModeBoth]);

  return {
    ref,
    daylight,
    mode,
    freeze,
    release,
    burst,
    crash,
    setPosition,
    resetDaylight,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ds";
import { HUD } from "./HUD";
import { World } from "./World";
import { Teletype } from "./Teletype";
import { Dispatch } from "./panels/Dispatch";
import { Ending } from "./panels/Ending";
import { Question } from "./panels/Question";
import { Verdict } from "./panels/Verdict";
import { createTrailAudio, type TrailAudio } from "./audio";
import { currentLeg, type TrailState } from "./engine";
import type { FlightMode } from "./useFlightClock";
import type { DebriefEntry, TrailLeg } from "./types";

const BOOT_LINES = [
  "UPLINK ............ ok",
  "TELEMETRY ......... ok",
  "ROTOR ARM ......... ok",
  "FEED .............. live",
];

export interface TrailShellProps {
  run: TrailState;
  legs: TrailLeg[];
  trailDate: string;
  operator: string;
  daylight: number;
  verdict: DebriefEntry | null;
  crossing: number | null;
  notice: string | null;
  selected: string | null;
  grading: boolean;
  showHint: boolean;
  /** The node the flight clock writes its CSS variables onto. */
  clockRef: React.RefObject<HTMLElement | null>;
  /** The clock's segment state, for the drone's posture. */
  mode: FlightMode;
  onSelect: (answer: string) => void;
  onToggleHint: () => void;
  onDismissNotice: () => void;
  onCommit: () => void;
  onResume: () => void;
  onDismissCrossing: () => void;
  onEndingSeen: () => void;
}

/**
 * The ground station. Mounts at launch, unmounts after the ending beat — the
 * whole point is that nothing in here remounts between beats, so the meters
 * and the world animate real value changes instead of faking continuity.
 *
 * Beat order is the page's cascade, kept: verdict for the answer just given,
 * then the dispatch it triggered, then the ending, then the next question.
 */
export function TrailShell({
  run,
  legs,
  trailDate,
  operator,
  daylight,
  verdict,
  crossing,
  notice,
  selected,
  grading,
  showHint,
  clockRef,
  mode,
  onSelect,
  onToggleHint,
  onDismissNotice,
  onCommit,
  onResume,
  onDismissCrossing,
  onEndingSeen,
}: TrailShellProps) {
  /** The link-acquisition beat. Plays once per mount — once per run. */
  const [booting, setBooting] = useState(true);

  /**
   * The speakers. Built in an effect so StrictMode's dev double-mount tears
   * the first instance down cleanly instead of leaving two rotor loops, and
   * disposed with the shell — the run is the sound's whole life.
   */
  const audioRef = useRef<TrailAudio | null>(null);
  const [sound, setSound] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("trail:audio") === "on",
  );
  useEffect(() => {
    const audio = createTrailAudio();
    audioRef.current = audio;
    // The preference survives the day; the Launch click that mounted this
    // shell is the gesture that lets the context start.
    if (window.localStorage.getItem("trail:audio") === "on") {
      audio.enable();
    }
    const onVisibility = () =>
      audio.setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (sound) {
      audio.disable();
      window.localStorage.setItem("trail:audio", "off");
      setSound(false);
    } else {
      audio.enable();
      window.localStorage.setItem("trail:audio", "on");
      setSound(true);
    }
  };

  // The cues. Effects, because each is a reaction to state that already
  // changed for its own reasons — the sound never drives anything.
  useEffect(() => {
    if (verdict && !verdict.isCorrect) audioRef.current?.thud();
  }, [verdict]);
  useEffect(() => {
    if (crossing !== null) audioRef.current?.chime();
  }, [crossing]);
  useEffect(() => {
    audioRef.current?.setSpeed(
      mode === "BURST" ? 6 : mode === "CRASH" ? 0 : 1,
    );
  }, [mode]);
  useEffect(() => {
    if (run.battery > 0 && run.battery < 20) audioRef.current?.alert();
  }, [run.battery]);

  const leg = currentLeg(run, legs);

  let panel: React.ReactNode = null;
  if (booting) {
    panel = (
      <Panel label="Ground Station" tag="///" meta={trailDate} padding="md">
        <Teletype lines={BOOT_LINES} onDone={() => setBooting(false)} />
      </Panel>
    );
  } else if (verdict) {
    panel = <Verdict entry={verdict} onContinue={onResume} />;
  } else if (crossing !== null) {
    const active = legs[crossing];
    panel = active ? (
      <Dispatch
        leg={active}
        legCount={legs.length}
        onContinue={onDismissCrossing}
      />
    ) : null;
  } else if (run.status !== "FLYING") {
    panel = (
      <Ending
        run={run}
        legs={legs}
        trailDate={trailDate}
        onContinue={onEndingSeen}
      />
    );
  } else if (leg) {
    panel = (
      <Question
        run={run}
        leg={leg}
        daylight={daylight}
        selected={selected}
        grading={grading}
        showHint={showHint}
        onSelect={onSelect}
        onToggleHint={onToggleHint}
        onCommit={onCommit}
      />
    );
  }

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      {/* The clock's variables land here: the feed and its aircraft are the
          only per-frame consumers, so the write recalcs nothing else. */}
      <div ref={clockRef as React.RefObject<HTMLDivElement>}>
        {!booting && (
          <World
            legs={legs}
            terrain={leg?.terrain ?? ""}
            mode={mode}
            className="mb-3"
          />
        )}
      </div>
      {!booting && (
        <HUD
          run={run}
          legs={legs}
          operator={operator}
          daylight={daylight}
          verdict={verdict}
          crossing={crossing}
          notice={notice}
          onDismissNotice={onDismissNotice}
          audioSlot={
            <button
              type="button"
              onClick={toggleSound}
              className="label-mono text-mute-500 transition-fast hover:text-bone-100 focus-signal"
            >
              {sound ? "Sound on" : "Sound off"}
            </button>
          }
        />
      )}
      {panel}
    </div>
  );
}

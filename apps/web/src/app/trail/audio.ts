/**
 * The ground station's speakers. WebAudio synthesis only — no files, no
 * assets to license, and beeps fit the instrument language better than
 * samples would.
 *
 * Everything is a no-op until `enable()`, which is only ever called from the
 * HUD toggle's click handler: autoplay policy leaves an eagerly-created
 * AudioContext suspended anyway, so the context is created lazily on that
 * first genuine gesture. The rotor is filtered noise, thin and radio-ish —
 * these are GCS speakers reproducing a downlink, not an engine in the room.
 */

export interface TrailAudio {
  /** True between enable() and disable(). */
  readonly enabled: boolean;
  /** First call creates the context and starts the rotor; later calls resume. */
  enable: () => void;
  /** Suspends the context. The graph stays built for the next enable. */
  disable: () => void;
  /** The rotor tracks `--flight-speed`: 1 is idle, ~6 is a burst. */
  setSpeed: (speed: number) => void;
  /** Waypoint reached. */
  chime: () => void;
  /** A miss landing. */
  thud: () => void;
  /** Battery low: a slow two-tone, not a klaxon — this cockpit is flat. */
  alert: () => void;
  /** Tab hidden/shown. Resuming respects the enabled state. */
  setHidden: (hidden: boolean) => void;
  /** Shell unmount. Closes the context; the instance is done. */
  dispose: () => void;
}

export function createTrailAudio(): TrailAudio {
  let ctx: AudioContext | null = null;
  let rotorGain: GainNode | null = null;
  let rotorFilter: BiquadFilterNode | null = null;
  let rotorSource: AudioBufferSourceNode | null = null;
  let enabled = false;
  let disposed = false;

  const buildRotor = (context: AudioContext) => {
    // Two seconds of noise, looped. The filter sweep is what reads as pitch.
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      // A cheap LCG rather than Math.random keeps this deterministic-ish and
      // avoids caring: it is noise either way.
      data[i] = (((i * 1103515245 + 12345) % 65536) / 32768 - 1) * 0.6;
    }

    rotorSource = context.createBufferSource();
    rotorSource.buffer = buffer;
    rotorSource.loop = true;

    rotorFilter = context.createBiquadFilter();
    rotorFilter.type = "bandpass";
    rotorFilter.frequency.value = 140;
    rotorFilter.Q.value = 2.4;

    rotorGain = context.createGain();
    rotorGain.gain.value = 0.05;

    rotorSource.connect(rotorFilter);
    rotorFilter.connect(rotorGain);
    rotorGain.connect(context.destination);
    rotorSource.start();
  };

  const blip = (
    frequency: number,
    duration: number,
    volume: number,
    at = 0,
    type: OscillatorType = "square",
  ) => {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  };

  return {
    get enabled() {
      return enabled;
    },

    enable() {
      if (disposed) return;
      if (typeof AudioContext === "undefined") return;
      enabled = true;
      if (!ctx) {
        ctx = new AudioContext();
        buildRotor(ctx);
        return;
      }
      void ctx.resume();
    },

    disable() {
      enabled = false;
      void ctx?.suspend();
    },

    setSpeed(speed: number) {
      if (!ctx || !rotorFilter || !rotorGain) return;
      // Pitch and presence both track speed; idle sits where it was built.
      rotorFilter.frequency.value = 140 + (speed - 1) * 55;
      rotorGain.gain.value = Math.min(0.14, 0.05 + (speed - 1) * 0.015);
    },

    chime() {
      blip(880, 0.12, 0.06, 0, "sine");
    },

    thud() {
      blip(70, 0.25, 0.12, 0, "sine");
    },

    alert() {
      blip(440, 0.14, 0.05);
      blip(330, 0.14, 0.05, 0.22);
    },

    setHidden(hiddenNow: boolean) {
      if (!ctx) return;
      if (hiddenNow) {
        void ctx.suspend();
        return;
      }
      if (enabled) void ctx.resume();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      try {
        rotorSource?.stop();
      } catch {
        // Already stopped is fine; there is nothing else to do with it.
      }
      void ctx?.close();
      ctx = null;
    },
  };
}

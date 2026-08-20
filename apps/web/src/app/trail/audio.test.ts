import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrailAudio } from "./audio";

/**
 * jsdom has no WebAudio. The stub records enough of the graph to assert the
 * lifecycle — lazy creation, suspend/resume, teardown — without pretending to
 * test what anything sounds like.
 */
class StubNode {
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  frequency = { value: 0, setValueAtTime: vi.fn() };
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  playbackRate = { value: 1 };
  type = "sine";
  Q = { value: 0 };
  buffer = null;
  loop = false;
}

class StubContext {
  static instances: StubContext[] = [];
  state = "running";
  currentTime = 0;
  destination = new StubNode();
  sampleRate = 48000;
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain = vi.fn(() => new StubNode());
  createOscillator = vi.fn(() => new StubNode());
  createBiquadFilter = vi.fn(() => new StubNode());
  createBufferSource = vi.fn(() => new StubNode());
  createBuffer = vi.fn(() => ({
    getChannelData: () => new Float32Array(48000),
  }));
  constructor() {
    StubContext.instances.push(this);
  }
}

beforeEach(() => {
  StubContext.instances = [];
  vi.stubGlobal("AudioContext", StubContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTrailAudio", () => {
  it("creates no AudioContext until the first enable", () => {
    const audio = createTrailAudio();
    expect(StubContext.instances).toHaveLength(0);

    audio.enable();
    expect(StubContext.instances).toHaveLength(1);
  });

  it("does not create a second context on re-enable", () => {
    const audio = createTrailAudio();
    audio.enable();
    audio.disable();
    audio.enable();
    expect(StubContext.instances).toHaveLength(1);
  });

  it("stays silent before enable: cues are safe no-ops", () => {
    const audio = createTrailAudio();
    expect(() => {
      audio.chime();
      audio.thud();
      audio.alert();
      audio.setSpeed(6);
    }).not.toThrow();
    expect(StubContext.instances).toHaveLength(0);
  });

  it("suspends on disable and resumes on enable", () => {
    const audio = createTrailAudio();
    audio.enable();
    const ctx = StubContext.instances[0]!;

    audio.disable();
    expect(ctx.suspend).toHaveBeenCalled();

    audio.enable();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("suspends for a hidden tab and resumes only if still enabled", () => {
    const audio = createTrailAudio();
    audio.enable();
    const ctx = StubContext.instances[0]!;

    audio.setHidden(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);

    audio.setHidden(false);
    expect(ctx.resume).toHaveBeenCalledTimes(1);

    audio.disable();
    audio.setHidden(true);
    audio.setHidden(false);
    // Disabled: coming back to the tab must not resume the rotor.
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it("closes the context on dispose and survives a second dispose", () => {
    const audio = createTrailAudio();
    audio.enable();
    const ctx = StubContext.instances[0]!;

    audio.dispose();
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(() => audio.dispose()).not.toThrow();
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });
});

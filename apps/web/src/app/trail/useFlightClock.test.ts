import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlightClock } from "./useFlightClock";

/**
 * Drives the clock with fake timers. `toFake` must name rAF and performance
 * explicitly — vitest does not fake them by default, and the loop reads both.
 */
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
      "Date",
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

interface Options {
  seconds?: number;
  running?: boolean;
  reducedMotion?: boolean;
  onExpire?: () => void;
}

function mount(options: Options = {}) {
  const onExpire = options.onExpire ?? vi.fn();
  const el = document.createElement("div");

  const hook = renderHook(
    (props: Required<Pick<Options, "running" | "reducedMotion">>) =>
      useFlightClock({
        seconds: options.seconds ?? 45,
        running: props.running,
        reducedMotion: props.reducedMotion,
        onExpire,
      }),
    {
      initialProps: {
        running: options.running ?? true,
        reducedMotion: options.reducedMotion ?? false,
      },
    },
  );

  hook.result.current.ref.current = el;
  return { ...hook, el, onExpire };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("useFlightClock", () => {
  it("counts daylight down in whole seconds while running", () => {
    const { result } = mount({ seconds: 45 });
    expect(result.current.daylight).toBe(45);

    advance(1100);
    expect(result.current.daylight).toBe(44);

    advance(3100);
    expect(result.current.daylight).toBe(41);
  });

  it("holds daylight while not running", () => {
    const { result, rerender } = mount({ running: false });
    advance(5000);
    expect(result.current.daylight).toBe(45);

    rerender({ running: true, reducedMotion: false });
    advance(2200);
    expect(result.current.daylight).toBe(43);
  });

  it("fires onExpire exactly once when daylight runs out", () => {
    const onExpire = vi.fn();
    mount({ seconds: 2, onExpire });

    advance(1900);
    expect(onExpire).not.toHaveBeenCalled();

    advance(200);
    expect(onExpire).toHaveBeenCalledTimes(1);

    advance(5000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("freezes on commit and resumes where it stopped on release", () => {
    const { result } = mount({ seconds: 45 });
    advance(5100);
    expect(result.current.daylight).toBe(40);

    act(() => result.current.freeze());
    expect(result.current.mode).toBe("AWAITING_LINK");
    advance(10_000);
    expect(result.current.daylight).toBe(40);

    act(() => result.current.release());
    expect(result.current.mode).toBe("HOLD");
    advance(1100);
    expect(result.current.daylight).toBe(39);
  });

  it("does not expire while frozen, even past zero", () => {
    const onExpire = vi.fn();
    const { result } = mount({ seconds: 1, onExpire });

    act(() => result.current.freeze());
    advance(10_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("writes position and idle speed onto the node as custom properties", () => {
    const { result, el } = mount();
    act(() => result.current.setPosition(0.25));
    advance(50);

    expect(el.style.getPropertyValue("--flight-progress")).toBe("0.25");
    expect(el.style.getPropertyValue("--flight-speed")).toBe("1");
  });

  it("bursts to the target and lands exactly on it", () => {
    const { result, el } = mount();
    act(() => result.current.setPosition(0.2));
    act(() => result.current.freeze());
    act(() => result.current.burst(0.4));
    expect(result.current.mode).toBe("BURST");

    advance(450);
    const mid = Number(el.style.getPropertyValue("--flight-progress"));
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.4);
    expect(
      Number(el.style.getPropertyValue("--flight-speed")),
    ).toBeGreaterThan(1);

    advance(600);
    expect(el.style.getPropertyValue("--flight-progress")).toBe("0.4");
    expect(result.current.mode).toBe("HOLD");
    expect(el.style.getPropertyValue("--flight-speed")).toBe("1");
  });

  it("disarms expiry during a burst", () => {
    const onExpire = vi.fn();
    const { result } = mount({ seconds: 1, onExpire });

    act(() => result.current.freeze());
    act(() => result.current.burst(0.5));
    advance(2000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("resets daylight for the next question and rearms expiry", () => {
    const onExpire = vi.fn();
    const { result } = mount({ seconds: 2, onExpire });

    advance(2100);
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => result.current.resetDaylight());
    expect(result.current.daylight).toBe(2);
    advance(2100);
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it("crashes in place: position holds, mode reports CRASH", () => {
    const { result, el } = mount();
    act(() => result.current.setPosition(0.6));
    act(() => result.current.freeze());
    act(() => result.current.crash());
    expect(result.current.mode).toBe("CRASH");

    advance(2000);
    expect(el.style.getPropertyValue("--flight-progress")).toBe("0.6");
  });

  it("pauses while the tab is hidden and resumes on return", () => {
    const { result } = mount({ seconds: 45 });
    advance(1100);
    expect(result.current.daylight).toBe(44);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(10_000);
    expect(result.current.daylight).toBe(44);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(1100);
    expect(result.current.daylight).toBe(43);
  });

  it("ticks per second and snaps position under reduced motion", () => {
    const { result, el } = mount({ reducedMotion: true, seconds: 45 });
    advance(3000);
    expect(result.current.daylight).toBe(42);

    act(() => result.current.freeze());
    act(() => result.current.burst(0.8));
    // No animation: the position lands immediately and the mode settles.
    expect(el.style.getPropertyValue("--flight-progress")).toBe("0.8");
    expect(result.current.mode).toBe("HOLD");
  });
});

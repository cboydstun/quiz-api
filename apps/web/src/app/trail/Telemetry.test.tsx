import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { setReducedMotion } from "../../../vitest.setup";
import { Telemetry } from "./Telemetry";

afterEach(() => {
  vi.useRealTimers();
});

const readingsOf = (c: HTMLElement) => c.textContent;

describe("Telemetry", () => {
  it("shows altitude, heading and link", () => {
    const { container } = render(<Telemetry seed="ICING LAYER" />);
    expect(readingsOf(container)).toMatch(/ALT.*HDG.*LINK/);
  });

  it("moves on its own", async () => {
    vi.useFakeTimers();
    const { container } = render(<Telemetry seed="ICING LAYER" />);
    const before = readingsOf(container);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(readingsOf(container)).not.toBe(before);
  });

  // CSS cannot switch off content that changes, so this has to be handled in
  // JS rather than by the reduced-motion block in global.css.
  it("holds still under reduced motion", async () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    const { container } = render(<Telemetry seed="ICING LAYER" />);
    const before = readingsOf(container);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(readingsOf(container)).toBe(before);
  });

  it("gives different legs different numbers", () => {
    const { container: a } = render(<Telemetry seed="ICING LAYER" />);
    const { container: b } = render(<Telemetry seed="THE CLIMB" />);
    expect(readingsOf(a)).not.toBe(readingsOf(b));
  });

  it("stays out of the accessibility tree", () => {
    const { container } = render(<Telemetry seed="MAYDAY" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});

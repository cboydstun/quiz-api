import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AnimatedMeter } from "./AnimatedMeter";

const level = () =>
  screen.getByRole("meter").getAttribute("aria-valuenow");

describe("AnimatedMeter", () => {
  // The whole reason this component exists: a meter that mounts already at its
  // new value has no change to transition, so the drain is invisible.
  it("paints the old value before moving to the new one", () => {
    render(<AnimatedMeter label="Battery" from={94} to={86} />);
    expect(level()).toBe("94");
  });

  it("settles on the new value", async () => {
    render(<AnimatedMeter label="Battery" from={94} to={86} />);
    await waitFor(() => expect(level()).toBe("86"));
  });

  it("stays put when nothing changed", async () => {
    render(<AnimatedMeter label="Airframe" from={100} to={100} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(level()).toBe("100");
  });

  it("re-runs when the pair changes", async () => {
    const { rerender } = render(
      <AnimatedMeter label="Battery" from={94} to={86} />,
    );
    await waitFor(() => expect(level()).toBe("86"));

    rerender(<AnimatedMeter label="Battery" from={86} to={78} />);
    expect(level()).toBe("86");
    await waitFor(() => expect(level()).toBe("78"));
  });

  it("passes the rest of the meter's props straight through", () => {
    render(
      <AnimatedMeter label="Daylight" from={50} to={50} readout="22s" />,
    );
    expect(screen.getByText("22s")).toBeInTheDocument();
  });
});

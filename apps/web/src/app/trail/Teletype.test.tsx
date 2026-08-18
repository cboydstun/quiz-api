import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setReducedMotion } from "../../../vitest.setup";
import { Teletype, TELETYPE_MS_PER_CHAR } from "./Teletype";

const LINES = ["Ridge road, 0620.", "Ceiling coming down."];
const FULL_MS = LINES.join("").length * TELETYPE_MS_PER_CHAR + 500;

afterEach(() => {
  vi.useRealTimers();
});

/** Sets up fake timers the way quiz/page.test.tsx already does. */
const withTimers = () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
};

describe("Teletype", () => {
  it("reveals the text over time rather than all at once", async () => {
    withTimers();
    render(<Teletype lines={LINES} />);

    // Nothing of the second line can be present before the first finishes.
    expect(screen.queryByText(/Ceiling coming down/)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FULL_MS);
    });

    expect(screen.getByText(/Ridge road, 0620\./)).toBeInTheDocument();
    expect(screen.getByText(/Ceiling coming down\./)).toBeInTheDocument();
  });

  it("calls onDone once the last character lands", async () => {
    withTimers();
    const onDone = vi.fn();
    render(<Teletype lines={LINES} onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FULL_MS);
    });

    expect(onDone).toHaveBeenCalledOnce();
  });

  // Waiting out a transmission you have already read is the fastest way to
  // make a narrative beat feel like a tax.
  it("completes immediately when skipped", async () => {
    const user = withTimers();
    const onDone = vi.fn();
    render(<Teletype lines={LINES} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText(/Ceiling coming down\./)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("does not fire onDone twice when a skip races the last character", async () => {
    const user = withTimers();
    const onDone = vi.fn();
    render(<Teletype lines={LINES} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: /skip/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FULL_MS);
    });

    expect(onDone).toHaveBeenCalledOnce();
  });

  it("renders whole on the first paint under reduced motion", () => {
    setReducedMotion(true);
    const onDone = vi.fn();
    render(<Teletype lines={LINES} onDone={onDone} />);

    expect(screen.getByText(/Ridge road, 0620\./)).toBeInTheDocument();
    expect(screen.getByText(/Ceiling coming down\./)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledOnce();
    // Nothing left to skip.
    expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
  });

  it("drops the skip control once the text is complete", async () => {
    withTimers();
    render(<Teletype lines={LINES} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FULL_MS);
    });

    expect(
      screen.queryByRole("button", { name: /skip/i }),
    ).not.toBeInTheDocument();
  });

  it("restarts when the lines change", async () => {
    withTimers();
    const { rerender } = render(<Teletype lines={LINES} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FULL_MS);
    });
    expect(screen.getByText(/Ceiling coming down\./)).toBeInTheDocument();

    rerender(<Teletype lines={["Powerline corridor, 1410."]} />);
    expect(screen.queryByText(/Ceiling coming down\./)).not.toBeInTheDocument();
  });

  it("renders nothing and reports done for an empty transmission", () => {
    const onDone = vi.fn();
    render(<Teletype lines={[]} onDone={onDone} />);

    expect(onDone).toHaveBeenCalledOnce();
  });
});

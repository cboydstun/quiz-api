import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AnimatedRouteStrip } from "./AnimatedRouteStrip";

const marker = () => screen.getByTestId("route-marker").style.left;

describe("AnimatedRouteStrip", () => {
  // The whole reason this component exists: the screens are siblings, so the
  // strip remounts already at its new position and has nothing to transition.
  it("paints the old position before flying to the new one", () => {
    render(<AnimatedRouteStrip total={5} current={1} from={1} to={1.5} />);
    expect(marker()).toBe("25%");
  });

  it("settles on the new position", async () => {
    render(<AnimatedRouteStrip total={5} current={1} from={1} to={1.5} />);
    await waitFor(() => expect(marker()).toBe("37.5%"));
  });

  it("stays put when nothing changed", async () => {
    render(<AnimatedRouteStrip total={5} current={2} from={2} to={2} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(marker()).toBe("50%");
  });

  it("re-runs when the pair changes", async () => {
    const { rerender } = render(
      <AnimatedRouteStrip total={5} current={1} from={1} to={1.5} />,
    );
    await waitFor(() => expect(marker()).toBe("37.5%"));

    rerender(<AnimatedRouteStrip total={5} current={2} from={1.5} to={2} />);
    expect(marker()).toBe("37.5%");
    await waitFor(() => expect(marker()).toBe("50%"));
  });

  // The nodes and the label are the strip's job, not this component's.
  it("passes the rest of the strip's props straight through", () => {
    render(<AnimatedRouteStrip total={8} current={3} from={3} to={3} />);
    expect(screen.getAllByTestId("route-node")).toHaveLength(8);
    expect(
      screen.getByRole("group", { name: "Leg 4 of 8" }),
    ).toBeInTheDocument();
  });
});

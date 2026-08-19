import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteStrip } from "./RouteStrip";

const nodes = () => screen.getAllByTestId("route-node");

describe("RouteStrip", () => {
  it("shows one node per leg", () => {
    render(<RouteStrip total={8} current={0} />);
    expect(nodes()).toHaveLength(8);
  });

  it("marks exactly one leg as the current one", () => {
    render(<RouteStrip total={8} current={3} />);
    const states = nodes().map((n) => n.dataset.state);

    expect(states.filter((s) => s === "current")).toHaveLength(1);
    expect(states[3]).toBe("current");
  });

  it("separates flown legs from those still ahead", () => {
    render(<RouteStrip total={5} current={2} />);
    expect(nodes().map((n) => n.dataset.state)).toEqual([
      "flown",
      "flown",
      "current",
      "pending",
      "pending",
    ]);
  });

  // The picture is decorative; the position must survive without it.
  it("carries the position as a readable label", () => {
    render(<RouteStrip total={8} current={3} />);
    expect(screen.getByRole("group", { name: "Leg 4 of 8" })).toBeInTheDocument();
  });

  it("does not divide by zero on a one-leg route", () => {
    render(<RouteStrip total={1} current={0} />);
    expect(nodes()).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Leg 1 of 1" })).toBeInTheDocument();
  });
});

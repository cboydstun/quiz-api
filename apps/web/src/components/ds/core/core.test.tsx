import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Label } from "./Label";
import { Meter } from "./Meter";
import { Panel } from "./Panel";
import { Readout } from "./Readout";
import { Rule } from "./Rule";
import { Status } from "./Status";

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start Run</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Start Run" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Start Run
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Run" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Abort</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("honours an explicit type", () => {
    render(<Button type="submit">Sign In</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("carries the signal fill when selected, whatever the variant", () => {
    render(
      <Button variant="outline" selected>
        Ten
      </Button>,
    );
    expect(screen.getByRole("button").className).toContain("bg-signal");
  });
});

describe("Panel", () => {
  it("renders its children", () => {
    render(<Panel>Bank contents</Panel>);
    expect(screen.getByText("Bank contents")).toBeInTheDocument();
  });

  it("renders a label bar with the signal tag and meta when given", () => {
    render(
      <Panel label="Evaluation" tag="///" meta="40 items">
        body
      </Panel>,
    );
    expect(screen.getByText("Evaluation")).toBeInTheDocument();
    expect(screen.getByText("///")).toBeInTheDocument();
    expect(screen.getByText("40 items")).toBeInTheDocument();
  });

  it("omits the label bar entirely when unlabelled", () => {
    const { container } = render(<Panel>body</Panel>);
    expect(container.querySelectorAll("div").length).toBe(2); // shell + content
  });
});

describe("Readout", () => {
  it("renders label, value and unit", () => {
    render(<Readout label="Score" value="3,720" unit="pts" />);
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("3,720")).toBeInTheDocument();
    expect(screen.getByText("pts")).toBeInTheDocument();
  });

  it("colours only the value by tone", () => {
    render(<Readout label="Accuracy" value="98%" tone="go" />);
    expect(screen.getByText("98%").className).toContain("text-go");
    expect(screen.getByText("Accuracy").className).not.toContain("text-go");
  });
});

describe("Label", () => {
  it("renders the tag and the text", () => {
    render(<Label tag="///">Time Remaining</Label>);
    expect(screen.getByText("///")).toBeInTheDocument();
    expect(screen.getByText("Time Remaining")).toBeInTheDocument();
  });
});

describe("Status", () => {
  it("renders its text", () => {
    render(<Status tone="go">Correct</Status>);
    expect(screen.getByText("Correct")).toBeInTheDocument();
  });

  it("drops the annunciator dot when dot={false}", () => {
    const { container } = render(
      <Status tone="abort" dot={false}>
        Missed
      </Status>,
    );
    expect(container.querySelectorAll("span").length).toBe(1);
  });
});

describe("Meter", () => {
  it("exposes the level to assistive tech", () => {
    render(<Meter label="Battery" value={61} />);
    const meter = screen.getByRole("meter", { name: "Battery" });
    expect(meter).toHaveAttribute("aria-valuenow", "61");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the level as a percentage by default", () => {
    render(<Meter label="Airframe" value={80} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows a readout instead when given one", () => {
    render(<Meter label="Daylight" value={30} readout="2h" />);
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.queryByText("30%")).not.toBeInTheDocument();
  });

  it("clamps out-of-range values rather than overflowing the bar", () => {
    render(<Meter label="Battery" value={140} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps below zero too", () => {
    render(<Meter label="Battery" value={-20} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  });

  // A bar reading empty while the run is still flying is a bug the user sees.
  it("lights a segment for any charge at all", () => {
    const { container } = render(<Meter label="Battery" value={1} />);
    const lit = container.querySelectorAll(".bg-abort");
    expect(lit.length).toBe(1);
  });

  it("goes dark at zero", () => {
    const { container } = render(<Meter label="Battery" value={0} />);
    expect(container.querySelectorAll(".bg-abort").length).toBe(0);
  });

  // The tone carries the warning; a fixed tone would make a dying battery look
  // the same as a full one.
  it("colours itself by level unless told otherwise", () => {
    const { container: healthy } = render(<Meter label="A" value={90} />);
    expect(healthy.querySelector(".bg-go")).not.toBeNull();

    const { container: low } = render(<Meter label="B" value={10} />);
    expect(low.querySelector(".bg-abort")).not.toBeNull();

    const { container: fixed } = render(
      <Meter label="C" value={10} tone="info" />,
    );
    expect(fixed.querySelector(".bg-info")).not.toBeNull();
  });
});

describe("Rule", () => {
  it("renders a bare hairline with no label", () => {
    const { container } = render(<Rule />);
    expect(container.querySelector("span")).toBeNull();
  });

  it("renders the label beside the hairline when given", () => {
    render(<Rule label="Domains" />);
    expect(screen.getByText("Domains")).toBeInTheDocument();
  });
});

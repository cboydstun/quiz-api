import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Label } from "./Label";
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

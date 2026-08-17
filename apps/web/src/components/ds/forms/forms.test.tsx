import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnswerOption } from "./AnswerOption";
import { Checkbox } from "./Checkbox";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates its label with the input", () => {
    render(<TextField id="email" label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("reports each keystroke through onChange", async () => {
    const onChange = vi.fn();
    render(<TextField id="callsign" label="Callsign" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/callsign/i), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("renders a hint", () => {
    render(<TextField id="pw" label="Password" hint="Minimum 8 characters" />);
    expect(screen.getByText("Minimum 8 characters")).toBeInTheDocument();
  });

  it("marks the input invalid and reddens the hint when error is set", () => {
    render(<TextField id="pw" label="Password" hint="Too short" error />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Too short").className).toContain("text-abort");
  });

  it("passes through the input type", () => {
    render(<TextField id="pw" label="Password" type="password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "type",
      "password",
    );
  });
});

describe("Checkbox", () => {
  it("toggles through onChange", async () => {
    const onChange = vi.fn();
    render(
      <Checkbox
        id="remember"
        label="Remember this device"
        checked={false}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByLabelText(/remember this device/i));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("reflects the checked prop", () => {
    render(<Checkbox id="r" label="Remember" checked onChange={() => {}} />);
    expect(screen.getByLabelText(/remember/i)).toBeChecked();
  });
});

describe("AnswerOption", () => {
  it("exposes a radio labelled by its answer text", () => {
    render(
      <AnswerOption name="q1" value="a" index="01" onChange={() => {}}>
        400 feet AGL
      </AnswerOption>,
    );
    expect(
      screen.getByRole("radio", { name: /400 feet AGL/i }),
    ).toBeInTheDocument();
  });

  it("fires onChange when selected", async () => {
    const onChange = vi.fn();
    render(
      <AnswerOption name="q1" value="a" index="01" onChange={onChange}>
        400 feet AGL
      </AnswerOption>,
    );
    await userEvent.click(screen.getByRole("radio"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("takes the go border once graded correct", () => {
    const { container } = render(
      <AnswerOption
        name="q1"
        value="a"
        index="01"
        state="correct"
        onChange={() => {}}
      >
        400 feet AGL
      </AnswerOption>,
    );
    expect(container.querySelector("label")?.className).toContain("border-go");
  });

  it("takes the abort border once graded incorrect", () => {
    const { container } = render(
      <AnswerOption
        name="q1"
        value="b"
        index="02"
        state="incorrect"
        onChange={() => {}}
      >
        400 feet MSL
      </AnswerOption>,
    );
    expect(container.querySelector("label")?.className).toContain(
      "border-abort",
    );
  });
});

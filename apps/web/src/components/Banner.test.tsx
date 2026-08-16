import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Banner from "./Banner";

describe("Banner", () => {
  it("renders the message as an alert", () => {
    render(<Banner kind="success" message="Saved" onDismiss={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Saved");
  });

  it("calls onDismiss when dismissed", async () => {
    const onDismiss = vi.fn();
    render(<Banner kind="error" message="Boom" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

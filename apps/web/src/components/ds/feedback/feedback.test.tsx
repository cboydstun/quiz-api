import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

describe("Alert", () => {
  it("renders as an alert with the tone's default kicker", () => {
    render(<Alert tone="abort">Both fields are required.</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Both fields are required.");
    expect(alert).toHaveTextContent("FAULT");
  });

  it("lets the kicker be overridden", () => {
    render(
      <Alert tone="go" kicker="SAVED">
        Question updated.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("SAVED");
  });

  it("renders a dismiss control only when onDismiss is given", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Alert tone="info">Notice</Alert>);
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();

    rerender(
      <Alert tone="info" onDismiss={onDismiss}>
        Notice
      </Alert>,
    );
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} title="Abort run">
        Progress will not be recorded.
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a labelled dialog with its actions", () => {
    render(
      <Modal title="Abort run" actions={<button>Abort</button>}>
        Progress will not be recorded.
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("Progress will not be recorded.");
    expect(screen.getByRole("button", { name: "Abort" })).toBeInTheDocument();
  });

  it("dismisses on a scrim click but not on a click inside the panel", async () => {
    const onDismiss = vi.fn();
    render(
      <Modal title="Abort run" onDismiss={onDismiss}>
        Body copy
      </Modal>,
    );

    await userEvent.click(screen.getByText("Body copy"));
    expect(onDismiss).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("modal-scrim"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("dismisses on Escape", async () => {
    const onDismiss = vi.fn();
    render(
      <Modal title="Abort run" onDismiss={onDismiss}>
        Body copy
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("Spinner", () => {
  it("announces itself with its label", () => {
    render(<Spinner label="Loading bank" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading bank");
  });
});

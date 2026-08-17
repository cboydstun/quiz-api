import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./AdminSidebar";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/quiz", label: "Evaluation" },
];

describe("Navbar", () => {
  it("renders the brand and every link", () => {
    render(<Navbar links={LINKS} />);
    expect(screen.getByText("Drone Pilot Quiz")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Overview" })).not.toHaveLength(
      0,
    );
    expect(
      screen.getAllByRole("link", { name: "Evaluation" }),
    ).not.toHaveLength(0);
  });

  it("marks the active link as the current page", () => {
    render(<Navbar links={LINKS} activeHref="/quiz" />);
    const active = screen
      .getAllByRole("link", { name: "Evaluation" })
      .find((el) => el.getAttribute("aria-current") === "page");
    expect(active).toBeDefined();
  });

  it("offers Sign In and Request Access when signed out", () => {
    render(<Navbar links={LINKS} onAuthClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /request access/i }).length,
    ).toBeGreaterThan(0);
  });

  it("offers Sign Out and no Request Access when signed in", () => {
    render(<Navbar links={LINKS} loggedIn onAuthClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /request access/i })).toBeNull();
  });

  it("calls onAuthClick from the auth button", async () => {
    const onAuthClick = vi.fn();
    render(<Navbar links={LINKS} onAuthClick={onAuthClick} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onAuthClick).toHaveBeenCalledOnce();
  });

  it("toggles the collapsed menu", async () => {
    render(<Navbar links={LINKS} />);
    const toggle = screen.getByRole("button", { name: /menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Footer", () => {
  it("carries the FAA disclaimer", () => {
    render(<Footer />);
    expect(
      screen.getByText(/not affiliated with the federal/i),
    ).toBeInTheDocument();
  });

  it("renders the configured columns", () => {
    render(
      <Footer
        columns={[
          { title: "Reference", links: [{ href: "/faq", label: "FAQ" }] },
        ]}
      />,
    );
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute(
      "href",
      "/faq",
    );
  });
});

describe("AdminSidebar", () => {
  it("shows the operator tab only when the caller may manage users", () => {
    const { rerender } = render(
      <AdminSidebar activeTab="questions" username="chris" role="EDITOR" />,
    );
    expect(screen.queryByRole("button", { name: /operators/i })).toBeNull();

    rerender(
      <AdminSidebar
        activeTab="questions"
        username="chris"
        role="ADMIN"
        canManageUsers
      />,
    );
    expect(
      screen.getByRole("button", { name: /operators/i }),
    ).toBeInTheDocument();
  });

  it("reports tab changes", async () => {
    const onTabChange = vi.fn();
    render(
      <AdminSidebar
        activeTab="questions"
        username="chris"
        role="ADMIN"
        canManageUsers
        onTabChange={onTabChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /operators/i }));
    expect(onTabChange).toHaveBeenCalledWith("users");
  });

  it("renders the operator name and role", () => {
    render(
      <AdminSidebar activeTab="users" username="chris" role="SUPER_ADMIN" />,
    );
    expect(screen.getByText("chris")).toBeInTheDocument();
    expect(screen.getByText("SUPER ADMIN")).toBeInTheDocument();
  });
});

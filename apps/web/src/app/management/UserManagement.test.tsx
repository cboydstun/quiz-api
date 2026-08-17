import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NewUser, Role, User } from "@/types";
import UserManagement from "./UserManagement";

const users: User[] = [
  { id: "1", username: "zara", email: "zara@example.com", role: "USER" },
  { id: "2", username: "amelia", email: "amelia@example.com", role: "ADMIN" },
  { id: "3", username: "root", email: "root@example.com", role: "SUPER_ADMIN" },
  { id: "4", username: "milo", email: "milo@example.com", role: "EDITOR" },
];

const noop = () => {};

const renderTable = (viewer: User) => {
  const handleChangeUserRole = vi.fn<(userId: string, newRole: Role) => void>();
  const handleDeleteUser = vi.fn<(userId: string) => void>();
  const handleRegisterUser = vi.fn<(newUser: NewUser) => void>();

  render(
    <UserManagement
      user={viewer}
      usersData={{ users }}
      handleChangeUserRole={handleChangeUserRole}
      handleDeleteUser={handleDeleteUser}
      handleRegisterUser={handleRegisterUser}
    />,
  );
  return { handleChangeUserRole, handleDeleteUser, handleRegisterUser };
};

const usernameColumn = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

const admin = users[1];
const superAdmin = users[2];

describe("UserManagement visibility", () => {
  it("hides SUPER_ADMIN rows from a plain ADMIN", () => {
    renderTable(admin);
    expect(usernameColumn()).toEqual(["amelia", "milo", "zara"]);
    expect(screen.queryByText("root")).not.toBeInTheDocument();
  });

  it("shows every row to a SUPER_ADMIN", () => {
    renderTable(superAdmin);
    expect(usernameColumn()).toEqual(["amelia", "milo", "root", "zara"]);
  });

  it("only offers the SUPER_ADMIN role option to a SUPER_ADMIN", () => {
    const { unmount } = render(
      <UserManagement
        user={admin}
        usersData={{ users }}
        handleChangeUserRole={noop}
        handleDeleteUser={noop}
        handleRegisterUser={noop}
      />,
    );
    expect(
      screen.queryByRole("option", { name: "SUPER_ADMIN" }),
    ).not.toBeInTheDocument();
    unmount();

    renderTable(superAdmin);
    expect(
      screen.getAllByRole("option", { name: "SUPER_ADMIN" }).length,
    ).toBeGreaterThan(0);
  });

  it("tolerates a null users list", () => {
    render(
      <UserManagement
        user={admin}
        usersData={{ users: null }}
        handleChangeUserRole={noop}
        handleDeleteUser={noop}
        handleRegisterUser={noop}
      />,
    );
    // The design system renders an explicit empty-state row rather than an
    // empty body, so the assertion is on the message rather than a row count.
    expect(screen.getByText("No operators match.")).toBeInTheDocument();
  });
});

describe("UserManagement actions", () => {
  it("filters by role", async () => {
    const user = userEvent.setup();
    renderTable(superAdmin);
    await user.selectOptions(
      screen.getByLabelText(/filter by role/i),
      "EDITOR",
    );
    expect(usernameColumn()).toEqual(["milo"]);
  });

  it("passes a typed Role to the change handler", async () => {
    const user = userEvent.setup();
    const { handleChangeUserRole } = renderTable(superAdmin);

    const zaraRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryByText("zara"))!;
    await user.selectOptions(within(zaraRow).getByRole("combobox"), "ADMIN");

    expect(handleChangeUserRole).toHaveBeenCalledWith("1", "ADMIN");
  });

  it("submits a new user from the modal", async () => {
    const user = userEvent.setup();
    const { handleRegisterUser } = renderTable(admin);

    await user.click(screen.getByRole("button", { name: /create new user/i }));
    await user.type(screen.getByLabelText("Username"), "newbie");
    await user.type(screen.getByLabelText("Email"), "newbie@example.com");
    await user.type(screen.getByLabelText("Temporary Password"), "hunter2!!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(handleRegisterUser).toHaveBeenCalledWith({
      username: "newbie",
      email: "newbie@example.com",
      password: "hunter2!!",
      role: "USER",
    });
  });
});

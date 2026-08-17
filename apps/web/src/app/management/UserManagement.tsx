"use client";

import React, { useState } from "react";
import { isRole, type NewUser, type Role, type User } from "@/types";
import {
  Button,
  DataTable,
  Modal,
  Panel,
  Select,
  TextField,
  type DataTableColumn,
} from "@/components/ds";

import type { SortDirection } from "@/components/ds";

type SortField = "username" | "email" | "role";

interface UserManagementProps {
  usersData?: { users: User[] | null };
  handleChangeUserRole: (userId: string, newRole: Role) => void;
  handleDeleteUser: (userId: string) => void;
  handleRegisterUser: (newUser: NewUser) => void;
  user: User;
}

const UserManagement: React.FC<UserManagementProps> = ({
  usersData,
  handleChangeUserRole,
  handleDeleteUser,
  handleRegisterUser,
  user,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    username: "",
    email: "",
    role: "USER",
    password: "",
  });
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("username");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegisterUser(newUser);
    closeModal();
    setNewUser({ username: "", email: "", role: "USER", password: "" });
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field as SortField);
      setSortDirection("asc");
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = (usersData?.users ?? [])
    .filter(
      (u) =>
        (user.role === "SUPER_ADMIN" || u.role !== "SUPER_ADMIN") &&
        (roleFilter === "ALL" || u.role === roleFilter),
    )
    .sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const canSeeSuperAdmin = user.role === "SUPER_ADMIN";

  const columns: Array<string | DataTableColumn> = [
    { label: "Username", sortKey: "username" },
    { label: "Email", sortKey: "email" },
    { label: "Role", sortKey: "role" },
    "Actions",
  ];

  const rows = filteredAndSortedUsers.map((u) => {
    const locked = u.role === "SUPER_ADMIN" && !canSeeSuperAdmin;
    return [
      u.username,
      u.email,
      <Select
        key="role"
        bare
        aria-label={`Role for ${u.username}`}
        value={u.role}
        disabled={locked}
        onChange={(e) => {
          const value = e.target.value;
          if (isRole(value)) handleChangeUserRole(u.id, value);
        }}
      >
        <option value="USER">USER</option>
        <option value="EDITOR">EDITOR</option>
        <option value="ADMIN">ADMIN</option>
        {canSeeSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
      </Select>,
      <Button
        key="delete"
        variant="abort"
        size="sm"
        disabled={locked}
        onClick={() => handleDeleteUser(u.id)}
      >
        Delete
      </Button>,
    ];
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <Select
          bare
          id="roleFilter"
          label="Filter by Role:"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-56"
        >
          <option value="ALL">ALL</option>
          <option value="USER">USER</option>
          <option value="EDITOR">EDITOR</option>
          <option value="ADMIN">ADMIN</option>
          {canSeeSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
        </Select>
        <Button variant="signal" size="sm" onClick={openModal}>
          Create New User
        </Button>
      </div>

      <Panel
        label="Operators"
        meta={`${filteredAndSortedUsers.length} records`}
        padding="none"
      >
        <DataTable
          columns={columns}
          rows={rows}
          sortKey={sortField}
          sortDir={sortDirection}
          onSort={handleSort}
          empty="No operators match."
        />
      </Panel>

      <Modal
        open={isModalOpen}
        label="Invite Operator"
        title="Create new user"
        onDismiss={closeModal}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="create-user" variant="signal" size="sm">
              Create User
            </Button>
          </>
        }
      >
        <form id="create-user" onSubmit={handleSubmit}>
          <TextField
            id="new-username"
            name="username"
            label="Username"
            value={newUser.username}
            onChange={handleInputChange}
            required
          />
          <TextField
            id="new-email"
            name="email"
            label="Email"
            type="email"
            value={newUser.email}
            onChange={handleInputChange}
            required
          />
          <TextField
            id="new-password"
            name="password"
            label="Temporary Password"
            type="password"
            value={newUser.password}
            onChange={handleInputChange}
            required
          />
          <Select
            id="new-role"
            name="role"
            label="Role"
            value={newUser.role}
            onChange={handleInputChange}
          >
            <option value="USER">USER</option>
            <option value="EDITOR">EDITOR</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;

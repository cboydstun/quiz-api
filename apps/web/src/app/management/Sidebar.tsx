"use client";

import { AdminSidebar, type AdminTab } from "@/components/ds";
import { USER_ADMIN_ROLES, type User } from "@/types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

/**
 * Positions the design system's control sidebar. The role rule lives here so
 * `USER_ADMIN_ROLES` stays the single source of truth for it.
 */
export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
}: SidebarProps) {
  return (
    <div className="fixed top-16 bottom-0 left-0 w-[264px] overflow-y-auto">
      <AdminSidebar
        activeTab={activeTab as AdminTab}
        onTabChange={setActiveTab}
        username={user.username}
        role={user.role}
        canManageUsers={USER_ADMIN_ROLES.includes(user.role)}
      />
    </div>
  );
}

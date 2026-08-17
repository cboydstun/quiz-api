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
  /*
    The rail is only fixed from `lg`, because that is the only breakpoint where
    the content is offset to make room for it (`lg:ml-[264px]` in page.tsx).
    Fixed at every width, it sat on top of the content it was supposed to sit
    beside, which made /management unusable on a phone. Below `lg` it becomes
    an ordinary block above the panel.
  */
  return (
    <div className="border-b border-line-hairline lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:w-[264px] lg:overflow-y-auto lg:border-b-0">
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

"use client";

import { QuestionMarkCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
import { Status } from "../core/Status";
import { cn } from "../cn";

export type AdminTab = "users" | "questions";

export interface AdminSidebarProps {
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  username: string;
  role: string;
  /**
   * Whether the operator tab is offered. Passed in rather than derived from
   * `role` so the app keeps one source of truth for that rule.
   */
  canManageUsers?: boolean;
}

function Item({
  icon: Icon,
  label,
  code,
  active,
  onClick,
}: {
  icon: typeof UsersIcon;
  label: string;
  code: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 border-l-2 p-4 text-left",
          "font-mono text-2xs uppercase tracking-label transition-fast",
          active
            ? "border-l-signal bg-ink-700 text-bone-100"
            : "border-l-transparent text-mute-400 hover:bg-ink-600 hover:text-bone-100",
        )}
      >
        <Icon className="size-4 stroke-[1.5]" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        <span className="text-mute-500">{code}</span>
      </button>
    </li>
  );
}

export function AdminSidebar({
  activeTab = "questions",
  onTabChange,
  username,
  role,
  canManageUsers = false,
}: AdminSidebarProps) {
  return (
    <div className="min-h-full w-[264px] shrink-0 border-r border-line-hairline bg-ink-800 font-display">
      <div className="border-b border-line-hairline p-5">
        <div className="mb-3 label-mono text-mute-500">Control</div>
        <div className="mb-3 text-lg font-medium tracking-tight text-bone-100">
          {username}
        </div>
        <Status tone="neutral" dot={false}>
          {role.replace("_", " ")}
        </Status>
      </div>
      <nav>
        <ul className="m-0 list-none p-0">
          {canManageUsers && (
            <Item
              icon={UsersIcon}
              label="Operators"
              code="01"
              active={activeTab === "users"}
              onClick={() => onTabChange?.("users")}
            />
          )}
          <Item
            icon={QuestionMarkCircleIcon}
            label="Question Bank"
            code="02"
            active={activeTab === "questions"}
            onClick={() => onTabChange?.("questions")}
          />
        </ul>
      </nav>
    </div>
  );
}

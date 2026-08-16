"use client";

import React from "react";
import { USER_ADMIN_ROLES, type User } from "@/types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const canManageUsers = USER_ADMIN_ROLES.includes(user.role);

  return (
    <div className="w-64 bg-linear-to-b from-blue-600 to-blue-600 text-white h-screen fixed left-0 top-0 overflow-y-auto shadow-lg">
      <div className="p-6 mt-16">
        <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
        <p className="mb-2 text-sm opacity-80">Welcome,</p>
        <p className="mb-4 font-semibold">{user.username}</p>
        <p className="mb-4 text-sm bg-white/20 px-2 py-1 rounded-sm inline-block">
          Role: {user.role}
        </p>
      </div>
      <nav>
        <ul className="space-y-2">
          {canManageUsers && (
            <li>
              <button
                className={`w-full text-left p-4 hover:bg-white/10 transition-colors duration-200 flex items-center ${
                  activeTab === "users" ? "bg-white/20" : ""
                }`}
                onClick={() => setActiveTab("users")}
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                User Management
              </button>
            </li>
          )}
          <li>
            <button
              className={`w-full text-left p-4 hover:bg-white/10 transition-colors duration-200 flex items-center ${
                activeTab === "questions" ? "bg-white/20" : ""
              }`}
              onClick={() => setActiveTab("questions")}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Question Management
            </button>
          </li>
          {/* Add more sidebar items here as needed */}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;

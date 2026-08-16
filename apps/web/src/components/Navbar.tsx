// src/components/Navbar.tsx

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { CombinedGraphQLErrors } from "@apollo/client";
import { MANAGEMENT_ROLES } from "@/types";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/quiz", label: "Start Quiz" },
  { href: "/flash-cards", label: "Flash Cards" },
  { href: "/study-materials", label: "Study Materials" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // Derived from context rather than mirrored into state — a second copy only
  // ever drifts.
  const isLoggedIn = !!user;
  const canAccessManagement = !!user && MANAGEMENT_ROLES.includes(user.role);

  const links = useMemo(
    () => [
      ...PUBLIC_LINKS,
      ...(isLoggedIn
        ? [
            { href: "/leaderboard", label: "Leaderboard" },
            ...(canAccessManagement
              ? [{ href: "/management", label: "Management" }]
              : []),
            { href: "/profile", label: "Profile" },
          ]
        : []),
    ],
    [isLoggedIn, canAccessManagement],
  );

  const handleAuthClick = async () => {
    try {
      if (isLoggedIn) {
        await logout();
        router.push("/");
      } else {
        router.push("/login");
      }
    } catch (err) {
      if (CombinedGraphQLErrors.is(err)) {
        console.error("Apollo Error:", err);
        setError(
          "An error occurred with the authentication service. Please try again later.",
        );
      } else {
        console.error("Unexpected Error:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <nav className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
        <div className="container mx-auto text-white">Loading...</div>
      </nav>
    );
  }

  return (
    <nav className="bg-linear-to-r from-blue-600 to-purple-600 p-4 shadow-md z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-2xl font-bold">
          Drone Pilot Quiz
        </Link>
        <div className="hidden md:flex space-x-4 items-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white hover:text-gray-200 transition-colors duration-200 ease-in-out"
            >
              {link.label}
            </Link>
          ))}
          {!isLoggedIn && (
            <Link
              href="/register"
              className="text-white bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Register
            </Link>
          )}
          <button
            onClick={handleAuthClick}
            className="text-blue-600 bg-white hover:bg-gray-100 px-4 py-2 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg"
          >
            {isLoggedIn ? "Logout" : "Login"}
          </button>
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            className="text-white focus:outline-hidden"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden mt-4 bg-white rounded-lg shadow-lg overflow-hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-gray-800 py-2 px-4 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
            >
              {link.label}
            </Link>
          ))}
          {!isLoggedIn && (
            <Link
              href="/register"
              className="block text-center text-white bg-green-500 hover:bg-green-600 py-2 px-4 transition-colors duration-300"
            >
              Register
            </Link>
          )}
          <button
            onClick={handleAuthClick}
            className="w-full text-center text-blue-600 bg-gray-100 hover:bg-gray-200 py-2 px-4 transition-colors duration-300"
          >
            {isLoggedIn ? "Logout" : "Login"}
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-500 text-white p-2 text-center mt-4 rounded-lg">
          {error}
        </div>
      )}
    </nav>
  );
}

// src/components/Navbar.tsx

"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useAuth } from "@/contexts/AuthContext";
import { MANAGEMENT_ROLES } from "@/types";
import { Alert, Navbar as DsNavbar, type NavLinkSpec } from "@/components/ds";

// Operational vocabulary from the design system: a quiz is a run, the admin
// area is Control, a user's page is their Record. The routes are unchanged.
// Only routes a signed-out visitor can actually use. /quiz serves an
// anonymous run and /leaderboard is public by design; /flash-cards still
// requires a token, so advertising it to someone signed out only produces a
// bounce to /login.
const PUBLIC_LINKS: NavLinkSpec[] = [
  { href: "/", label: "Overview" },
  { href: "/quiz", label: "Evaluation" },
  { href: "/trail", label: "Trail" },
  { href: "/study-materials", label: "Study Materials" },
  { href: "/leaderboard", label: "Standings" },
];

export default function Navbar() {
  const [error, setError] = useState<string | null>(null);
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Derived from context rather than mirrored into state — a second copy only
  // ever drifts.
  const isLoggedIn = !!user;
  const canAccessManagement = !!user && MANAGEMENT_ROLES.includes(user.role);

  const links = useMemo(
    () => [
      ...PUBLIC_LINKS,
      ...(isLoggedIn
        ? [
            { href: "/flash-cards", label: "Flash Cards" },
            ...(canAccessManagement
              ? [{ href: "/management", label: "Control" }]
              : []),
            { href: "/profile", label: "Record" },
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
      <nav className="sticky top-0 z-30 border-b border-line-hairline bg-ink-900">
        <div className="mx-auto flex h-16 max-w-shell items-center px-8 label-mono text-mute-500">
          Loading
        </div>
      </nav>
    );
  }

  return (
    <DsNavbar
      links={links}
      activeHref={pathname}
      loggedIn={isLoggedIn}
      streakDays={user?.consecutiveLoginDays ?? 0}
      onAuthClick={handleAuthClick}
      banner={
        error ? (
          <Alert tone="abort" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null
      }
    />
  );
}

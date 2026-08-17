import type { Metadata } from "next";

/**
 * The page itself is a client component and cannot export metadata, so the
 * segment layout carries it. Without this every route inherited the root
 * title and appeared identically in search results.
 */
export const metadata: Metadata = {
  title: "Standings",
  description:
    "Top operators by score across the Part 107 question bank, all-time and by period.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Standings",
    description:
      "Top operators by score across the Part 107 question bank, all-time and by period.",
    url: "/leaderboard",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

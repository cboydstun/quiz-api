import type { Metadata } from "next";

/**
 * The page itself is a client component and cannot export metadata, so the
 * segment layout carries it. Without this every route inherited the root
 * title and appeared identically in search results.
 */
export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free account to record your Part 107 practice runs, track accuracy by domain, and appear in the standings.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Create Account",
    description:
      "Create a free account to record your Part 107 practice runs, track accuracy by domain, and appear in the standings.",
    url: "/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

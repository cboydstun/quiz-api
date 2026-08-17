import type { Metadata } from "next";

/**
 * The page itself is a client component and cannot export metadata, so the
 * segment layout carries it. Without this every route inherited the root
 * title and appeared identically in search results.
 */
export const metadata: Metadata = {
  title: "Flash Cards",
  description:
    "Work through the Part 107 question bank as flash cards, filtered by knowledge area.",
  alternates: { canonical: "/flash-cards" },
  openGraph: {
    title: "Flash Cards",
    description:
      "Work through the Part 107 question bank as flash cards, filtered by knowledge area.",
    url: "/flash-cards",
  },
};

export default function FlashCardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

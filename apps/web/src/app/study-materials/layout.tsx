import type { Metadata } from "next";

/**
 * The page itself is a client component and cannot export metadata, so the
 * segment layout carries it. Without this every route inherited the root
 * title and appeared identically in search results.
 */
export const metadata: Metadata = {
  title: "Part 107 Study Materials",
  description:
    "The FAA remote pilot study guide and the twelve airman certification knowledge areas the Part 107 exam covers.",
  alternates: { canonical: "/study-materials" },
  openGraph: {
    title: "Part 107 Study Materials",
    description:
      "The FAA remote pilot study guide and the twelve airman certification knowledge areas the Part 107 exam covers.",
    url: "/study-materials",
  },
};

export default function StudyMaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

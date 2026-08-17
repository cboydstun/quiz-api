import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ds";

/**
 * The page itself is a client component and cannot export metadata, so the
 * segment layout carries it. Without this every route inherited the root
 * title and appeared identically in search results.
 */
export const metadata: Metadata = {
  title: "Part 107 Practice Test",
  description:
    "Take a free Part 107 practice test. Ten timed questions drawn at random from the full bank, graded instantly with every answer explained. No account required.",
  alternates: { canonical: "/quiz" },
  openGraph: {
    title: "Part 107 Practice Test",
    description:
      "Take a free Part 107 practice test. Ten timed questions drawn at random from the full bank, graded instantly with every answer explained. No account required.",
    url: "/quiz",
  },
};

/**
 * The Suspense boundary is required, not decorative: the page reads
 * `useSearchParams()` for the ?domain= filter, and a client component that
 * does so has to sit under one or the route cannot be prerendered at all.
 */
export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Spinner label="Loading bank" />}>{children}</Suspense>
  );
}

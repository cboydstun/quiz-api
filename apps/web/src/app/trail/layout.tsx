import type { Metadata } from "next";

const DESCRIPTION =
  "One trail a day, the same eight legs for every operator. Real Part 107 questions gate each crossing; a wrong answer costs battery, and a wrong answer over a hazard costs airframe. Run out of either and the run ends where it ended.";

/**
 * The page is a client component and cannot export metadata, so the segment
 * layout carries it — the same arrangement every other route here uses.
 */
export const metadata: Metadata = {
  title: "The Trail — Daily Part 107 Run",
  description: DESCRIPTION,
  alternates: { canonical: "/trail" },
  openGraph: {
    title: "The Trail — Daily Part 107 Run",
    description: DESCRIPTION,
    url: "/trail",
  },
};

export default function TrailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import Link from "next/link";
import { Label, Rule } from "@/components/ds";
import { countQuestions, listDomains } from "@/lib/server/bank";
import { domainSlug } from "@/lib/site";

/**
 * The index of the study pages, and the only route that links to all of them.
 *
 * Server-rendered on purpose. Every other content surface in this app is a
 * client component that fetches through Apollo, which means a crawler receives
 * an empty shell — 196 questions, their answers and their explanations existed
 * in the database and appeared in no HTML anywhere.
 *
 * Rendered per request rather than prerendered at build: the content comes
 * from the database, and a build has no guaranteed
 * connection to it — Vercel builds and migrations are deliberately separate
 * steps here. Prerendering would bake whatever the build could reach, which on
 * a bad day is nothing, and serve it until the next deploy. The reads behind
 * this page are timeout-bounded and memoised for a minute, so per-request
 * rendering costs at most one query a minute per instance.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Part 107 Practice Questions by Knowledge Area",
  description:
    "Free Part 107 practice questions grouped by the twelve FAA knowledge " +
    "areas — regulations, airspace, weather, loading and performance, and " +
    "the rest. Every question with its answer and an explanation.",
  alternates: { canonical: "/practice" },
  openGraph: {
    title: "Part 107 Practice Questions by Knowledge Area",
    description:
      "Free Part 107 practice questions grouped by the twelve FAA knowledge " +
      "areas, each with its answer explained.",
    url: "/practice",
  },
};

export default async function PracticeIndexPage() {
  const domains = await listDomains();
  const counts = await Promise.all(
    domains.map((domain) => countQuestions(domain)),
  );

  return (
    <div className="mx-auto max-w-wide px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Practice Questions
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        Part 107 practice questions by knowledge area
      </h1>
      <p className="m-0 mb-10 max-w-[68ch] text-sm leading-normal text-mute-400">
        The FAA remote pilot knowledge test draws from twelve subject areas.
        Each page below lists real practice questions from that area with the
        correct answer and an explanation, and links into a timed run on the
        same material.
      </p>

      {domains.length === 0 ? (
        <p className="m-0 text-sm text-mute-500">
          No questions have been classified yet.
        </p>
      ) : (
        <>
          <Rule label="Knowledge Areas" className="mb-8" />
          <div className="grid gap-px border border-line-hairline bg-line-hairline sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain, i) => (
              <Link
                key={domain}
                href={`/practice/${domainSlug(domain)}`}
                className="group bg-ink-800 p-6 transition-fast hover:bg-ink-700 focus-signal"
              >
                <span className="font-mono text-3xs tracking-mono text-signal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="m-0 mt-3 mb-2 text-md font-medium tracking-tight text-bone-100">
                  {domain}
                </h2>
                <p className="m-0 text-sm text-mute-500">
                  {counts[i]} {counts[i] === 1 ? "question" : "questions"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

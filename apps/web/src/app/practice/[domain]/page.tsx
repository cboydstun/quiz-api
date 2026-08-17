import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, Label, Rule, Status } from "@/components/ds";
import { listDomains, listPublishedQuestions } from "@/lib/server/bank";
import { domainSlug, SITE_NAME, siteOrigin } from "@/lib/site";

/**
 * One page per FAA knowledge area, server-rendered with the questions, their
 * answers and their explanations in the HTML.
 *
 * This is the piece of the site that can actually rank. Everything else is a
 * client component behind Apollo, so a crawler sees an empty shell; the bank
 * was the most valuable long-tail content in the product and none of it was
 * readable without an account.
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

/** How many questions each page publishes. */
const PAGE_SIZE = 25;

async function resolveDomain(slug: string): Promise<string | null> {
  const domains = await listDomains();
  return domains.find((domain) => domainSlug(domain) === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain: slug } = await params;
  const domain = await resolveDomain(slug);
  if (!domain) return {};

  const title = `${domain} — Part 107 Practice Questions`;
  const description =
    `Part 107 practice questions on ${domain.toLowerCase()} for the FAA ` +
    `remote pilot knowledge test, each with the correct answer and an ` +
    `explanation.`;

  return {
    title,
    description,
    alternates: { canonical: `/practice/${slug}` },
    openGraph: {
      title,
      description,
      url: `/practice/${slug}`,
      type: "article",
    },
  };
}

export default async function PracticeDomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: slug } = await params;
  const domain = await resolveDomain(slug);
  if (!domain) notFound();

  const questions = await listPublishedQuestions(domain, PAGE_SIZE);
  const runHref = `/quiz?domain=${encodeURIComponent(domain)}`;

  /**
   * Structured data. A page of questions and answers is exactly what the
   * schema.org Quiz/Question types describe, and search engines render it as
   * an expandable result — which is worth more than the ranking alone.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: `${domain} — Part 107 Practice Questions`,
    educationalLevel: "Professional certification",
    about: {
      "@type": "Thing",
      name: `FAA Part 107 ${domain}`,
    },
    publisher: { "@type": "Organization", name: SITE_NAME },
    url: `${siteOrigin()}/practice/${slug}`,
    hasPart: questions.map((question) => ({
      "@type": "Question",
      eduQuestionType: "Multiple choice",
      name: question.questionText,
      acceptedAnswer: {
        "@type": "Answer",
        text: question.correctAnswer,
        ...(question.explanation
          ? { comment: { "@type": "Comment", text: question.explanation } }
          : {}),
      },
      suggestedAnswer: question.answers
        .filter((answer) => answer !== question.correctAnswer)
        .map((answer) => ({ "@type": "Answer", text: answer })),
    })),
  };

  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <script
        type="application/ld+json"
        // The payload is our own data, not user input, and JSON.stringify of a
        // plain object cannot produce a closing script tag here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Label tag="///" className="mb-6">
        Practice · {domain}
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        {domain} — Part 107 practice questions
      </h1>
      <p className="m-0 mb-8 max-w-[68ch] text-sm leading-normal text-mute-400">
        {questions.length} practice{" "}
        {questions.length === 1 ? "question" : "questions"} on{" "}
        {domain.toLowerCase()} from the FAA remote pilot knowledge test, each
        with the correct answer and why it is correct.
      </p>

      <div className="mb-12 flex flex-wrap gap-2">
        <Link
          href={runHref}
          className={buttonClass({ variant: "signal", size: "md" })}
        >
          Take a timed run on {domain}
        </Link>
        <Link
          href="/practice"
          className={buttonClass({ variant: "outline", size: "md" })}
        >
          All knowledge areas
        </Link>
      </div>

      {questions.length === 0 ? (
        <p className="m-0 text-sm text-mute-500">
          No questions have been published for this area yet.
        </p>
      ) : (
        <>
          <Rule label="Questions" className="mb-8" />
          <ol className="m-0 flex list-none flex-col gap-px bg-line-hairline p-0">
            {questions.map((question, i) => (
              <li key={question.id} className="bg-ink-800 p-5 sm:p-6">
                <div className="mb-4 flex gap-4">
                  <span className="font-mono text-3xs tracking-mono text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="m-0 text-md leading-normal font-medium text-bone-100">
                    {question.questionText}
                  </h2>
                </div>

                <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0 sm:pl-9">
                  {question.answers.map((answer) => {
                    const correct = answer === question.correctAnswer;
                    return (
                      <li
                        key={answer}
                        className={`flex items-start gap-3 border-l-2 py-1.5 pl-3 text-sm ${
                          correct
                            ? "border-l-go text-bone-100"
                            : "border-l-line-hairline text-mute-500"
                        }`}
                      >
                        <span className="grow">{answer}</span>
                        {correct && <Status tone="go">Correct</Status>}
                      </li>
                    );
                  })}
                </ul>

                {question.explanation && (
                  <div className="border-t border-line-hairline pt-4 sm:pl-9">
                    <Label className="mb-2">Why</Label>
                    <p className="m-0 max-w-[68ch] text-sm leading-normal text-mute-400">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-12 border border-line-hairline bg-ink-800 p-6 sm:p-8">
            <h2 className="m-0 mb-3 text-xl font-medium tracking-tight text-bone-100">
              Ready to be timed on it?
            </h2>
            <p className="m-0 mb-5 max-w-[56ch] text-sm leading-normal text-mute-400">
              Reading the answers is the easy half. A run draws questions at
              random and holds you to a clock, which is the part the real test
              measures.
            </p>
            <Link
              href={runHref}
              className={buttonClass({ variant: "signal", size: "lg" })}
            >
              Start a {domain} run
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

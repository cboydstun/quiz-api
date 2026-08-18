import Link from "next/link";
import { TRAIL_LEGS } from "@quiz/graphql";
import { buttonClass, Label, Readout, Rule } from "@/components/ds";
import { countQuestions, listDomains } from "@/lib/server/bank";
import { countUsers } from "@/lib/server/users";
import { domainSlug, SITE_NAME, siteOrigin } from "@/lib/site";

/**
 * The figures below are read from the database rather than typed in. The
 * previous version hardcoded a bank size that its own comment admitted would
 * drift, plus a 98% pass rate and 10,000+ operators that nothing measured —
 * the app collects no pass data at all, so that one could not be made true.
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

/** Below this, the operator count argues against signing up rather than for it. */
const MIN_OPERATORS_TO_SHOW = 250;

const CAPABILITIES = [
  {
    code: "01",
    title: "Current question bank",
    body: "Every item is mapped to the live Part 107 airman certification standards and revised when the standards change.",
  },
  {
    code: "02",
    title: "Timed evaluation runs",
    body: "Medium and hard runs hold you to a per-question clock, so the pace you train at is the pace you sit at.",
  },
  {
    code: "03",
    title: "Answers explained",
    body: "Every run ends with what the right answer was and why, and offers to re-run just the ones you missed.",
  },
];

export default async function Home() {
  const [domains, bankSize, operators] = await Promise.all([
    listDomains(),
    countQuestions(),
    countUsers(),
  ]);

  /**
   * Structured data for the site itself. The search box action is what
   * produces a sitelinks search box, and the Organization block is what lets
   * a search engine attribute the practice pages to something.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteOrigin(),
    description:
      "Free Part 107 practice tests for the FAA remote pilot certificate.",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="grid-overlay relative border-b border-line-hairline bg-ink-900">
        <div className="mx-auto max-w-shell px-4 pt-24 pb-20 sm:px-8 sm:pt-32 sm:pb-24">
          <Label tag="///" className="mb-8">
            Part 107 Remote Pilot &middot; Evaluation System
          </Label>
          {/*
            The headline carries the words somebody actually searches for.
            "Ace the test before becoming an ace pilot" contained none of
            "Part 107", "FAA", "practice test" or "drone".
          */}
          <h1 className="m-0 max-w-[20ch] text-4xl leading-tight font-semibold tracking-tight text-bone-100 md:text-5xl">
            Free Part 107 practice tests for the FAA drone licence.
          </h1>
          <p className="mt-8 max-w-[58ch] text-md leading-normal text-mute-400">
            A disciplined training environment for the FAA remote pilot
            certificate. Timed runs, an auditable question bank, every answer
            explained, and per-domain accuracy you can act on.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/quiz"
              className={buttonClass({ variant: "signal", size: "lg" })}
            >
              Begin Evaluation
            </Link>
            <Link
              href="/practice"
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              Browse Questions
            </Link>
          </div>
        </div>
        {/* The seam is the gutter: panels butt together on a 1px hairline. */}
        <div className="grid grid-cols-2 gap-px border-t border-line-hairline bg-line-hairline lg:grid-cols-4">
          <div className="bg-ink-900">
            <Readout label="Bank Size" value={bankSize} unit="items" />
          </div>
          <div className="bg-ink-900">
            <Readout label="Domains" value={domains.length} />
          </div>
          {/*
            The operator count is shown only once it is evidence of anything.
            "10,000+" was invented and had to go; rendering the true figure of
            2 is worse than saying nothing, because it is the one number on the
            page arguing against signing up. Below the threshold the slot shows
            what the run costs instead, which is the more persuasive fact.
          */}
          <div className="bg-ink-900">
            {operators >= MIN_OPERATORS_TO_SHOW ? (
              <Readout label="Operators" value={operators} />
            ) : (
              <Readout label="Price" value="Free" tone="go" />
            )}
          </div>
          <div className="bg-ink-900">
            <Readout label="Account Needed" value="No" tone="go" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-4 py-20 sm:px-8 sm:py-24">
        <Rule label="Capability" className="mb-10" />
        <div className="grid gap-px border border-line-hairline bg-line-hairline md:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.code} className="bg-ink-800 p-6 sm:p-8">
              <Label className="mb-6">{c.code}</Label>
              <h2 className="m-0 mb-4 text-xl font-medium tracking-tight text-bone-100">
                {c.title}
              </h2>
              <p className="m-0 text-sm leading-normal text-mute-500">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/*
        The trail is a different proposition from an evaluation run and is sold
        as one: same bank, one attempt, and it can be lost. It sits above the
        domain list because it is the only thing on the page that expires.
      */}
      <section className="mx-auto max-w-shell px-4 pb-20 sm:px-8 sm:pb-24">
        <Rule label="Daily" className="mb-8" />
        <div className="grid gap-px border border-line-hairline bg-line-hairline md:grid-cols-[2fr_1fr]">
          <div className="bg-ink-800 p-6 sm:p-8">
            <Label tag="///" className="mb-6">
              The Trail
            </Label>
            <h2 className="m-0 mb-4 max-w-[24ch] text-xl font-medium tracking-tight text-bone-100">
              One route a day. Eight legs. No second attempt.
            </h2>
            <p className="m-0 max-w-[60ch] text-sm leading-normal text-mute-500">
              Every operator flies the same route today. Each leg is a knowledge
              area dressed as terrain, and the questions are what get you across
              it. Miss too many and you go down where you went down.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-6 bg-ink-800 p-6 sm:p-8">
            {/* A thin bank flies a shorter trail; the number must not lie. */}
            <Readout
              label="Legs"
              value={Math.min(TRAIL_LEGS, domains.length)}
              tone="signal"
            />
            <Link
              href="/trail"
              className={buttonClass({ variant: "signal", size: "md" })}
            >
              Fly Today&apos;s Trail
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-4 pb-20 sm:px-8 sm:pb-24">
        <Rule label="Domains Covered" className="mb-8" />
        {/*
          Each domain links to its own study page. These were flat text, which
          meant the twelve subject names most likely to match a search were on
          the site but led nowhere.
        */}
        <div className="grid grid-cols-1 gap-px border border-line-hairline bg-line-hairline sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {domains.map((domain, i) => (
            <Link
              key={domain}
              href={`/practice/${domainSlug(domain)}`}
              className="flex items-baseline gap-4 bg-ink-800 p-5 transition-fast hover:bg-ink-700 focus-signal"
            >
              <span className="font-mono text-3xs tracking-mono text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm text-mute-400">{domain}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line-hairline bg-ink-800">
        <div className="mx-auto flex max-w-shell flex-wrap items-end justify-between gap-10 px-4 py-16 sm:px-8 sm:py-20">
          <div>
            <h2 className="m-0 max-w-[24ch] text-2xl font-medium tracking-tight text-bone-100">
              Start with a ten-item run. No account required.
            </h2>
            <p className="mt-4 text-sm text-mute-500">
              Scores are recorded once you sign in.
            </p>
          </div>
          <Link
            href="/quiz"
            className={buttonClass({ variant: "signal", size: "lg" })}
          >
            Begin Evaluation
          </Link>
        </div>
      </section>
    </div>
  );
}

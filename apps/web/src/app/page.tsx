import Link from "next/link";
import { buttonClass, Label, Readout, Rule } from "@/components/ds";

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
    title: "Adaptive sequencing",
    body: "Missed items resurface. The bank weights toward the areas where your accuracy is lowest.",
  },
];

const DOMAINS = [
  "Regulations",
  "Airspace classification",
  "Weather sources",
  "Loading and performance",
  "Emergency procedures",
  "Crew resource management",
  "Radio procedures",
  "Physiological effects",
  "Decision-making",
  "Airport operations",
  "Maintenance",
  "Night operations",
];

export default function Home() {
  return (
    <div>
      <section className="grid-overlay relative border-b border-line-hairline bg-ink-900">
        <div className="mx-auto max-w-shell px-8 pt-32 pb-24">
          <Label tag="///" className="mb-8">
            Part 107 Remote Pilot &middot; Evaluation System
          </Label>
          <h1 className="m-0 max-w-[18ch] text-4xl leading-tight font-semibold tracking-tight text-bone-100 md:text-5xl">
            Fly the checkride before the checkride
          </h1>
          <p className="mt-8 max-w-[58ch] text-md leading-normal text-mute-400">
            A disciplined training environment for the FAA remote pilot
            certificate. Timed runs, an auditable question bank, and per-domain
            accuracy you can act on.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/quiz"
              className={buttonClass({ variant: "signal", size: "lg" })}
            >
              Begin Evaluation
            </Link>
            <Link
              href="/study-materials"
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              Study Materials
            </Link>
          </div>
        </div>
        {/* The seam is the gutter: panels butt together on a 1px hairline. */}
        <div className="grid grid-cols-2 gap-px border-t border-line-hairline bg-line-hairline lg:grid-cols-4">
          <div className="bg-ink-900">
            <Readout label="Bank Size" value="1,000+" unit="items" />
          </div>
          <div className="bg-ink-900">
            <Readout label="Pass Rate" value="98" unit="%" tone="go" />
          </div>
          <div className="bg-ink-900">
            <Readout label="Operators" value="10,000+" />
          </div>
          <div className="bg-ink-900">
            <Readout label="Domains" value={String(DOMAINS.length)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-8 py-24">
        <Rule label="Capability" className="mb-10" />
        <div className="grid gap-px border border-line-hairline bg-line-hairline md:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.code} className="bg-ink-800 p-8">
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

      <section className="mx-auto max-w-shell px-8 pb-24">
        <Rule label="Domains Covered" className="mb-8" />
        <div className="grid grid-cols-2 gap-px border border-line-hairline bg-line-hairline md:grid-cols-3 lg:grid-cols-4">
          {DOMAINS.map((d, i) => (
            <div key={d} className="flex items-baseline gap-4 bg-ink-800 p-5">
              <span className="font-mono text-3xs tracking-mono text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm text-mute-400">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line-hairline bg-ink-800">
        <div className="mx-auto flex max-w-shell flex-wrap items-end justify-between gap-10 px-8 py-20">
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

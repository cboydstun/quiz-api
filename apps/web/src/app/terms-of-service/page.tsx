import type { Metadata } from "next";
import { Label, Rule } from "@/components/ds";

/**
 * The other footer link that has always 404'd.
 *
 * The disclaimer in section 01 is the part that matters: this is a study tool
 * built around a question bank mapped to the airman certification standards,
 * not an FAA product, and nothing here is an authorisation to fly.
 */
export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms this free Part 107 study tool is offered under, including what it is not.",
  alternates: { canonical: "/terms-of-service" },
};

const SECTIONS = [
  {
    code: "01",
    title: "What this is, and what it is not",
    body: [
      "Drone Pilot Quiz is an independent study tool for the FAA Part 107 remote pilot knowledge test. It is not affiliated with, endorsed by, or operated by the Federal Aviation Administration.",
      "The question bank is written against the airman certification standards and the FAA's own study guide. It is not the exam, it is not a copy of the exam, and a good score here is not a pass, a certificate, or an authorisation to fly anything.",
      "Regulations change. Always confirm anything operationally important against the current text of 14 CFR Part 107 and current FAA guidance before you rely on it.",
    ],
  },
  {
    code: "02",
    title: "Your account",
    body: [
      "You are responsible for what happens under your account and for keeping your password to yourself. Tell us if you think someone else has it.",
      "One account per person. Accounts exist to record your own practice; do not share one.",
      "We may suspend or remove an account that is being used to attack the service, to scrape the question bank wholesale, or to manipulate the leaderboard.",
    ],
  },
  {
    code: "03",
    title: "Acceptable use",
    body: [
      "Practise as much as you like. Automated bulk extraction of the question bank, attempts to inflate a score by any means other than answering questions, and attempts to interfere with the service for other people are not acceptable use.",
      "Rate limits apply to sign-in, registration and answer submission. They are set well above what a person doing this by hand will ever reach.",
    ],
  },
  {
    code: "04",
    title: "Availability and liability",
    body: [
      "The service is provided as-is and free of charge. It may be unavailable, and content may be wrong or out of date.",
      "To the maximum extent the law allows, we are not liable for any loss arising from use of this site — including any decision made in reliance on a question, an answer, or an explanation published here.",
    ],
  },
  {
    code: "05",
    title: "Content",
    body: [
      "Questions, explanations and the interface belong to the operator of this site. The FAA study guide linked from the study materials page is a US government publication and is in the public domain.",
      "You may use the questions to study. You may not republish the bank as your own.",
    ],
  },
  {
    code: "06",
    title: "Changes",
    body: [
      "These terms may change as the service does. Continuing to use the site after a change means accepting it.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Legal
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        Terms of service
      </h1>
      <p className="m-0 mb-10 max-w-[68ch] text-sm leading-normal text-mute-400">
        Short version: this is a free study tool, it is not the FAA, and a good
        score here is practice rather than a licence.
      </p>

      <div className="flex flex-col gap-px bg-line-hairline">
        {SECTIONS.map((section) => (
          <section key={section.code} className="bg-ink-800 p-6 sm:p-8">
            <Label className="mb-4">
              {section.code} &middot; {section.title}
            </Label>
            <div className="flex flex-col gap-4">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="m-0 max-w-[68ch] text-sm leading-normal text-mute-400"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Rule className="my-10" />
      <p className="m-0 text-sm text-mute-500">
        See also the{" "}
        <a
          href="/privacy-policy"
          className="text-signal underline underline-offset-4"
        >
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { Label, Rule } from "@/components/ds";

/**
 * The footer has linked here since before the redesign and it has always been
 * a 404. It is also not optional: the Google Analytics terms require a privacy
 * policy that discloses the use of cookies and analytics, and this site runs
 * both GA and Vercel Analytics.
 *
 * Written from what the code actually does — the account fields in
 * packages/db/src/schema.ts, the token in localStorage, and the two analytics
 * scripts in layout.tsx. If any of those change, this has to change with them.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Drone Pilot Quiz collects, why, and how to have it deleted.",
  alternates: { canonical: "/privacy-policy" },
};

const SECTIONS = [
  {
    code: "01",
    title: "What is collected",
    body: [
      "If you create an account: your email address, the username you choose, and a bcrypt hash of your password. If you sign in with Google, we receive your email address, your name, and your Google account identifier instead — we never see your Google password.",
      "As you use the site: which questions you answered, what you selected, whether it was correct, and when. These are what produce your score, your accuracy by domain, and your streak.",
      "Analytics: Google Analytics and Vercel Analytics record page views and a small number of product events (starting a run, completing a run, signing up, signing in). These carry no question content and no personal identifiers beyond what those services collect by default.",
    ],
  },
  {
    code: "02",
    title: "What is not collected",
    body: [
      "No payment details — the site is free and takes no payments.",
      "No advertising or cross-site tracking identifiers, and nothing is sold or shared with data brokers.",
      "Nothing at all if you use the site signed out, beyond the analytics above. An anonymous practice run is graded and discarded; it is never written to the database.",
    ],
  },
  {
    code: "03",
    title: "How it is stored",
    body: [
      "Account data and answer history live in a Postgres database hosted by Neon. The site itself runs on Vercel.",
      "Your session is a signed token held in your browser's local storage. There is no session cookie. Signing out removes the token from your browser.",
      "Passwords are stored only as bcrypt hashes and cannot be read back, by us or by anyone else with access to the database.",
    ],
  },
  {
    code: "04",
    title: "Who else sees it",
    body: [
      "Google (Analytics and, if you use it, sign-in), Vercel (hosting and analytics), and Neon (database) process data on our behalf. Nobody else.",
      "The leaderboard is public. It shows your username, your score, and your email address with most of it masked (for example a***a@example.com). If you signed up through Google and never chose a username, you appear as an operator number instead — your email is never used as a display name.",
    ],
  },
  {
    code: "05",
    title: "Removing your data",
    body: [
      "Ask and your account and its entire answer history will be deleted. Deletion cascades: no orphaned responses are kept.",
      "You can change your username or password from your operator record at any time.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Legal
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        Privacy policy
      </h1>
      <p className="m-0 mb-10 max-w-[68ch] text-sm leading-normal text-mute-400">
        This site is a free study tool for the FAA Part 107 remote pilot
        certificate. It collects what it needs to score your practice and
        nothing beyond that.
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
        Questions about any of this, or a deletion request, can be sent to the
        address on the repository this site is built from.
      </p>
    </div>
  );
}

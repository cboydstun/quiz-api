import Link from "next/link";

export interface FooterColumn {
  title: string;
  links: Array<{ href: string; label: string }>;
}

export interface FooterProps {
  columns?: FooterColumn[];
  year?: number;
  /** The standing disclaimer. Keep it — the product is not an FAA service. */
  note?: string;
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Program",
    links: [
      { href: "/", label: "Overview" },
      { href: "/quiz", label: "Evaluation" },
      { href: "/flash-cards", label: "Flash Cards" },
      { href: "/study-materials", label: "Study Materials" },
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/study-materials", label: "FAA Part 107" },
      { href: "/leaderboard", label: "Standings" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
    ],
  },
];

export function Footer({
  columns = COLUMNS,
  year = new Date().getFullYear(),
  note = "Independent study tool. Not affiliated with the Federal Aviation Administration.",
}: FooterProps) {
  return (
    <footer className="border-t border-line-hairline bg-ink-900 font-display">
      <div className="mx-auto max-w-shell px-4 sm:px-8 pt-16 pb-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-block size-2 bg-signal" />
              <span className="text-sm font-semibold uppercase tracking-label text-bone-100">
                Drone Pilot Quiz
              </span>
            </div>
            <p className="max-w-[34ch] text-sm leading-normal text-mute-500">
              {note}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-4 label-mono text-mute-500">{col.title}</div>
              <ul className="flex list-none flex-col gap-3 p-0">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-mute-400 transition-fast hover:text-signal"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex justify-between border-t border-line-hairline pt-4 font-mono text-3xs uppercase tracking-label text-mute-500">
          <span>&copy; {year} Drone Pilot Quiz</span>
          <span>Part 107 &middot; Remote Pilot</span>
        </div>
      </div>
    </footer>
  );
}

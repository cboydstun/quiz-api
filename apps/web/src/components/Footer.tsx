import { Footer as DsFooter, type FooterColumn } from "@/components/ds";

// Every link here resolves. The two legal pages used to 404 — they had been
// linked from the footer since before the redesign with nothing behind them,
// which is also a problem for the Google Analytics terms.
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
      { href: "/practice", label: "Practice Questions" },
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

export default function Footer() {
  return <DsFooter columns={COLUMNS} />;
}

import { Footer as DsFooter, type FooterColumn } from "@/components/ds";

// Only the columns the app actually has routes for, plus the two legal pages
// the previous footer linked to. Those two still have no route — they 404
// today exactly as they did before the redesign.
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

export default function Footer() {
  return <DsFooter columns={COLUMNS} />;
}

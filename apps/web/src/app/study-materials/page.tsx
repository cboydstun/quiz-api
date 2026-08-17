import { buttonClass, Label, Panel } from "@/components/ds";

const PDF_URL =
  "https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/remote_pilot_study_guide.pdf";

// The twelve airman-certification topics, grouped the way the study guide
// itself is organised. These are reference copy, not data — the question
// bank's own domains come from the `domain` column.
const SECTIONS = [
  {
    code: "01",
    title: "Applicable regulations",
    items: [
      "Operating rules · 14 CFR 107",
      "Certification and waivers",
      "Remote pilot responsibilities",
    ],
  },
  {
    code: "02",
    title: "Airspace and requirements",
    items: [
      "Airspace classification and operating requirements",
      "Special use airspace",
      "Authorization via LAANC",
      "Airport operations",
    ],
  },
  {
    code: "03",
    title: "Weather and performance",
    items: [
      "Aviation weather sources",
      "Effects of weather on small unmanned aircraft performance",
      "Loading and centre of gravity",
      "Determining aircraft performance",
    ],
  },
  {
    code: "04",
    title: "Operations",
    items: [
      "Emergency procedures",
      "Crew resource management",
      "Radio communication procedures",
      "Physiological effects of drugs and alcohol",
      "Aeronautical decision-making and judgment",
      "Maintenance and preflight inspection procedures",
    ],
  },
];

export default function StudyMaterialsPage() {
  return (
    <div className="mx-auto max-w-mid px-8 py-16">
      <Label tag="///" className="mb-6">
        Reference
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        FAA remote pilot study guide
      </h1>
      <p className="m-0 mb-8 max-w-[64ch] text-sm leading-normal text-mute-500">
        Published by the Federal Aviation Administration. This is the primary
        source document for the airman knowledge test; the question bank is
        mapped to its sections.
      </p>

      <div className="mb-10 flex flex-wrap gap-2">
        <a
          href={PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: "signal", size: "md" })}
        >
          Download PDF
        </a>
        <a
          href={PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: "ghost", size: "md" })}
        >
          Open in Browser
        </a>
      </div>

      <div className="mb-8 grid gap-px border border-line-hairline bg-line-hairline md:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.code} className="bg-ink-800 p-5">
            <Label className="mb-4">
              {section.code} &middot; {section.title}
            </Label>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="border-l border-line-hairline pl-4 text-sm text-mute-400"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Panel label="Study Guide Preview" meta="PDF" padding="none">
        <div className="aspect-video">
          <iframe
            src={PDF_URL}
            className="h-full w-full"
            title="FAA Remote Pilot Study Guide PDF"
          />
        </div>
      </Panel>
    </div>
  );
}

import { ImageResponse } from "next/og";

/**
 * The card a shared link unfurls into. There was none, so every post of this
 * site — including the Reddit thread the traffic comes from — rendered as a
 * bare domain and a title.
 *
 * Written in the design system's language: near-black housing, hairline rules,
 * no radius, one orange accent. Plain system type rather than Archivo, because
 * loading a font file here costs a fetch on every card render for a difference
 * nobody sees at 1200×630.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Drone Pilot Quiz — Part 107 practice tests";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0b",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 16, height: 16, background: "#ff5c1a" }} />
        <div
          style={{
            color: "#e8e6e3",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Drone Pilot Quiz
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            color: "#ff5c1a",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {"/// Part 107 Remote Pilot"}
        </div>
        <div
          style={{
            color: "#e8e6e3",
            fontSize: 76,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Free Part 107 practice tests
        </div>
        <div style={{ color: "#8a8a8f", fontSize: 30, maxWidth: 880 }}>
          Timed runs across all 12 knowledge areas. Every answer explained. No
          account needed to start.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 48,
          borderTop: "1px solid #26262a",
          paddingTop: 28,
          color: "#8a8a8f",
          fontSize: 24,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        <div>12 Domains</div>
        <div>Timed Runs</div>
        <div>Answers Explained</div>
      </div>
    </div>,
    size,
  );
}

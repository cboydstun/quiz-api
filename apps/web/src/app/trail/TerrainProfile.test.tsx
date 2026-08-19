import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerrainProfile } from "./TerrainProfile";
import { buildSilhouette } from "./terrain";

describe("TerrainProfile", () => {
  it("names the terrain for anyone who cannot see it", () => {
    render(<TerrainProfile terrain="ICING LAYER" />);
    expect(
      screen.getByRole("img", { name: /ICING LAYER/ }),
    ).toBeInTheDocument();
  });

  it("draws the silhouette terrain.ts generated", () => {
    const { container } = render(<TerrainProfile terrain="THE CLIMB" />);
    const { ground } = buildSilhouette("THE CLIMB");

    const paths = Array.from(container.querySelectorAll("path")).map((p) =>
      p.getAttribute("d"),
    );
    expect(paths).toContain(ground);
  });

  // The whole point: the aircraft follows the ground rather than crossing a
  // flat line laid over it.
  it("flies the aircraft along that same ground line", () => {
    const { container } = render(<TerrainProfile terrain="THE CLIMB" />);
    const { ground } = buildSilhouette("THE CLIMB");

    const track = container.querySelector<HTMLElement>(".drone-track");
    expect(track?.style.offsetPath).toContain(ground);
  });

  it("marks the ground abort on a hazard leg", () => {
    const { container: calm } = render(<TerrainProfile terrain="LAST LIGHT" />);
    const { container: bad } = render(<TerrainProfile terrain="MAYDAY" hazard />);

    const strokeOf = (c: HTMLElement) =>
      c.querySelectorAll("path")[1]?.getAttribute("stroke");

    expect(strokeOf(bad)).toContain("abort");
    expect(strokeOf(calm)).not.toContain("abort");
  });

  it("keeps the aircraft out of the accessibility tree", () => {
    const { container } = render(<TerrainProfile terrain="THE SHELF" />);
    expect(container.querySelector(".drone-track")).toHaveAttribute(
      "aria-hidden",
    );
  });
});

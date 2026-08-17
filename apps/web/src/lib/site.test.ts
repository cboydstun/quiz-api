import { afterEach, describe, expect, it, vi } from "vitest";
import { domainSlug, siteOrigin } from "./site";

describe("domainSlug", () => {
  it("turns a domain name into a URL segment", () => {
    expect(domainSlug("Airspace classification")).toBe(
      "airspace-classification",
    );
    expect(domainSlug("Loading and performance")).toBe(
      "loading-and-performance",
    );
  });

  it("collapses punctuation rather than emitting it", () => {
    expect(domainSlug("Crew resource management (CRM)")).toBe(
      "crew-resource-management-crm",
    );
  });

  it("leaves no leading or trailing separator", () => {
    expect(domainSlug(" Weather sources ")).toBe("weather-sources");
  });
});

describe("siteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the explicit origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    // The trailing slash has to go, or every canonical URL gets a double one.
    expect(siteOrigin()).toBe("https://example.com");
  });

  /**
   * Vercel sets this without a scheme. An Open Graph image URL missing its
   * scheme is one a crawler cannot fetch, which is a card that does not render.
   */
  it("adds the scheme Vercel omits", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "quiz.vercel.app");
    expect(siteOrigin()).toBe("https://quiz.vercel.app");
  });

  it("falls back to localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteOrigin()).toBe("http://localhost:3000");
  });
});

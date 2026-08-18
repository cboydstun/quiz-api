import { describe, expect, it, vi, beforeEach } from "vitest";

const listDomains = vi.fn();
vi.mock("@/lib/server/bank", () => ({ listDomains: () => listDomains() }));

vi.mock("@/lib/site", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/site")>();
  return { ...actual, siteOrigin: () => "https://example.test" };
});

import robots from "./robots";
import sitemap from "./sitemap";

/**
 * Neither file had a test. A regression that indexed /management, or dropped
 * the study pages out of the sitemap, would have shipped in silence — and the
 * whole point of the practice pages is that a crawler can find them.
 */
describe("robots.txt", () => {
  it("keeps signed-in surfaces and the API out of the index", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? [] : (rules.disallow as string[]);

    expect(disallow).toContain("/management");
    expect(disallow).toContain("/profile");
    expect(disallow).toContain("/v1/graphql");
  });

  it("leaves the public content crawlable", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? [] : (rules.disallow as string[]);

    // These are the routes that exist to be found.
    for (const route of ["/", "/quiz", "/practice", "/study-materials"]) {
      expect(disallow).not.toContain(route);
    }
  });

  it("points at an absolute sitemap URL", () => {
    expect(robots().sitemap).toBe("https://example.test/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDomains.mockResolvedValue(["Regulations", "Airspace classification"]);
  });

  it("lists a page per knowledge area, slugged", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://example.test/practice/regulations");
    expect(urls).toContain(
      "https://example.test/practice/airspace-classification",
    );
  });

  it("includes the routes an anonymous visitor can actually use", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    for (const route of ["/", "/quiz", "/practice", "/leaderboard"]) {
      expect(urls).toContain(`https://example.test${route}`);
    }
  });

  /**
   * A sitemap that advertises a page a crawler is told not to fetch is a
   * contradiction, and Search Console reports it as one.
   */
  it("never lists a route that robots.txt disallows", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? [] : (rules.disallow as string[]);

    for (const blocked of disallow) {
      expect(urls).not.toContain(`https://example.test${blocked}`);
    }
  });

  it("degrades to the static routes when the bank cannot be read", async () => {
    listDomains.mockResolvedValue([]);

    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("https://example.test/");
    expect(urls.some((url) => url.includes("/practice/"))).toBe(false);
  });
});

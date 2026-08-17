import type { MetadataRoute } from "next";
import { listDomains } from "@/lib/server/bank";
import { domainSlug, siteOrigin } from "@/lib/site";

/**
 * There was no sitemap, so the only two indexable routes had to be discovered
 * by chance and the study pages would not have been discovered at all.
 *
 * Signed-in routes are left out deliberately: /quiz is here because an
 * anonymous visitor can now play a run on it, but /profile and /management
 * render nothing for a crawler and /login is not a destination.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const domains = await listDomains();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/quiz`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/practice`, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${origin}/study-materials`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${origin}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
    { url: `${origin}/register`, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${origin}/privacy-policy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${origin}/terms-of-service`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  return [
    ...staticRoutes,
    ...domains.map((domain) => ({
      url: `${origin}/practice/${domainSlug(domain)}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

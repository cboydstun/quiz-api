import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

/**
 * There was no robots.txt at all, so nothing pointed a crawler at a sitemap
 * and nothing told it which routes are not worth its time.
 *
 * The disallowed paths are all either signed-in surfaces or the API: none of
 * them render anything an anonymous crawler can read, and /management should
 * not be in an index under any circumstances.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/management", "/profile", "/v1/graphql", "/login"],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}

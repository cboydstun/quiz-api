/**
 * Facts about the site that metadata, the sitemap and the structured data all
 * have to agree on.
 *
 * The origin has to be absolute for Open Graph: a relative image URL in an og
 * tag resolves against nothing on the crawler's side, which is how a shared
 * link ends up with no card at all. NEXT_PUBLIC_SITE_URL is the override;
 * VERCEL_PROJECT_PRODUCTION_URL is what Vercel sets for the production domain,
 * and it arrives without a scheme.
 */
export const SITE_NAME = "Drone Pilot Quiz";

export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/** Turns "Airspace classification" into "airspace-classification". */
export function domainSlug(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

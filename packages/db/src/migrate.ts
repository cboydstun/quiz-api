import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { fileURLToPath } from "node:url";

/**
 * Applies pending migrations to whatever DATABASE_URL points at. Run manually
 * per environment (`pnpm db:migrate`) rather than from the Vercel build, so a
 * bad migration cannot take a deployment down with it.
 *
 * Note: the neon-http driver has no transactions, so migrations apply
 * statement-by-statement. Keep each migration independently safe to re-run.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = drizzle(neon(url));
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });

  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

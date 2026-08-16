import { eq, or } from "drizzle-orm";
import { users, type Database, type UserRow } from "@quiz/db";

/** The column is nullable; the API field is not. */
export function displayName(user: UserRow): string {
  return user.username ?? user.email.split("@")[0] ?? user.email;
}

export function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Google hands us a display name that is not guaranteed unique, but the column
 * is. Walk suffixes until one is free rather than failing the sign-in.
 */
export async function uniqueUsername(
  db: Database,
  preferred: string,
): Promise<string> {
  const base = preferred.trim() || "user";

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}${suffix}`;
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);

    if (!taken) return candidate;
  }

  throw new Error(`Could not derive a free username from "${base}"`);
}

export async function findUserByEmailOrUsername(
  db: Database,
  email: string,
  username: string,
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);

  return existing ?? null;
}

export async function findUserById(db: Database, id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

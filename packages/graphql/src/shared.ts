import { eq, or } from "drizzle-orm";
import { users, type Database, type UserRow } from "@quiz/db";

/**
 * What a user is called before they have chosen anything. Derived from the id,
 * which is a random v4 uuid: it encodes nothing, it is already public wherever
 * the name is, and it does not move when the user's rank or the board's period
 * changes. Four hex characters can collide, which costs two unnamed users a
 * shared appearance and nothing else.
 */
export function standInName(id: string): string {
  return `Operator ${id.slice(0, 4).toUpperCase()}`;
}

/**
 * The column is nullable; the API field is not.
 *
 * Deliberately not the email's local part. `username` is published to people
 * other than its owner — the leaderboard is public, and `Question.createdBy`
 * shows an editor's name to every signed-in user — so falling back to the
 * address would hand out an address.
 */
export function displayName(user: UserRow): string {
  return user.username ?? standInName(user.id);
}

export function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
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

import bcrypt from "bcryptjs";

// Matches the cost factor the previous backend used, so hashes imported from
// MongoDB verify without a rehash.
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  // Google-only accounts have no password; they can never match one.
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

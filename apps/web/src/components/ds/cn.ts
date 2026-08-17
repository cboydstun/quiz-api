/**
 * Join class names, dropping anything falsy. Deliberately not `clsx` — the
 * design system never needs conditional-object syntax or Tailwind merging,
 * because variants are looked up from a Record rather than layered.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The backend returns timestamps as epoch-millisecond strings, so the raw value
 * has to be parsed before Date can read it. Nulls and unparseable values are
 * common enough (unset lastLoginDate) that they get their own labels rather
 * than rendering "Invalid Date" to the user.
 */
export const formatDate = (
  timestamp: string | number | null | undefined,
): string => {
  if (!timestamp) return "N/A";
  const date = new Date(
    typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp,
  );

  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

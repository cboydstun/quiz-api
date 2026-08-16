import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("parses an epoch-millisecond string (the backend's wire format)", () => {
    // 2024-01-15T12:00:00Z
    expect(formatDate("1705320000000")).toMatch(/January 15, 2024/);
  });

  it("accepts a numeric timestamp", () => {
    expect(formatDate(1705320000000)).toMatch(/January 15, 2024/);
  });

  it("labels missing values rather than rendering Invalid Date", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
    expect(formatDate("")).toBe("N/A");
  });

  it("labels unparseable values", () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});

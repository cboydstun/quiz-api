import { describe, expect, it } from "vitest";
import { joinAnswers, splitAnswers } from "./questions";

describe("splitAnswers", () => {
  it("splits on comma regardless of surrounding whitespace", () => {
    expect(splitAnswers("a,b,c")).toEqual(["a", "b", "c"]);
    expect(splitAnswers("a, b,  c")).toEqual(["a", "b", "c"]);
  });

  it("drops empty segments from trailing or doubled commas", () => {
    expect(splitAnswers("a,,b,")).toEqual(["a", "b"]);
  });

  it("round-trips with joinAnswers", () => {
    const answers = ["Class B", "Class C", "Class D"];
    expect(splitAnswers(joinAnswers(answers))).toEqual(answers);
  });

  it("does not collapse comma-only-separated input (the old editor bug)", () => {
    // The inline editor used to split on the literal ", " and returned one item.
    expect(splitAnswers("a,b")).toHaveLength(2);
  });
});

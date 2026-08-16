/**
 * Answers are entered as a single comma-separated field in both the create form
 * and the inline table editor. Those two used to disagree — the create form
 * split on "," and trimmed, the editor split on the literal ", " — so editing a
 * question saved with "a,b" collapsed it to one answer. Both call this now.
 */
export const splitAnswers = (value: string): string[] =>
  value
    .split(",")
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);

export const joinAnswers = (answers: string[]): string => answers.join(", ");

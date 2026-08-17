import type { QuestionRow, UserRow } from "@quiz/db";

/**
 * What resolvers actually pass around. `creator` is populated by the list and
 * single-question queries via a join, so `Question.createdBy` almost never has
 * to issue its own query — that is the whole N+1 story at this scale, no
 * DataLoader required.
 */
export type QuestionModel = QuestionRow & {
  creator?: UserRow;
  /**
   * Set by the list query, so the `Question.correctAnswer` field resolver can
   * tell a bulk read from a single-question read. Flash cards legitimately
   * need the answer to one card; nothing legitimately needs the whole answer
   * key in one response unless it is an editor about to edit it.
   */
  fromBulkList?: boolean;
};
export type UserModel = UserRow;

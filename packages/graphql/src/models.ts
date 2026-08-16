import type { QuestionRow, UserRow } from "@quiz/db";

/**
 * What resolvers actually pass around. `creator` is populated by the list and
 * single-question queries via a join, so `Question.createdBy` almost never has
 * to issue its own query — that is the whole N+1 story at this scale, no
 * DataLoader required.
 */
export type QuestionModel = QuestionRow & { creator?: UserRow };
export type UserModel = UserRow;

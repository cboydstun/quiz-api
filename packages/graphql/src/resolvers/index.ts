import type { Resolvers } from "../generated/types";
import { authResolvers } from "./auth";
import { leaderboardResolvers } from "./leaderboard";
import { questionResolvers } from "./questions";
import { responseResolvers } from "./responses";
import { statsResolvers } from "./stats";
import { trailResolvers } from "./trail";
import { typeResolvers } from "./types";
import { userResolvers } from "./users";

const modules: Resolvers[] = [
  authResolvers,
  userResolvers,
  questionResolvers,
  responseResolvers,
  leaderboardResolvers,
  statsResolvers,
  trailResolvers,
  typeResolvers,
];

/**
 * Shallow-merges the per-domain maps. Each module owns a disjoint set of
 * fields, so a collision means two modules claim the same resolver — fail loud
 * rather than let one silently win.
 */
export const resolvers: Resolvers = modules.reduce<Resolvers>(
  (merged, module) => {
    for (const [typeName, fields] of Object.entries(module)) {
      const existing = (merged as Record<string, object>)[typeName] ?? {};

      for (const fieldName of Object.keys(fields as object)) {
        if (fieldName in existing) {
          throw new Error(`Duplicate resolver for ${typeName}.${fieldName}`);
        }
      }

      (merged as Record<string, object>)[typeName] = {
        ...existing,
        ...(fields as object),
      };
    }
    return merged;
  },
  {},
);

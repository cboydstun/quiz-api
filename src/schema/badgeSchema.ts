// src/schema/badgeSchema.ts

import { gql } from 'apollo-server-express';

const badgeSchema = gql`
  scalar Date

  type Badge {
    id: ID!
    name: String!
    description: String!
    imageUrl: String!
    earnedAt: Date
  }

  extend type Query {
    badges: [Badge!]!
    badge(id: ID!): Badge
  }

  extend type Mutation {
    createBadge(name: String!, description: String!, imageUrl: String!): Badge!
    issueBadgeToUser(badgeId: ID!, userId: ID!): User!
  }
`;

export default badgeSchema;

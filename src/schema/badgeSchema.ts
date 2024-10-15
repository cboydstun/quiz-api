import { gql } from 'apollo-server-express';

const badgeSchema = gql`
  type Badge {
    id: ID!
    name: String!
    description: String!
    imageUrl: String!
    earnedAt: String!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    badges: [Badge!]!
    badge(id: ID!): Badge
  }

  extend type Mutation {
    createBadge(name: String!, description: String!, imageUrl: String!): Badge!
    issueBadgeToUser(badgeId: ID!, userId: ID!): User!
  }

  extend type User {
    badges: [Badge!]!
  }
`;

export default badgeSchema;

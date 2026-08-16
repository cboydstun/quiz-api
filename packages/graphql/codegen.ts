import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/typeDefs.ts",
  generates: {
    "./src/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../context#GraphQLContext",
        useIndexSignature: true,
        // Resolvers return database rows, not the GraphQL shape; the mappers
        // below let TypeScript check field resolvers against the real rows.
        mappers: {
          User: "../models#UserModel",
          Question: "../models#QuestionModel",
        },
        enumsAsTypes: true,
        scalars: { ID: "string" },
      },
    },
  },
};

export default config;

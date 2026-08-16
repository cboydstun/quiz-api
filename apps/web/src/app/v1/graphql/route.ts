import { createGraphQLServer } from "@quiz/graphql";

/**
 * The entire backend deployment surface. Everything above this line lives in
 * packages/graphql, which knows nothing about Next.
 *
 * Deliberately no `runtime` or `dynamic` export: nodejs is the default (and
 * `edge` is deprecated in Next 16), and route handlers are uncached by default
 * for POST, while `dynamic` is removed once Cache Components is enabled.
 *
 * OPTIONS must be exported explicitly, or Next answers preflights itself and
 * the request never reaches Yoga.
 */
const { handleRequest } = createGraphQLServer({
  graphqlEndpoint: "/v1/graphql",
});

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};

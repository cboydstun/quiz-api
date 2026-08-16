import {
  createSchema,
  createYoga,
  type YogaInitialContext,
} from "graphql-yoga";
import type { Database } from "@quiz/db";
import { buildContext, type GraphQLContext } from "./context";
import { resolvers } from "./resolvers/index";
import { typeDefs } from "./typeDefs";

/** Yoga merges the server context into every resolver context, so the
 * schema is declared over the composed type rather than GraphQLContext alone. */
export const schema = createSchema<GraphQLContext & YogaInitialContext>({
  typeDefs,
  resolvers,
});

/** No per-request server context is threaded in; Next hands Yoga the Request. */
type ServerContext = Record<never, never>;

export interface ServerOptions {
  /** Path the route handler is mounted at; Yoga 404s if this disagrees. */
  graphqlEndpoint?: string;
  /** Test seam — pass a PGlite-backed handle instead of the Neon singleton. */
  db?: Database;
}

export function createGraphQLServer(options: ServerOptions = {}) {
  const isProduction = process.env.NODE_ENV === "production";

  return createYoga<ServerContext, GraphQLContext>({
    schema,
    graphqlEndpoint: options.graphqlEndpoint ?? "/v1/graphql",

    // Next must receive its own Response class, not the whatwg-node ponyfill.
    fetchAPI: { Response },

    context: ({ request }) => buildContext(request, { db: options.db }),

    // Same-origin by construction — the API is a route in the app it serves.
    cors: false,
    landingPage: false,
    graphiql: !isProduction,

    // No client batches requests, and disabling it removes an amplification
    // vector on a public endpoint.
    batching: false,

    // Left on deliberately. Yoga passes through GraphQLErrors thrown by
    // resolvers (that is how the client-matched auth messages survive) while
    // masking anything unexpected, which would otherwise leak connection
    // strings and stack traces.
    maskedErrors: true,
  });
}

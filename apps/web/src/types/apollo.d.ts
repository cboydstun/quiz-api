// Apollo Client 4 will not accept app-wide defaultOptions unless they are also
// declared here. The declaration is what teaches the hook result types that
// `errorPolicy: "all"` is in effect, so `data` and `error` can both be
// populated on the same result — the behaviour several pages and four test
// files depend on. The runtime values live in src/components/ApolloWrapper.tsx
// and must be kept in sync with this file.
import "@apollo/client";

declare module "@apollo/client" {
  namespace ApolloClient {
    namespace DeclareDefaultOptions {
      interface WatchQuery {
        errorPolicy: "all";
      }
      interface Query {
        errorPolicy: "all";
      }
      interface Mutate {
        errorPolicy: "all";
      }
    }
  }
}

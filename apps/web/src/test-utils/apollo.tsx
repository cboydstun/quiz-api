import { ReactNode } from "react";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  type FetchResult,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";

export interface OperationRecord {
  operationName: string;
  variables: Record<string, unknown>;
}

type Responder = (record: OperationRecord) => FetchResult | Error | undefined;

/**
 * An Apollo client backed by a link that records every operation it sees.
 * MockedProvider can only assert that a response was consumed; several of the
 * bugs under test are about an operation firing *more than once*, which needs
 * the call log.
 */
export function createRecordingClient(respond: Responder) {
  const operations: OperationRecord[] = [];

  const link = new ApolloLink((operation) => {
    const record: OperationRecord = {
      operationName: operation.operationName ?? "(anonymous)",
      variables: operation.variables as Record<string, unknown>,
    };
    operations.push(record);

    return new Observable<FetchResult>((observer) => {
      const result = respond(record);
      // Resolve on a microtask so callers see genuinely async behaviour.
      queueMicrotask(() => {
        if (result instanceof Error) {
          observer.error(result);
          return;
        }
        observer.next(result ?? { data: null });
        observer.complete();
      });
    });
  });

  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { errorPolicy: "all" },
      query: { errorPolicy: "all" },
      mutate: { errorPolicy: "all" },
    },
  });

  const countOf = (operationName: string) =>
    operations.filter((op) => op.operationName === operationName).length;

  const Provider = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );

  return { client, operations, countOf, Provider };
}

import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid an immediate refetch on the client right after SSR hands off.
        staleTime: 60 * 1000,
      },
    },
  });
}

// On the server we want a fresh QueryClient per request (no cross-request
// state leaking between users). In the browser we want exactly one instance
// that survives re-renders, so it's memoized on the module scope.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

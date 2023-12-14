declare module 'ember-testing/lib/test/pending_requests' {
  export function pendingRequests(): number;
  export function clearPendingRequests(): void;
  export function incrementPendingRequests(_: unknown, xhr: unknown): void;
  export function decrementPendingRequests(_: unknown, xhr: unknown): void;
}

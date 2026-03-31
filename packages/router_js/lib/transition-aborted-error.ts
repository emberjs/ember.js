export interface TransitionAbortedError extends Error {
  name: 'TransitionAborted';
  code: 'TRANSITION_ABORTED';
}

export function buildTransitionAborted() {
  let error = new Error('TransitionAborted') as TransitionAbortedError;
  error.name = 'TransitionAborted';
  error.code = 'TRANSITION_ABORTED';
  return error;
}

export function isTransitionAborted(maybeError: unknown): maybeError is TransitionAbortedError {
  return (
    typeof maybeError === 'object' &&
    maybeError !== null &&
    (maybeError as TransitionAbortedError).code === 'TRANSITION_ABORTED'
  );
}

interface Abortable<T extends boolean> {
  isAborted: T;
  [key: string]: unknown;
}

function isAbortable<T extends boolean>(maybeAbortable: unknown): maybeAbortable is Abortable<T> {
  return (
    typeof maybeAbortable === 'object' &&
    maybeAbortable !== null &&
    typeof (maybeAbortable as Abortable<T>).isAborted === 'boolean'
  );
}

export function throwIfAborted(maybe: Abortable<true>): never;
export function throwIfAborted(maybe: unknown): void;
export function throwIfAborted(maybe: unknown | Abortable<boolean>): never | void {
  if (isAbortable(maybe) && maybe.isAborted) {
    throw buildTransitionAborted();
  }
}

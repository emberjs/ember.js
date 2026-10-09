import { trackedObject } from '@ember/reactive/collections';

const TRACKED_CONTEXTS = new WeakMap<object, object>();

/**
 * The tracked context for a plain object a test passes in. The same plain object always maps to
 * the same tracked object, so a server render and a client render (or several renders of the same
 * context) share one tracked context, as they shared the plain object before.
 */
export function trackedContext<T extends Record<string, unknown>>(plain: T): T {
  let existing = TRACKED_CONTEXTS.get(plain);
  if (existing === undefined) {
    // every write dirties, like `RenderTest.context`
    existing = trackedObject<Record<string, unknown>>(plain, { equals: () => false });
    TRACKED_CONTEXTS.set(plain, existing);
  }
  return existing as T;
}

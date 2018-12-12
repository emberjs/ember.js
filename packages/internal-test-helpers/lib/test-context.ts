export interface BaseContext {
  [key: string]: any;
}

let __test_context__: BaseContext | undefined;

/**
 * Stores the provided context as the "global testing context".
 *
 * @param {Object} context the context to use
 */
export function setContext(context: BaseContext): void {
  __test_context__ = context;
}

/**
 * Retrive the "global testing context" as stored by `setContext`.
 *
 * @returns {Object} the previously stored testing context
 */
export function getContext(): BaseContext | undefined {
  return __test_context__;
}

/**
 * Clear the "global testing context".
 */
export function unsetContext(): void {
  __test_context__ = undefined;
}

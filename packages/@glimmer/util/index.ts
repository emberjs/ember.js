export * from './lib/array-utils';
export { dict, isDict, isObject, StackImpl as Stack } from './lib/collections';
export { beginTestSteps, endTestSteps, logStep, verifySteps } from './lib/debug-steps';
export * from './lib/dom';
export * from './lib/dom-utils';
export * from './lib/immediate';
export { default as intern } from './lib/intern';
export {
  isSerializationFirstNode,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/is-serialization-first-node';
export { assign, entries, keys, values } from './lib/object-utils';
export * from './lib/string';

export type FIXME<T, S extends string> = (T & S) | T;

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOCAL_LOGGER should only be used inside a
 * LOCAL_SHOULD_LOG check.
 *FF
 * It does not alleviate the need to check LOCAL_SHOULD_LOG, which is used
 * for stripping.
 */
export const LOCAL_LOGGER = console;

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOGGER can be used outside of LOCAL_SHOULD_LOG checks,
 * and is meant to be used in the rare situation where a console.* call is
 * actually appropriate.
 */
export const LOGGER = console;

export function assertNever(value: never, desc = 'unexpected unreachable branch'): never {
  LOGGER.log('unreachable', value);
  LOGGER.log(`${desc} :: ${JSON.stringify(value)} (${value})`);

  throw new Error(`code reached unreachable`);
}

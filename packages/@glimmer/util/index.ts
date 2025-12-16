import { LOCAL_LOGGER, LOGGER } from './lib/local-logger';
export * from './lib/array-utils';
export { dict, isDict, isIndexable, StackImpl as Stack } from './lib/collections';
export { beginTestSteps, endTestSteps, logStep, verifySteps } from './lib/debug-steps';
export * from './lib/dom';
export { default as intern } from './lib/intern';
export {
  isSerializationFirstNode,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/is-serialization-first-node';
export { assign, entries, keys, values } from './lib/object-utils';
export * from './lib/string';

export type FIXME<T, S extends string> = (T & S) | T;

export { LOCAL_LOGGER, LOGGER };

export function assertNever(value: never, desc = 'unexpected unreachable branch'): never {
  LOGGER.log('unreachable', value);
  LOGGER.log(`${desc} :: ${JSON.stringify(value)} (${value})`);

  throw new Error(`code reached unreachable`);
}

export { EMPTY_ARRAY } from './lib/array-utils';
export { default as assert, deprecate } from './lib/assert';
export { dict, DictSet, isDict, isObject, Set, StackImpl as Stack } from './lib/collections';
export * from './lib/dom';
export { ensureGuid, HasGuid, initializeGuid } from './lib/guid';
export {
  isSerializationFirstNode,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/is-serialization-first-node';
export { assign, fillNulls, values } from './lib/object-utils';
export * from './lib/platform-utils';
export * from './lib/string';
export * from './lib/immediate';
export * from './lib/template';

export { default as debugToString } from './lib/debug-to-string';
export { beginTestSteps, endTestSteps, logStep, verifySteps } from './lib/debug-steps';

export type FIXME<T, S extends string> = (T & S) | T;

export function assertNever(value: never, desc = 'unexpected unreachable branch'): void {
  console.log('unreachable', value);
  console.trace(`${desc} :: ${JSON.stringify(value)} (${value})`);
}

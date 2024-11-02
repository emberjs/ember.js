export { default as assert, deprecate } from './lib/assert';
export { default as debugToString } from './lib/debug-to-string';
export * from './lib/platform-utils';
export * from './lib/present';
export {
  castToBrowser,
  castToSimple,
  checkBrowserNode as checkNode,
  isElement,
  isSimpleElement,
} from './lib/simple-cast';
export * from './lib/template';
export { default as buildUntouchableThis } from './lib/untouchable-this';

export type FIXME<T, S extends string> = (T & S) | T;

export type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never;

// This is a duplicate utility from @glimmer/util because `@glimmer/validator`
// should not depend on any other @glimmer packages, in order to avoid pulling
// in types and prevent regressions in `@glimmer/tracking` (which has public types).
export const symbol =
  typeof Symbol !== 'undefined'
    ? Symbol
    : (key: string) => `__${key}${Math.floor(Math.random() * Date.now())}__` as any;

export const symbolFor =
  typeof Symbol !== 'undefined'
    ? Symbol.for
    : (key: string) => (`__GLIMMER_VALIDATOR_SYMBOL_FOR_${key}` as unknown) as symbol;

export function getGlobal(): any {
  // eslint-disable-next-line node/no-unsupported-features/es-builtins
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;

  throw new Error('unable to locate global object');
}

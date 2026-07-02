/**
 * The brand for classic (class-based) helpers lives in its own module so that
 * code which only needs to *detect* classic helpers (e.g. the resolver) does
 * not have to import the classic `Helper` base class (and with it the classic
 * object model: `EmberObject`, `Mixin`, meta, etc.).
 */
export const IS_CLASSIC_HELPER: unique symbol = Symbol('IS_CLASSIC_HELPER');

export function isClassicHelper(obj: object): boolean {
  return (obj as any)[IS_CLASSIC_HELPER] === true;
}

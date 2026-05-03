export const DIRTY_TAG: unique symbol = Symbol('DIRTY_TAG');
export const IS_DISPATCHING_ATTRS: unique symbol = Symbol('IS_DISPATCHING_ATTRS');
export const BOUNDS: unique symbol = Symbol('BOUNDS');

export const CURLY_COMPONENT_BRAND: unique symbol = Symbol('CURLY_COMPONENT_BRAND');

export function isCurlyManager(manager: object): boolean {
  return (manager as { [CURLY_COMPONENT_BRAND]?: boolean })[CURLY_COMPONENT_BRAND] === true;
}

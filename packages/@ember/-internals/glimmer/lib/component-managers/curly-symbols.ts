// Leaf-level symbols and the curly-manager identity check, factored out so
// the renderer and resolver don't have to drag in the classic CurlyComponentManager
// (and through it the entire `@ember/component`/EmberObject pyramid).
//
// `curly.ts` marks its manager singleton with `IS_CURLY_MANAGER` so the check
// here works without the marker file knowing about the manager itself.

export const BOUNDS = Symbol('BOUNDS');
export const DIRTY_TAG = Symbol('DIRTY_TAG');
export const IS_DISPATCHING_ATTRS = Symbol('IS_DISPATCHING_ATTRS');

export const IS_CURLY_MANAGER = Symbol('IS_CURLY_MANAGER');

export function isCurlyManager(manager: object): boolean {
  return (manager as { [IS_CURLY_MANAGER]?: boolean })[IS_CURLY_MANAGER] === true;
}

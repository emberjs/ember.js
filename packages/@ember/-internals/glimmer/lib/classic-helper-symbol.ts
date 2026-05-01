// Leaf-level brand and registration hook for the classic class-based
// `Helper` system, factored out so the resolver doesn't statically depend on
// `./helper` (which extends `FrameworkObject` and pulls in the entire
// `EmberObject` / `Mixin` / `CoreObject` pyramid).
//
// `helper.ts` registers its `CLASSIC_HELPER_MANAGER` here on import. If the
// app never imports `@ember/component/helper`, classic helpers can't exist
// and the resolver short-circuits cleanly without dragging in any of it.

export const IS_CLASSIC_HELPER: unique symbol = Symbol('IS_CLASSIC_HELPER');

export function isClassicHelper(obj: object): boolean {
  return (obj as { [IS_CLASSIC_HELPER]?: boolean })[IS_CLASSIC_HELPER] === true;
}

let classicHelperManager: object | null = null;

export function registerClassicHelperManager(manager: object): void {
  classicHelperManager = manager;
}

export function getClassicHelperManager(): object | null {
  return classicHelperManager;
}

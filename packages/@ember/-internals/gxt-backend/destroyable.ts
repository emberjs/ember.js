import { destroyable } from '@lifeart/gxt/glimmer-compatibility';

const _gxtRegisterDestructor = destroyable.registerDestructor;

// Wrap registerDestructor to match Ember's signature:
// Ember: registerDestructor(obj, callback, eager?)
// GXT:   registerDestructor(obj, ...callbacks) — spreads ALL args after obj as callbacks
// Without this wrapper, the boolean `eager` flag gets pushed as a "destructor"
// and fails with "n[r] is not a function" when destroy is called.
export function registerDestructor(obj: object, callback: Function, _eager?: boolean) {
  _gxtRegisterDestructor(obj, callback);
}

// GXT marks objects as "destroyed" (adds to its internal WeakSet) BEFORE running
// destructors. Ember expects `isDestroyed` to be false during `willDestroy` —
// only `isDestroying` should be true at that point. We track which objects are
// currently running their destructors so `isDestroyed` returns false for them.
const _currentlyDestroying = new WeakSet<object>();

const _gxtDestroy = destroyable.destroy;

export function destroy(obj: object): void {
  _currentlyDestroying.add(obj);
  try {
    _gxtDestroy(obj);
  } finally {
    _currentlyDestroying.delete(obj);
  }
}

export function isDestroyed(obj: object): boolean {
  // While destructors are running, the object is "destroying" but not yet "destroyed"
  if (_currentlyDestroying.has(obj)) {
    return false;
  }
  return destroyable.isDestroyed(obj);
}

export const {
  destroyChildren,
  associateDestroyableChild,
  unregisterDestructor,
  _hasDestroyableChildren,
} = destroyable;

export function assertDestroyablesDestroyed() {
  // no-op for GXT
}
export function enableDestroyableTracking() {
  // no-op for GXT
}
export function isDestroying(obj: any) {
  // During destruction, isDestroying should return true
  if (_currentlyDestroying.has(obj)) {
    return true;
  }
  // GXT uses isDestructionStarted, but for Ember compat we check both
  return destroyable.isDestructionStarted?.(obj) ?? destroyable.isDestroyed?.(obj) ?? false;
}

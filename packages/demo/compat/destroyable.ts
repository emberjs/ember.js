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

export const {
  isDestroyed,
  destroy,
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
  // GXT uses isDestructionStarted, but for Ember compat we check both
  return destroyable.isDestructionStarted?.(obj) ?? destroyable.isDestroyed?.(obj) ?? false;
}

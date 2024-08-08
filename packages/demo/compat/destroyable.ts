import { destroyable } from '@lifeart/gxt/glimmer-compatibility';
// console.log('destroyable', destroyable);
export const {
  registerDestructor,
  isDestroyed,
  destroy,
  destroyChildren,
  associateDestroyableChild,
  unregisterDestructor,
  _hasDestroyableChildren,
} = destroyable;

export function assertDestroyablesDestroyed() {
  console.log('assertDestroyablesDestroyed', ...arguments);
}
export function enableDestroyableTracking() {
  console.log('enableDestroyableTracking', ...arguments);
}
export function isDestroying() {
  return false;
}

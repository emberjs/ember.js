import { Meta, peekMeta } from '@ember/-internals/meta/lib/meta';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { destroyObservers } from './observer';

/**
  Enqueues finalization on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method destroy
  @for Ember
  @param {Object} obj the object to destroy
  @return {boolean} true if the object went from not destroying to destroying.
  @private
*/
export function destroy(obj: object): boolean {
  assert('Cannot call `destroy` on null', obj !== null);
  assert('Cannot call `destroy` on undefined', obj !== undefined);
  assert(
    `Cannot call \`destroy\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  const m = peekMeta(obj);
  if (m === null || m.isSourceDestroying()) {
    return false;
  }
  m.setSourceDestroying();
  destroyObservers(obj);
  schedule('destroy', m, finalize);
  return true;
}

function finalize(this: Meta) {
  this.setSourceDestroyed();
  this.destroy();
}

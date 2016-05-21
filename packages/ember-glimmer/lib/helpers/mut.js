import { assert } from 'ember-metal/debug';
import { MUTABLE_REFERENCE } from 'ember-htmlbars/keywords/mut';
import { isConst } from 'glimmer-reference';

export default {
  isInternalHelper: true,
  toReference(args) {
    let ref = args.positional.at(0);

    assert('You can only pass a path to mut', !isConst(ref));

    if (!isMut(ref)) {
      ref[MUTABLE_REFERENCE] = true;
    }
    return ref;
  }
};

export function isMut(ref) {
  return !!(ref && ref[MUTABLE_REFERENCE]);
}


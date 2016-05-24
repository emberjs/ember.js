import { assert } from 'ember-metal/debug';
import { InternalHelperReference, MUT, isMut, UPDATE } from '../utils/references';
import { isConst } from 'glimmer-reference';

export default {
  isInternalHelper: true,
  toReference(args) {
    let ref = args.positional.at(0);

    assert('You can only pass a path to mut', !isConst(ref));

    if (!isMut(ref)) {
      return new MutHelperReference(mut, args);
    }
    return ref;
  }
};

function mut({ positional }) {
  return positional.at(0).value();
}

class MutHelperReference extends InternalHelperReference {
   constructor() {
    super(...arguments);
    this[MUT] = true;
  }

  [UPDATE](value) {
    let parentRef = this.args.positional.at(0);
    parentRef[UPDATE](value);
  }
}

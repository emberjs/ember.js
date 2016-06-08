import { assert } from 'ember-metal/debug';
import { InternalHelperReference, UPDATE } from '../utils/references';
import { INVOKE } from 'ember-htmlbars/keywords/closure-action';
import { MUTABLE_REFERENCE } from 'ember-htmlbars/keywords/mut';
import { isConst } from 'glimmer-reference';

export default {
  isInternalHelper: true,
  toReference(args) {
    let ref = args.positional.at(0);

    assert('You can only pass a path to mut', !isConst(ref));

    if (!ref[MUTABLE_REFERENCE]) {
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
    this[MUTABLE_REFERENCE] = true;
  }

  [UPDATE](val) {
    let argRef = this.args.positional.at(0);
    argRef[UPDATE](val);
  }

  [INVOKE](val) {
    this[UPDATE](val);
  }
}

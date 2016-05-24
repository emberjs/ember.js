import { InternalHelperReference, UPDATE, READONLY } from '../utils/references';
import { assert } from 'ember-metal/debug';

function readonly({ positional }) {
  return positional.at(0).value();
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new ReadOnlyReference(readonly, args);
  }
};

export class ReadOnlyReference extends InternalHelperReference {
  constructor() {
    super(...arguments);
    this[READONLY] = true;
  }

  [UPDATE](value) {
    assert('You cannot update the value of a readonly attribute', false);
  }
}

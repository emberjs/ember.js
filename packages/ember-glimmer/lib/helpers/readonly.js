import { InternalHelperReference, UPDATE } from '../utils/references';
import EmberError from 'ember-metal/error';

function readonly({ positional }) {
  return positional.at(0).value();
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new ReadonlyReference(readonly, args);
  }
};

export class ReadonlyReference extends InternalHelperReference {
  [UPDATE](value) {
    throw new EmberError('You cannot update the value of a readonly path');
  }
}

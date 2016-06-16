import symbol from 'ember-metal/symbol';
import { UPDATE } from '../utils/references';
import { unMut } from './mut';

const READONLY_REFERENCE = symbol('READONLY');

export function isReadonly(ref) {
  return ref && ref[READONLY_REFERENCE];
}

export default {
  isInternalHelper: true,

  toReference(args) {
    let ref = unMut(args.positional.at(0));

    let wrapped = Object.create(ref);

    wrapped[READONLY_REFERENCE] = true;
    wrapped[UPDATE] = undefined;

    return wrapped;
  }
};

import { isArray } from 'ember-runtime/utils';
import { get } from 'ember-metal/property_get';

export default function toBool(predicate) {
  if (!predicate) {
    return false;
  }

  if (predicate === true) {
    return true;
  }

  if (isArray(predicate)) {
    return get(predicate, 'length') !== 0;
  }

  return true;
}

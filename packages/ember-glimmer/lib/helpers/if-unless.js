import { isArray } from 'ember-runtime/utils';
import { get } from 'ember-metal/property_get';

export function toBool(predicate) {
  if (!predicate) {
    return false;
  }

  if (predicate === true) {
    return true;
  }

  if (typeof predicate === 'object') {
    let isTruthy = get(predicate, 'isTruthy');

    if (typeof isTruthy === 'boolean') {
      return isTruthy;
    }
  }

  if (isArray(predicate)) {
    return get(predicate, 'length') !== 0;
  }

  return true;
}

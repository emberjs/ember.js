import { Opaque } from '@glimmer/interfaces';
import { get } from 'ember-metal';
import { isArray } from 'ember-runtime';

export default function toBool(predicate: Opaque) {
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

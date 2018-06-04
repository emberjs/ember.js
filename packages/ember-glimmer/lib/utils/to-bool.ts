import { Opaque } from '@glimmer/interfaces';
import { isArray } from 'ember-runtime';

export default function toBool(predicate: Opaque): boolean {
  if (isArray(predicate)) {
    return (predicate as { length: number }).length !== 0;
  } else {
    return !!predicate;
  }
}

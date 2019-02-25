import { isArray } from '@ember/-internals/runtime';
import { Opaque } from '@glimmer/interfaces';

export default function toBool(predicate: Opaque): boolean {
  if (isArray(predicate)) {
    return (predicate as { length: number }).length !== 0;
  } else {
    return Boolean(predicate);
  }
}

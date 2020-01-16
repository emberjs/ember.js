import { get } from '@ember/-internals/metal';
import { isArray } from '@ember/-internals/runtime';
import { isProxy } from '@ember/-internals/utils';

export default function toBool(predicate: unknown): boolean {
  if (isProxy(predicate)) {
    return Boolean(get(predicate, 'isTruthy'));
  } else if (isArray(predicate)) {
    return (predicate as { length: number }).length !== 0;
  } else {
    return Boolean(predicate);
  }
}

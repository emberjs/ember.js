import { isArray } from '@ember/-internals/runtime';

export default function toBool(predicate: unknown): boolean {
  if (isArray(predicate)) {
    return (predicate as { length: number }).length !== 0;
  } else {
    return Boolean(predicate);
  }
}

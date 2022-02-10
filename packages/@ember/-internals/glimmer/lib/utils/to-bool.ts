import { isHTMLSafe } from '@ember/-internals/glimmer';
import { get, tagForProperty } from '@ember/-internals/metal';
import { isArray } from '@ember/-internals/runtime';
import { isProxy } from '@ember/-internals/utils';
import { consumeTag } from '@glimmer/validator';

export default function toBool(predicate: unknown): boolean {
  if (isProxy(predicate)) {
    consumeTag(tagForProperty(predicate, 'content'));

    return Boolean(get(predicate, 'isTruthy'));
  } else if (isArray(predicate)) {
    consumeTag(tagForProperty(predicate as object, '[]'));

    return (predicate as { length: number }).length !== 0;
  } else if (isHTMLSafe(predicate)) {
    return Boolean(predicate.toString());
  } else {
    return Boolean(predicate);
  }
}

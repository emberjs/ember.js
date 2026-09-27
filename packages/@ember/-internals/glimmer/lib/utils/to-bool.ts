import { isHTMLSafe } from './string';
import { get } from '@ember/-internals/metal/lib/property_get';
import { tagForProperty } from '@ember/-internals/metal/lib/tags';
import isArray from '@ember/array/lib/is-array';
import { isProxy } from '@ember/-internals/utils/lib/is_proxy';
import { consumeTag } from '@glimmer/validator/lib/tracking';

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

import { get } from '@ember/-internals/metal/lib/property_get';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import type { UpdatableTag } from '@glimmer/interfaces';
import { UPDATE_TAG as updateTag } from '@glimmer/validator/lib/validators';
import type ProxyMixin from './-proxy';

export function contentFor<T>(proxy: ProxyMixin<T>): T | null {
  let content = get(proxy, 'content');
  // SAFETY: @glimmer/validator doesn't expose enough public types for an
  // assertion here.
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

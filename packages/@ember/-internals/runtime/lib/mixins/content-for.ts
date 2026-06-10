import { get } from '@ember/-internals/metal/lib/property_get';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import type { UpdatableTag } from '@glimmer/interfaces';
import { UPDATE_TAG as updateTag } from '@glimmer/validator/lib/validators';
import type ProxyMixin from './-proxy';

export function contentFor<T>(proxy: ProxyMixin<T>): T | null {
  let content = get(proxy, 'content');
  // SAFETY: Ideally we'd assert instead of casting, but @glimmer/validator doesn't give us
  // sufficient public types for this. Previously this code was .js and worked correctly so
  // hopefully this is sufficiently reliable.
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

import { get } from '@ember/-internals/metal/lib/property_get';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import type { UpdatableTag } from '@glimmer/interfaces';
import { UPDATE_TAG as updateTag } from '@glimmer/validator/lib/validators';
import type ProxyMixin from './-proxy';

// Extracted from `./-proxy` so that consumers (notably the `each-in` helper
// reachable from the renderer) don't have to drag in `@ember/object/mixin`
// and the `ProxyMixin = Mixin.create(...)` side effect — that's the entry
// point to the entire EmberObject/PrototypeMixin pyramid.

export function contentFor<T>(proxy: ProxyMixin<T>): T | null {
  let content = get(proxy, 'content');
  // SAFETY: matches the original cast in -proxy.ts; @glimmer/validator
  // doesn't expose enough public types for an assertion here.
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

import { get } from '@ember/-internals/metal/lib/property_get';
import { tagForProperty } from '@ember/-internals/metal/lib/tags';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import { isProxy } from '@ember/-internals/utils/lib/is_proxy';
import { setupMandatorySetter } from '@ember/-internals/utils/lib/mandatory-setter';
import { isObject } from '@ember/-internals/utils/lib/spec';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { UpdatableTag, Tag } from '@glimmer/interfaces';
import { combine, UPDATE_TAG as updateTag } from '@glimmer/validator/lib/validators';
import { tagFor, tagMetaFor } from '@glimmer/validator/lib/meta';

export interface ContentProxy<T = unknown> {
  content: T | null;
}

export function contentFor<T>(proxy: ContentProxy<T>): T | null {
  let content = get(proxy, 'content');
  // SAFETY: Ideally we'd assert instead of casting, but @glimmer/validator doesn't give us
  // sufficient public types for this. Previously this code was .js and worked correctly so
  // hopefully this is sufficiently reliable.
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

export function customTagForProxy(proxy: object, key: string, addMandatorySetter?: boolean): Tag {
  assert('Expected a proxy', isProxy(proxy));

  let m = tagMetaFor(proxy);
  let tag = tagFor(proxy, key, m);

  if (DEBUG) {
    // TODO: Replace this with something more first class for tracking tags in DEBUG
    // SAFETY: This is not an officially supported property but setting shouldn't cause issues.
    (tag as any)._propertyKey = key;
  }

  if (key in proxy) {
    if (DEBUG && addMandatorySetter) {
      assert('[BUG] setupMandatorySetter should be set when debugging', setupMandatorySetter);
      setupMandatorySetter(tag, proxy, key);
    }

    return tag;
  } else {
    let tags: Tag[] = [tag, tagFor(proxy, 'content', m)];

    let content = contentFor(proxy);

    if (isObject(content)) {
      tags.push(tagForProperty(content, key, addMandatorySetter));
    }

    return combine(tags);
  }
}

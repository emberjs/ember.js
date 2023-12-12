/**
@module ember
*/

import { meta } from '@ember/-internals/meta';
import Mixin from '@ember/object/mixin';
import {
  get,
  set,
  defineProperty,
  tagForObject,
  computed,
  tagForProperty,
} from '@ember/-internals/metal';
import { setProxy, setupMandatorySetter, isObject, isProxy } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { setCustomTagFor } from '@glimmer/manager';
import type { UpdatableTag, Tag } from '@glimmer/validator';
import { combine, updateTag, tagFor, tagMetaFor } from '@glimmer/validator';

export function contentFor<T>(proxy: ProxyMixin<T>): T | null {
  let content = get(proxy, 'content');
  // SAFETY: Ideally we'd assert instead of casting, but @glimmer/validator doesn't give us
  // sufficient public types for this. Previously this code was .js and worked correctly so
  // hopefully this is sufficiently reliable.
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

function customTagForProxy(proxy: object, key: string, addMandatorySetter?: boolean): Tag {
  assert('Expected a proxy', isProxy(proxy));

  let meta = tagMetaFor(proxy);
  let tag = tagFor(proxy, key, meta);

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
    let tags: Tag[] = [tag, tagFor(proxy, 'content', meta)];

    let content = contentFor(proxy);

    if (isObject(content)) {
      tags.push(tagForProperty(content, key, addMandatorySetter));
    }

    return combine(tags);
  }
}

/**
  `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
  @private
*/
interface ProxyMixin<T = unknown> {
  /**
    The object whose properties will be forwarded.

    @property content
    @type {unknown}
    @default null
    @public
  */
  content: T | null;

  willDestroy(): void;

  isTruthy: boolean;

  unknownProperty<K extends keyof T>(key: K): T[K] | undefined;
  unknownProperty(key: string): unknown;

  setUnknownProperty<K extends keyof T>(key: K, value: T[K]): T[K];
  setUnknownProperty<V>(key: string, value: V): V;
}

const ProxyMixin = Mixin.create({
  /**
    The object whose properties will be forwarded.

    @property content
    @type {unknown}
    @default null
    @public
  */
  content: null,

  init() {
    this._super(...arguments);
    setProxy(this);
    tagForObject(this);
    setCustomTagFor(this, customTagForProxy);
  },

  willDestroy() {
    this.set('content', null);
    this._super(...arguments);
  },

  isTruthy: computed('content', function () {
    return Boolean(get(this, 'content'));
  }),

  unknownProperty(key: string) {
    let content = contentFor(this);
    return content ? get(content, key) : undefined;
  },

  setUnknownProperty(key: string, value: unknown) {
    let m = meta(this);

    if (m.isInitializing() || m.isPrototypeMeta(this)) {
      // if marked as prototype or object is initializing then just
      // defineProperty rather than delegate
      defineProperty(this, key, null, value);
      return value;
    }

    let content = contentFor(this);

    assert(
      `Cannot delegate set('${key}', ${value}) to the 'content' property of object proxy ${this}: its 'content' is undefined.`,
      content
    );

    // SAFETY: We don't actually guarantee that this is an object, so this isn't necessarily safe :(
    return set(content as object, key, value);
  },
});

export default ProxyMixin;

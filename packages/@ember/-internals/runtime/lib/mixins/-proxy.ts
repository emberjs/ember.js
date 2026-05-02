/**
@module ember
*/

import { meta } from '@ember/-internals/meta/lib/meta';
import Mixin from '@ember/object/mixin';
import { get } from '@ember/-internals/metal/lib/property_get';
import { set } from '@ember/-internals/metal/lib/property_set';
import { defineProperty } from '@ember/-internals/metal/lib/properties';
import { tagForObject, tagForProperty } from '@ember/-internals/metal/lib/tags';
import computed from '@ember/-internals/metal/lib/computed';
import { setProxy, isProxy } from '@ember/-internals/utils/lib/is_proxy';
import { setupMandatorySetter } from '@ember/-internals/utils/lib/mandatory-setter';
import { isObject } from '@ember/-internals/utils/lib/spec';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { setCustomTagFor } from '@glimmer/manager/lib/util/args-proxy';
import type { Tag } from '@glimmer/interfaces';
import { combine } from '@glimmer/validator/lib/validators';
import { tagFor, tagMetaFor } from '@glimmer/validator/lib/meta';

// `contentFor` was extracted to `./content-for` so the `each-in` helper
// (reachable from the renderer) can use it without dragging in this
// file's `Mixin.create(...)` graph. Re-exported here for back-compat.
import { contentFor } from './content-for';
export { contentFor };

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
  `ProxyMixin` forwards all properties not defined by the proxy itself
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

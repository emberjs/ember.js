/**
@module ember
*/

import { meta } from '@ember/-internals/meta';
import {
  get,
  set,
  defineProperty,
  Mixin,
  tagForObject,
  computed,
  CUSTOM_TAG_FOR,
  getChainTagsForKey,
} from '@ember/-internals/metal';
import { setProxy, setupMandatorySetter } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { combine, updateTag, tagFor } from '@glimmer/validator';

export function contentFor(proxy) {
  let content = get(proxy, 'content');
  updateTag(tagForObject(proxy), tagForObject(content));
  return content;
}

/**
  `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
  @private
*/
export default Mixin.create({
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
  },

  willDestroy() {
    this.set('content', null);
    this._super(...arguments);
  },

  isTruthy: computed('content', function() {
    return Boolean(get(this, 'content'));
  }),

  [CUSTOM_TAG_FOR](key) {
    let tag = tagFor(this, key);

    if (DEBUG) {
      // TODO: Replace this with something more first class for tracking tags in DEBUG
      tag._propertyKey = key;
    }

    if (key in this) {
      if (DEBUG) {
        setupMandatorySetter(tag, this, key);
      }

      return tag;
    } else {
      return combine([tag, ...getChainTagsForKey(this, `content.${key}`)]);
    }
  },

  unknownProperty(key) {
    let content = contentFor(this);
    if (content) {
      return get(content, key);
    }
  },

  setUnknownProperty(key, value) {
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

    return set(content, key, value);
  },
});

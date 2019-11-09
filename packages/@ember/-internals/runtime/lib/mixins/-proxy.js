/**
@module ember
*/

import { meta } from '@ember/-internals/meta';
import {
  get,
  set,
  addObserver,
  removeObserver,
  notifyPropertyChange,
  defineProperty,
  Mixin,
  tagFor,
  computed,
  UNKNOWN_PROPERTY_TAG,
  getChainTagsForKey,
} from '@ember/-internals/metal';
import { setProxy } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { combine, update } from '@glimmer/validator';

export function contentFor(proxy, m) {
  let content = get(proxy, 'content');
  let tag = (m === undefined ? meta(proxy) : m).readableTag();
  if (tag !== undefined) {
    update(tag, tagFor(content));
  }
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
    let m = meta(this);
    m.writableTag();
  },

  willDestroy() {
    this.set('content', null);
    this._super(...arguments);
  },

  isTruthy: computed('content', function() {
    return Boolean(get(this, 'content'));
  }),

  willWatchProperty(key) {
    if (!EMBER_METAL_TRACKED_PROPERTIES) {
      let contentKey = `content.${key}`;
      addObserver(this, contentKey, null, '_contentPropertyDidChange');
    }
  },

  didUnwatchProperty(key) {
    if (!EMBER_METAL_TRACKED_PROPERTIES) {
      let contentKey = `content.${key}`;
      removeObserver(this, contentKey, null, '_contentPropertyDidChange');
    }
  },

  _contentPropertyDidChange(content, contentKey) {
    let key = contentKey.slice(8); // remove "content."
    if (key in this) {
      return;
    } // if shadowed in proxy
    notifyPropertyChange(this, key);
  },

  [UNKNOWN_PROPERTY_TAG](key) {
    return combine(getChainTagsForKey(this, `content.${key}`));
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

    let content = contentFor(this, m);

    assert(
      `Cannot delegate set('${key}', ${value}) to the \'content\' property of object proxy ${this}: its 'content' is undefined.`,
      content
    );

    return set(content, key, value);
  },
});

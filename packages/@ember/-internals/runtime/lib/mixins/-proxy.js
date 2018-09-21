/**
@module ember
*/

import { combine, CONSTANT_TAG, DirtyableTag, UpdatableTag } from '@glimmer/reference';
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
} from '@ember/-internals/metal';
import { setProxy } from '@ember/-internals/utils';
import { assert } from '@ember/debug';

function contentPropertyDidChange(content, contentKey) {
  let key = contentKey.slice(8); // remove "content."
  if (key in this) {
    return;
  } // if shadowed in proxy
  notifyPropertyChange(this, key);
}

export function contentFor(proxy, m) {
  let content = get(proxy, 'content');
  let tag = (m === undefined ? meta(proxy) : m).readableTag();
  if (tag !== undefined) {
    tag.inner.second.inner.update(tagFor(content));
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
    @type EmberObject
    @default null
    @private
  */
  content: null,

  init() {
    this._super(...arguments);
    setProxy(this);
    let m = meta(this);
    m.writableTag(() => combine([DirtyableTag.create(), UpdatableTag.create(CONSTANT_TAG)]));
  },

  willDestroy() {
    this.set('content', null);
    this._super(...arguments);
  },

  isTruthy: computed('content', function() {
    return !!get(this, 'content');
  }),

  willWatchProperty(key) {
    let contentKey = `content.${key}`;
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty(key) {
    let contentKey = `content.${key}`;
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty(key) {
    let content = contentFor(this);
    if (content) {
      return get(content, key);
    }
  },

  setUnknownProperty(key, value) {
    let m = meta(this);

    if (m.proto === this) {
      // if marked as prototype then just defineProperty
      // rather than delegate
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

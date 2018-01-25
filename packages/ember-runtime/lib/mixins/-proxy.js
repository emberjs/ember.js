/**
@module ember
*/

import { CachedTag, DirtyableTag, UpdatableTag } from '@glimmer/reference';
import {
  get,
  set,
  meta,
  addObserver,
  removeObserver,
  notifyPropertyChange,
  defineProperty,
  Mixin,
  tagFor,
} from 'ember-metal';
import {
  assert,
} from 'ember-debug';
import { bool } from '../computed/computed_macros';

function contentPropertyDidChange(content, contentKey) {
  let key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  notifyPropertyChange(this, key);
}

class ProxyTag extends CachedTag {
  constructor(proxy) {
    super();

    let content = get(proxy, 'content');

    this.proxy = proxy;
    this.proxyWrapperTag = new DirtyableTag();
    this.proxyContentTag = new UpdatableTag(tagFor(content));
  }

  compute() {
    return Math.max(this.proxyWrapperTag.value(), this.proxyContentTag.value());
  }

  dirty() {
    this.proxyWrapperTag.dirty();
  }

  contentDidChange() {
    let content = get(this.proxy, 'content');
    this.proxyContentTag.update(tagFor(content));
  }
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
    let m = meta(this);
    m.setProxy();
    m.writableTag((source)=> new ProxyTag(source));
  },

  isTruthy: bool('content'),

  willWatchProperty(key) {
    let contentKey = `content.${key}`;
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty(key) {
    let contentKey = `content.${key}`;
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty(key) {
    let content = get(this, 'content');
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

    let content = get(this, 'content');
    assert(`Cannot delegate set('${key}', ${value}) to the \'content\' property of object proxy ${this}: its 'content' is undefined.`, content);

    return set(content, key, value);
  }
});

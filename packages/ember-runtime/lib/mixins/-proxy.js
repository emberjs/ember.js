/**
@module ember
@submodule ember-runtime
*/

import { CachedTag, DirtyableTag, UpdatableTag } from '@glimmer/reference';
import {
  assert,
  deprecate
} from 'ember-debug';
import {
  get,
  set,
  meta,
  on,
  addObserver,
  removeObserver,
  _addBeforeObserver,
  _removeBeforeObserver,
  propertyWillChange,
  propertyDidChange,
  defineProperty,
  Mixin,
  observer,
  tagFor,
} from 'ember-metal';
import { bool } from '../computed/computed_macros';

function contentPropertyWillChange(content, contentKey) {
  let key = contentKey.slice(8); // remove "content."
  if (key in this) { return; }  // if shadowed in proxy
  propertyWillChange(this, key);
}

function contentPropertyDidChange(content, contentKey) {
  let key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
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
  to a proxied `content` object.  See Ember.ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
  @private
*/
export default Mixin.create({
  /**
    The object whose properties will be forwarded.

    @property content
    @type Ember.Object
    @default null
    @private
  */
  content: null,

  init() {
    this._super(...arguments);
    meta(this).setProxy();
  },

  _initializeTag: on('init', function() {
    meta(this)._tag = new ProxyTag(this);
  }),

  _contentDidChange: observer('content', function() {
    assert('Can\'t set Proxy\'s content to itself', get(this, 'content') !== this);
    tagFor(this).contentDidChange();
  }),

  isTruthy: bool('content'),

  _debugContainerKey: null,

  willWatchProperty(key) {
    let contentKey = `content.${key}`;
    _addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty(key) {
    let contentKey = `content.${key}`;
    _removeBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty(key) {
    let content = get(this, 'content');
    if (content) {
      deprecate(
        `You attempted to access \`${key}\` from \`${this}\`, but object proxying is deprecated. Please use \`model.${key}\` instead.`,
        !this.isController,
        { id: 'ember-runtime.controller-proxy', until: '3.0.0' }
      );
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

    deprecate(
      `You attempted to set \`${key}\` from \`${this}\`, but object proxying is deprecated. Please use \`model.${key}\` instead.`,
      !this.isController,
      { id: 'ember-runtime.controller-proxy', until: '3.0.0' }
    );
    return set(content, key, value);
  }
});

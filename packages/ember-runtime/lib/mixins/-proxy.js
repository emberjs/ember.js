/**
@module ember
@submodule ember-runtime
*/

import { assert, deprecate } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { meta } from 'ember-metal/meta';
import {
  addObserver,
  removeObserver,
  _addBeforeObserver,
  _removeBeforeObserver
} from 'ember-metal/observer';
import {
  propertyWillChange,
  propertyDidChange
} from 'ember-metal/property_events';
import { bool } from '../computed/computed_macros';
import { POST_INIT } from '../system/core_object';
import { defineProperty } from 'ember-metal/properties';
import { Mixin, observer } from 'ember-metal/mixin';
import { tagFor } from 'ember-metal/tags';
import symbol from 'ember-metal/symbol';
import require, { has } from 'require';

const hasGlimmer = has('glimmer-reference');

const IS_PROXY = symbol('IS_PROXY');

export function isProxy(value) {
  return typeof value === 'object' && value && value[IS_PROXY];
}

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

/**
  `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See Ember.ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
  @private
*/
const PROXY_MIXIN_PROPS = {
  [IS_PROXY]: true,

  /**
    The object whose properties will be forwarded.

    @property content
    @type Ember.Object
    @default null
    @private
  */
  content: null,
  _contentDidChange: observer('content', function() {
    assert('Can\'t set Proxy\'s content to itself', get(this, 'content') !== this);
  }),

  isTruthy: bool('content'),

  _debugContainerKey: null,

  willWatchProperty(key) {
    let contentKey = 'content.' + key;
    _addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty(key) {
    let contentKey = 'content.' + key;
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
};

if (hasGlimmer) {
  let { CachedTag, DirtyableTag, UpdatableTag } = require('glimmer-reference');

  class ProxyTag extends CachedTag {
    constructor(proxy, content) {
      super();
      this.proxyWrapperTag = new DirtyableTag();
      this.proxyContentTag = new UpdatableTag(tagFor(content));
    }

    compute() {
      return Math.max(this.proxyWrapperTag.value(), this.proxyContentTag.value());
    }

    dirty() {
      this.proxyWrapperTag.dirty();
    }

    contentDidChange(content) {
      this.proxyContentTag.update(tagFor(content));
    }
  }

  PROXY_MIXIN_PROPS[POST_INIT] = function postInit() {
    this._super();
    meta(this)._tag = new ProxyTag(this, get(this, 'content'));
  };

  PROXY_MIXIN_PROPS._contentDidChange = observer('content', function() {
    assert('Can\'t set Proxy\'s content to itself', get(this, 'content') !== this);
    meta(this)._tag.contentDidChange(get(this, 'content'));
  });
}

export default Mixin.create(PROXY_MIXIN_PROPS);

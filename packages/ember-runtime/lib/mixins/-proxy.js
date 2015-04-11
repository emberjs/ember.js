/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.assert
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { meta } from "ember-metal/utils";
import {
  addObserver,
  removeObserver,
  addBeforeObserver,
  removeBeforeObserver
} from "ember-metal/observer";
import {
  propertyWillChange,
  propertyDidChange
} from "ember-metal/property_events";
import { computed } from "ember-metal/computed";
import { defineProperty } from "ember-metal/properties";
import { Mixin, observer } from "ember-metal/mixin";

function contentPropertyWillChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; }  // if shadowed in proxy
  propertyWillChange(this, key);
}

function contentPropertyDidChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
}

/**
  `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See Ember.ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
*/
export default Mixin.create({
  /**
    The object whose properties will be forwarded.

    @property content
    @type Ember.Object
    @default null
  */
  content: null,
  _contentDidChange: observer('content', function() {
    Ember.assert("Can't set Proxy's content to itself", get(this, 'content') !== this);
  }),

  isTruthy: computed.bool('content'),

  _debugContainerKey: null,

  willWatchProperty(key) {
    var contentKey = 'content.' + key;
    addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty(key) {
    var contentKey = 'content.' + key;
    removeBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty(key) {
    var content = get(this, 'content');
    if (content) {
      Ember.deprecate(
        `You attempted to access "${key}" from "${this}", but object proxying is deprecated. ` +
        `Please use "model.${key}" instead.`,
        !this.isController
      );
      return get(content, key);
    }
  },

  setUnknownProperty(key, value) {
    var m = meta(this);
    if (m.proto === this) {
      // if marked as prototype then just defineProperty
      // rather than delegate
      defineProperty(this, key, null, value);
      return value;
    }

    var content = get(this, 'content');
    Ember.assert(`Cannot delegate set("${key}", ${value}) to the "content" property of` +
                 ` object proxy ${this}: its "content" is undefined.`, content);

    Ember.deprecate(
      `You attempted to set "${key}" from "${this}", but object proxying is deprecated. ` +
      `Please use "model.${key}" instead.`,
      !this.isController
    );
    return set(content, key, value);
  }

});

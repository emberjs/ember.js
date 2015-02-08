/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.assert

import { get } from "ember-metal/property_get";
import {
  guidFor,
  typeOf
} from "ember-metal/utils";
import { forEach } from "ember-metal/enumerable_utils";
import { indexOf } from "ember-metal/array";
import EmberArray from "ember-runtime/mixins/array"; // ES6TODO: WAT? Circular dep?
import EmberObject from "ember-runtime/system/object";
import { computed } from "ember-metal/computed";
import {
  addObserver,
  addBeforeObserver,
  removeBeforeObserver,
  removeObserver
} from "ember-metal/observer";
import { watchedEvents } from "ember-metal/events";
import { defineProperty } from "ember-metal/properties";
import {
  beginPropertyChanges,
  propertyDidChange,
  propertyWillChange,
  endPropertyChanges,
  changeProperties
} from "ember-metal/property_events";

var EachArray = EmberObject.extend(EmberArray, {

  init: function(content, keyName, owner) {
    this._super.apply(this, arguments);
    this._keyName = keyName;
    this._owner   = owner;
    this._content = content;
  },

  objectAt: function(idx) {
    var item = this._content.objectAt(idx);
    return item && get(item, this._keyName);
  },

  length: computed(function() {
    var content = this._content;
    return content ? get(content, 'length') : 0;
  })

});

var IS_OBSERVER = /^.+:(before|change)$/;

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects;
  var guid;
  if (!objects) {
    objects = proxy._objects = {};
  }

  while (--loc >= idx) {
    var item = content.objectAt(loc);
    if (item) {
      Ember.assert('When using @each to observe the array ' + content + ', the array must return an object', typeOf(item) === 'instance' || typeOf(item) === 'object');
      addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      addObserver(item, keyName, proxy, 'contentKeyDidChange');

      // keep track of the index each item was found at so we can map
      // it back when the obj changes.
      guid = guidFor(item);
      if (!objects[guid]) {
        objects[guid] = [];
      }

      objects[guid].push(loc);
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects;
  if (!objects) {
    objects = proxy._objects = {};
  }

  var indices, guid;

  while (--loc >= idx) {
    var item = content.objectAt(loc);
    if (item) {
      removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');

      guid = guidFor(item);
      indices = objects[guid];
      indices[indexOf.call(indices, loc)] = null;
    }
  }
}

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.

  @private
  @class EachProxy
  @namespace Ember
  @extends Ember.Object
*/
var EachProxy = EmberObject.extend({

  init: function(content) {
    this._super.apply(this, arguments);
    this._content = content;
    content.addArrayObserver(this);

    // in case someone is already observing some keys make sure they are
    // added
    forEach(watchedEvents(this), function(eventName) {
      this.didAddListener(eventName);
    }, this);
  },

  /**
    You can directly access mapped properties by simply requesting them.
    The `unknownProperty` handler will generate an EachArray of each item.

    @method unknownProperty
    @param keyName {String}
    @param value {*}
  */
  unknownProperty: function(keyName, value) {
    var ret;
    ret = new EachArray(this._content, keyName, this);
    defineProperty(this, keyName, null, ret);
    this.beginObservingContentKey(keyName);
    return ret;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys;
    var key, lim;

    lim = removedCnt>0 ? idx+removedCnt : -1;
    beginPropertyChanges(this);

    for (key in keys) {
      if (!keys.hasOwnProperty(key)) { continue; }

      if (lim>0) { removeObserverForContentKey(content, key, this, idx, lim); }

      propertyWillChange(this, key);
    }

    propertyWillChange(this._content, '@each');
    endPropertyChanges(this);
  },

  arrayDidChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys;
    var lim;

    lim = addedCnt>0 ? idx+addedCnt : -1;
    changeProperties(function() {
      for (var key in keys) {
        if (!keys.hasOwnProperty(key)) { continue; }

        if (lim>0) { addObserverForContentKey(content, key, this, idx, lim); }

        propertyDidChange(this, key);
      }

      propertyDidChange(this._content, '@each');
    }, this);
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  didAddListener: function(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.beginObservingContentKey(eventName.slice(0, -7));
    }
  },

  didRemoveListener: function(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.stopObservingContentKey(eventName.slice(0, -7));
    }
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey: function(keyName) {
    var keys = this._keys;
    if (!keys) {
      keys = this._keys = {};
    }

    if (!keys[keyName]) {
      keys[keyName] = 1;
      var content = this._content;
      var len = get(content, 'length');

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey: function(keyName) {
    var keys = this._keys;
    if (keys && (keys[keyName]>0) && (--keys[keyName]<=0)) {
      var content = this._content;
      var len     = get(content, 'length');

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange: function(obj, keyName) {
    propertyWillChange(this, keyName);
  },

  contentKeyDidChange: function(obj, keyName) {
    propertyDidChange(this, keyName);
  }
});

export {
  EachArray,
  EachProxy
};

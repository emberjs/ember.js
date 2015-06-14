/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.assert

import { get } from 'ember-metal/property_get';
import { guidFor } from 'ember-metal/utils';
import { typeOf } from 'ember-runtime/utils';
import EmberArray from 'ember-runtime/mixins/array'; // ES6TODO: WAT? Circular dep?
import EmberObject from 'ember-runtime/system/object';
import { computed } from 'ember-metal/computed';
import {
  addObserver,
  _addBeforeObserver,
  _removeBeforeObserver,
  removeObserver
} from 'ember-metal/observer';
import { watchedEvents } from 'ember-metal/events';
import { defineProperty } from 'ember-metal/properties';
import {
  beginPropertyChanges,
  propertyDidChange,
  propertyWillChange,
  endPropertyChanges,
  changeProperties
} from 'ember-metal/property_events';

var EachArray = EmberObject.extend(EmberArray, {

  init(attr) {
    this._super(...arguments);
    this._keyName = attr.keyName;
    this._owner   = attr.owner;
    this._content = attr.content;
  },

  objectAt(idx) {
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
      _addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
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
      _removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');

      guid = guidFor(item);
      indices = objects[guid];
      indices[indices.indexOf(loc)] = null;
    }
  }
}

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.
  @class EachProxy
  @private
*/
var EachProxy = EmberObject.extend({
  init(attrs) {
    this._super(...arguments);
    this._content = attrs.content;

    this._content.addArrayObserver(this);

    // in case someone is already observing some keys make sure they are
    // added
    watchedEvents(this).forEach((eventName) => {
      this.didAddListener(eventName);
    });
  },

  /**
    You can directly access mapped properties by simply requesting them.
    The `unknownProperty` handler will generate an EachArray of each item.

    @method unknownProperty
    @param keyName {String}
    @param value {*}
    @private
  */
  unknownProperty(keyName, value) {
    var ret = new EachArray({
      content: this._content,
      keyName: keyName,
      owner: this
    });
    defineProperty(this, keyName, null, ret);
    this.beginObservingContentKey(keyName);
    return ret;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content, idx, removedCnt, addedCnt) {
    var keys = this._keys;
    var key, lim;

    lim = removedCnt > 0 ? idx + removedCnt : -1;
    beginPropertyChanges(this);

    for (key in keys) {
      if (!keys.hasOwnProperty(key)) { continue; }

      if (lim > 0) { removeObserverForContentKey(content, key, this, idx, lim); }

      propertyWillChange(this, key);
    }

    propertyWillChange(this._content, '@each');
    endPropertyChanges(this);
  },

  arrayDidChange(content, idx, removedCnt, addedCnt) {
    var keys = this._keys;
    var lim;

    lim = addedCnt > 0 ? idx + addedCnt : -1;
    changeProperties(function() {
      for (var key in keys) {
        if (!keys.hasOwnProperty(key)) { continue; }

        if (lim > 0) { addObserverForContentKey(content, key, this, idx, lim); }

        propertyDidChange(this, key);
      }

      propertyDidChange(this._content, '@each');
    }, this);
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  didAddListener(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.beginObservingContentKey(eventName.slice(0, -7));
    }
  },

  didRemoveListener(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.stopObservingContentKey(eventName.slice(0, -7));
    }
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName) {
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

  stopObservingContentKey(keyName) {
    var keys = this._keys;
    if (keys && (keys[keyName] > 0) && (--keys[keyName]<=0)) {
      var content = this._content;
      var len     = get(content, 'length');

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange(obj, keyName) {
    propertyWillChange(this, keyName);
  },

  contentKeyDidChange(obj, keyName) {
    propertyDidChange(this, keyName);
  }
});

export {
  EachArray,
  EachProxy
};

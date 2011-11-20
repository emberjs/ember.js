// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/system/object');
require('sproutcore-runtime/mixins/array');



var set = SC.set, get = SC.get, guidFor = SC.guidFor;

var EachArray = SC.Object.extend(SC.Array, {

  init: function(content, keyName, owner) {
    this._super();
    this._keyName = keyName;
    this._owner   = owner;
    this._content = content;
  },

  objectAt: function(idx) {
    var item = this._content.objectAt(idx);
    return item && get(item, this._keyName);
  },

  length: SC.computed(function() {
    var content = this._content;
    return content ? get(content, 'length') : 0;
  }).property('[]').cacheable()

});

var IS_OBSERVER = /^.+:(before|change)$/;

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects, guid;
  if (!objects) objects = proxy._objects = {};

  while(--loc>=idx) {
    var item = content.objectAt(loc);
    if (item) {
      SC.addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      SC.addObserver(item, keyName, proxy, 'contentKeyDidChange');

      // keep track of the indicies each item was found at so we can map
      // it back when the obj changes.
      guid = guidFor(item);
      if (!objects[guid]) objects[guid] = [];
      objects[guid].push(loc);
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects;
  if (!objects) objects = proxy._objects = {};
  var indicies, guid;

  while(--loc>=idx) {
    var item = content.objectAt(loc);
    if (item) {
      SC.removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      SC.removeObserver(item, keyName, proxy, 'contentKeyDidChange');

      guid = guidFor(item);
      indicies = objects[guid];
      indicies[indicies.indexOf(loc)] = null;
    }
  }
}

/**
  @private
  @class

  This is the object instance returned when you get the @each property on an
  array.  It uses the unknownProperty handler to automatically create
  EachArray instances for property names.

  @extends SC.Object
*/
SC.EachProxy = SC.Object.extend({

  init: function(content) {
    this._super();
    this._content = content;
    content.addArrayObserver(this);

    // in case someone is already observing some keys make sure they are
    // added
    SC.watchedEvents(this).forEach(function(eventName) {
      this.didAddListener(eventName);
    }, this);
  },

  /**
    You can directly access mapped properties by simply requesting them.
    The unknownProperty handler will generate an EachArray of each item.
  */
  unknownProperty: function(keyName, value) {
    var ret;
    ret = new EachArray(this._content, keyName, this);
    new SC.Descriptor().setup(this, keyName, ret);
    this.beginObservingContentKey(keyName);
    return ret;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys, key, array, lim;

    lim = removedCnt>0 ? idx+removedCnt : -1;
    SC.beginPropertyChanges(this);
    for(key in keys) {
      if (!keys.hasOwnProperty(key)) continue;

      if (lim>0) removeObserverForContentKey(content, key, this, idx, lim);

      array = get(this, key);
      SC.propertyWillChange(this, key);
      if (array) array.arrayContentWillChange(idx, removedCnt, addedCnt);
    }

    SC.propertyWillChange(this._content, '@each');
    SC.endPropertyChanges(this);
  },

  arrayDidChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys, key, array, lim;

    lim = addedCnt>0 ? idx+addedCnt : -1;
    SC.beginPropertyChanges(this);
    for(key in keys) {
      if (!keys.hasOwnProperty(key)) continue;

      if (lim>0) addObserverForContentKey(content, key, this, idx, lim);

      array = get(this, key);
      if (array) array.arrayContentDidChange(idx, removedCnt, addedCnt);
      SC.propertyDidChange(this, key);
    }
    SC.propertyDidChange(this._content, '@each');
    SC.endPropertyChanges(this);
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
    if (!keys) keys = this._keys = {};
    if (!keys[keyName]) {
      keys[keyName] = 1;
      var content = this._content,
          len = get(content, 'length');
      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey: function(keyName) {
    var keys = this._keys;
    if (keys && (keys[keyName]>0) && (--keys[keyName]<=0)) {
      var content = this._content,
          len     = get(content, 'length');
      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange: function(obj, keyName) {
    // notify array.
    var indexes = this._objects[guidFor(obj)],
        array   = get(this, keyName),
        len = array && indexes ? indexes.length : 0, idx;

    for(idx=0;idx<len;idx++) {
      array.arrayContentWillChange(indexes[idx], 1, 1);
    }
  },

  contentKeyDidChange: function(obj, keyName) {
    // notify array.
    var indexes = this._objects[guidFor(obj)],
        array   = get(this, keyName),
        len = array && indexes ? indexes.length : 0, idx;

    for(idx=0;idx<len;idx++) {
      array.arrayContentDidChange(indexes[idx], 1, 1);
    }

    SC.propertyDidChange(this, keyName);
  }

});



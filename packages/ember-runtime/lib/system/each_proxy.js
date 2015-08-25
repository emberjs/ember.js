import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import {
  _addBeforeObserver,
  _removeBeforeObserver,
  addObserver,
  removeObserver
} from 'ember-metal/observer';
import {
  propertyDidChange,
  propertyWillChange
} from 'ember-metal/property_events';
import EmptyObject from 'ember-metal/empty_object';

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.
  @class EachProxy
  @private
*/
function EachProxy(content) {
  this._content = content;
  this._keys = undefined;
  this.__ember_meta__ = undefined;
}

EachProxy.prototype = {
  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = removedCnt > 0 ? idx + removedCnt : -1;
    for (let key in keys) {
      if (lim > 0) {
        removeObserverForContentKey(content, key, this, idx, lim);
      }
      propertyWillChange(this, key);
    }
  },

  arrayDidChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = addedCnt > 0 ? idx + addedCnt : -1;
    for (let key in keys) {
      if (lim > 0) {
        addObserverForContentKey(content, key, this, idx, lim);
      }
      propertyDidChange(this, key);
    }
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  willWatchProperty(property) {
    this.beginObservingContentKey(property);
  },

  didUnwatchProperty(property) {
    this.stopObservingContentKey(property);
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName) {
    let keys = this._keys;
    if (!keys) {
      keys = this._keys = new EmptyObject();
    }

    if (!keys[keyName]) {
      keys[keyName] = 1;
      let content = this._content;
      let len = get(content, 'length');

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey(keyName) {
    let keys = this._keys;
    if (keys && (keys[keyName] > 0) && (--keys[keyName] <= 0)) {
      let content = this._content;
      let len     = get(content, 'length');

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange(obj, keyName) {
    propertyWillChange(this, keyName);
  },

  contentKeyDidChange(obj, keyName) {
    propertyDidChange(this, keyName);
  }
};

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = content.objectAt(loc);
    if (item) {
      assert('When using @each to observe the array ' + content + ', the array must return an object', typeof item === 'object');
      _addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      addObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = content.objectAt(loc);
    if (item) {
      _removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

export default EachProxy;

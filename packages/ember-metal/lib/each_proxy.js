import { assert } from '@ember/debug';
import { notifyPropertyChange } from './property_events';
import { addObserver, removeObserver } from './observer';
import { meta, peekMeta } from './meta';
import { objectAt } from './array';

const EACH_PROXIES = new WeakMap();

export function eachProxyFor(array) {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy === undefined) {
    eachProxy = new EachProxy(array);
    EACH_PROXIES.set(array, eachProxy);
  }
  return eachProxy;
}

export function eachProxyArrayWillChange(array, idx, removedCnt, addedCnt) {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayWillChange(array, idx, removedCnt, addedCnt);
  }
}

export function eachProxyArrayDidChange(array, idx, removedCnt, addedCnt) {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayDidChange(array, idx, removedCnt, addedCnt);
  }
}

class EachProxy {
  constructor(content) {
    this._content = content;
    this._keys = undefined;
    meta(this);
  }

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content, idx, removedCnt /*, addedCnt */) {
    // eslint-disable-line no-unused-vars
    let keys = this._keys;
    let lim = removedCnt > 0 ? idx + removedCnt : -1;
    if (lim > 0) {
      for (let key in keys) {
        removeObserverForContentKey(content, key, this, idx, lim);
      }
    }
  }

  arrayDidChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = addedCnt > 0 ? idx + addedCnt : -1;
    let meta = peekMeta(this);
    for (let key in keys) {
      if (lim > 0) {
        addObserverForContentKey(content, key, this, idx, lim);
      }
      notifyPropertyChange(this, key, meta);
    }
  }

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  willWatchProperty(property) {
    this.beginObservingContentKey(property);
  }

  didUnwatchProperty(property) {
    this.stopObservingContentKey(property);
  }

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName) {
    let keys = this._keys;
    if (keys === undefined) {
      keys = this._keys = Object.create(null);
    }

    if (!keys[keyName]) {
      keys[keyName] = 1;
      let content = this._content;
      let len = content.length;

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  }

  stopObservingContentKey(keyName) {
    let keys = this._keys;
    if (keys !== undefined && keys[keyName] > 0 && --keys[keyName] <= 0) {
      let content = this._content;
      let len = content.length;

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  }

  contentKeyDidChange(obj, keyName) {
    notifyPropertyChange(this, keyName);
  }
}

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      assert(
        `When using @each to observe the array \`${toString(
          content
        )}\`, the array must return an object`,
        typeof item === 'object'
      );
      addObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

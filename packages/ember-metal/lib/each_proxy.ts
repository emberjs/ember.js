import { assert } from '@ember/debug';
import { meta, peekMeta } from 'ember-meta';
import { EmberArray, objectAt } from './array';
import { EACH_PROXIES } from './each_proxy_events';
import { addObserver, removeObserver } from './observer';
import { notifyPropertyChange } from './property_events';

export function eachProxyFor<T>(array: T[] | EmberArray<T>): EachProxy<T> {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy === undefined) {
    eachProxy = new EachProxy(array);
    EACH_PROXIES.set(array, eachProxy);
  }
  return eachProxy;
}

class EachProxy<T> {
  private readonly _content: T[] | EmberArray<T>;
  private _keys: { [key: string]: number } | undefined;

  constructor(content: T[] | EmberArray<T>) {
    this._content = content;
    this._keys = undefined;
    meta(this);
  }

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content: T[] | EmberArray<T>, idx: number, removedCnt: number /*, addedCnt */) {
    // eslint-disable-line no-unused-vars
    let keys = this._keys;
    if (!keys) {
      return;
    }
    let lim = removedCnt > 0 ? idx + removedCnt : -1;
    if (lim > 0) {
      for (let key in keys) {
        removeObserverForContentKey(content, key, this, idx, lim);
      }
    }
  }

  arrayDidChange(content: T[] | EmberArray<T>, idx: number, _removedCnt: number, addedCnt: number) {
    let keys = this._keys;
    if (!keys) {
      return;
    }
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

  willWatchProperty(property: string): void {
    this.beginObservingContentKey(property);
  }

  didUnwatchProperty(property: string): void {
    this.stopObservingContentKey(property);
  }

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName: string): void {
    let keys = this._keys;
    if (keys === undefined) {
      keys = this._keys = Object.create(null);
    }

    if (!keys![keyName]) {
      keys![keyName] = 1;
      let content = this._content;
      let len = content.length;

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys![keyName]++;
    }
  }

  stopObservingContentKey(keyName: string): void {
    let keys = this._keys;
    if (keys !== undefined && keys[keyName] > 0 && --keys[keyName] <= 0) {
      let content = this._content;
      let len = content.length;

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  }

  contentKeyDidChange(_obj: object, keyName: string): void {
    notifyPropertyChange(this, keyName);
  }
}

function addObserverForContentKey<T>(
  content: T[] | EmberArray<T>,
  keyName: string,
  proxy: object | Function,
  idx: number,
  loc: number
) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      assert(
        `When using @each to observe the array \`${content.toString()}\`, the array must return an object`,
        typeof item === 'object'
      );
      addObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

function removeObserverForContentKey<T>(
  content: T[] | EmberArray<T>,
  keyName: string,
  proxy: object | Function,
  idx: number,
  loc: number
): void {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

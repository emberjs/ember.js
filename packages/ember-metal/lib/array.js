import { notifyPropertyChange } from './property_events';
import {
  eachProxyArrayDidChange,
  eachProxyArrayWillChange
} from './each_proxy';
import { peekMeta } from './meta';
import { sendEvent, removeListener, addListener } from './events';
import { peekCacheFor } from './computed';
import { get } from './property_get';

const EMPTY_ARRAY = Object.freeze([]);

export function objectAt(array, index) {
  if (Array.isArray(array)) {
    return array[index];
  } else {
    return array.objectAt(index);
  }
}

export function replace(array, start, deleteCount, items = EMPTY_ARRAY) {
  if (Array.isArray(array)) {
    replaceInNativeArray(array, start, deleteCount, items);
  } else {
    array.replace(start, deleteCount, items);
  }
}

const CHUNK_SIZE = 60000;

// To avoid overflowing the stack, we splice up to CHUNK_SIZE items at a time.
// See https://code.google.com/p/chromium/issues/detail?id=56588 for more details.
export function replaceInNativeArray(array, start, deleteCount, items) {
  arrayContentWillChange(array, start, deleteCount, items.length);

  if (items.length <= CHUNK_SIZE) {
    array.splice(start, deleteCount, ...items);
  } else {
    array.splice(start, deleteCount);

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      let chunk = items.slice(i, i + CHUNK_SIZE);
      array.splice(start + i, 0, ...chunk);
    }
  }

  arrayContentDidChange(array, start, deleteCount, items.length);
}

function arrayObserversHelper(obj, target, opts, operation, notify) {
  let willChange = (opts && opts.willChange) || 'arrayWillChange';
  let didChange = (opts && opts.didChange) || 'arrayDidChange';
  let hasObservers = get(obj, 'hasArrayObservers');

  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);

  if (hasObservers === notify) {
    notifyPropertyChange(obj, 'hasArrayObservers');
  }

  return obj;
}

export function addArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, addListener, false);
}

export function removeArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, removeListener, true);
}

export function arrayContentWillChange(array, startIdx, removeAmt, addAmt) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }

    if (addAmt === undefined) {
      addAmt = -1;
    }
  }

  eachProxyArrayWillChange(array, startIdx, removeAmt, addAmt);

  sendEvent(array, '@array:before', [array, startIdx, removeAmt, addAmt]);

  return array;
}

export function arrayContentDidChange(array, startIdx, removeAmt, addAmt) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }

    if (addAmt === undefined) {
      addAmt = -1;
    }
  }

  let meta = peekMeta(array);

  if (addAmt < 0 || removeAmt < 0 || addAmt - removeAmt !== 0) {
    notifyPropertyChange(array, 'length', meta);
  }

  notifyPropertyChange(array, '[]', meta);

  eachProxyArrayDidChange(array, startIdx, removeAmt, addAmt);

  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);

  let cache = peekCacheFor(array);
  if (cache !== undefined) {
    let length = get(array, 'length');
    let addedAmount = addAmt === -1 ? 0 : addAmt;
    let removedAmount = removeAmt === -1 ? 0 : removeAmt;
    let delta = addedAmount - removedAmount;
    let previousLength = length - delta;

    let normalStartIdx = startIdx < 0 ? previousLength + startIdx : startIdx;
    if (cache.has('firstObject') && normalStartIdx === 0) {
      notifyPropertyChange(array, 'firstObject', meta);
    }

    if (cache.has('lastObject')) {
      let previousLastIndex = previousLength - 1;
      let lastAffectedIndex = normalStartIdx + removedAmount;
      if (previousLastIndex < lastAffectedIndex) {
        notifyPropertyChange(array, 'lastObject', meta);
      }
    }
  }

  return array;
}

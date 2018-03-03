import { notifyPropertyChange } from "./property_events";
import { eachProxyArrayDidChange, eachProxyArrayWillChange } from "./each_proxy";
import { peekMeta } from "./meta";
import { sendEvent, removeListener, addListener } from "./events";
import { peekCacheFor } from "./computed";
import { get } from "./property_get";

export function objectAt(content, idx) {
  if (typeof content.objectAt === 'function') {
    return content.objectAt(idx);
  } else {
    return content[idx];
  }
}

function arrayObserversHelper(obj, target, opts, operation, notify) {
  let willChange = (opts && opts.willChange) || 'arrayWillChange';
  let didChange  = (opts && opts.didChange) || 'arrayDidChange';
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

  if (addAmt < 0 || removeAmt < 0 || addAmt - removeAmt !== 0) {
    notifyPropertyChange(array, 'length');
  }

  notifyPropertyChange(array, '[]');

  eachProxyArrayDidChange(array, startIdx, removeAmt, addAmt);

  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);

  let meta = peekMeta(array);
  let cache = peekCacheFor(array);
  if (cache !== undefined) {
    let length = get(array, 'length');
    let addedAmount = (addAmt === -1 ? 0 : addAmt);
    let removedAmount = (removeAmt === -1 ? 0 : removeAmt);
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

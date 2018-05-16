import { peekMeta } from 'ember-meta';
import { peekCacheFor } from './computed_cache';
import { eachProxyArrayDidChange, eachProxyArrayWillChange } from './each_proxy_events';
import { sendEvent } from './events';
import { notifyPropertyChange } from './property_events';

export function arrayContentWillChange(
  array: object,
  startIdx: number,
  removeAmt: number,
  addAmt: number
) {
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

export function arrayContentDidChange(
  array: { length: number },
  startIdx: number,
  removeAmt: number,
  addAmt: number
) {
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
    let length = array.length;
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

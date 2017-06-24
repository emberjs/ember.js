/*
 When we render a rich template hierarchy, the set of events that
 *might* happen tends to be much larger than the set of events that
 actually happen. This implies that we should make listener creation &
 destruction cheap, even at the cost of making event dispatch more
 expensive.

 Thus we store a new listener with a single push and no new
 allocations, without even bothering to do deduplication -- we can
 save that for dispatch time, if an event actually happens.
 */

/* listener flags */
export const ONCE = 1;
export const SUSPENDED = 2;

export const protoMethods = {

  addToListeners(eventName, target, method, flags) {
    if (this._listeners === undefined) {
      this._listeners = [];
    }
    this._listeners.push(eventName, target, method, flags);
  },

  _finalizeListeners() {
    if (this._listenersFinalized) { return; }
    if (this._listeners === undefined) { this._listeners = []; }
    let pointer = this.parent;
    while (pointer !== undefined) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        this._listeners = this._listeners.concat(listeners);
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
    this._listenersFinalized = true;
  },

  removeFromListeners(eventName, target, method, didRemove) {
    let pointer = this;
    while (pointer !== undefined) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        for (let index = listeners.length - 4; index >= 0; index -= 4) {
          if (listeners[index] === eventName && (!method || (listeners[index + 1] === target && listeners[index + 2] === method))) {
            if (pointer === this) {
              // we are modifying our own list, so we edit directly
              if (typeof didRemove === 'function') {
                didRemove(eventName, target, listeners[index + 2]);
              }
              listeners.splice(index, 4);
            } else {
              // we are trying to remove an inherited listener, so we do
              // just-in-time copying to detach our own listeners from
              // our inheritance chain.
              this._finalizeListeners();
              return this.removeFromListeners(eventName, target, method);
            }
          }
        }
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
  },

  matchingListeners(eventName) {
    let pointer = this;
    let result;
    while (pointer !== undefined) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        for (let index = 0; index < listeners.length - 3; index += 4) {
          if (listeners[index] === eventName) {
            result = result || [];
            pushUniqueListener(result, listeners, index);
          }
        }
      }
      if (pointer._listenersFinalized === true) { break; }
      pointer = pointer.parent;
    }
    let sus = this._suspendedListeners;
    if (sus !== undefined && result !== undefined) {
      for (let susIndex = 0; susIndex < sus.length - 2; susIndex += 3) {
        if (eventName === sus[susIndex]) {
          for (let resultIndex = 0; resultIndex < result.length - 2; resultIndex += 3) {
            if (result[resultIndex] === sus[susIndex + 1] && result[resultIndex + 1] === sus[susIndex + 2]) {
              result[resultIndex + 2] |= SUSPENDED;
            }
          }
        }
      }
    }
    return result;
  },

  suspendListeners(eventNames, target, method, callback) {
    let sus = this._suspendedListeners;
    if (!sus) {
      sus = this._suspendedListeners = [];
    }
    for (let i = 0; i < eventNames.length; i++) {
      sus.push(eventNames[i], target, method);
    }
    try {
      return callback.call(target);
    } finally {
      if (sus.length === eventNames.length) {
        this._suspendedListeners = undefined;
      } else {
        for (let i = sus.length - 3; i >= 0; i -= 3) {
          if (sus[i + 1] === target && sus[i + 2] === method && eventNames.indexOf(sus[i]) !== -1) {
            sus.splice(i, 3);
          }
        }
      }
    }
  },

  watchedEvents() {
    let pointer = this;
    let names = {};
    while (pointer !== undefined) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        for (let index = 0; index < listeners.length - 3; index += 4) {
          names[listeners[index]] = true;
        }
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
    return Object.keys(names);
  }
};

function pushUniqueListener(destination, source, index) {
  let target = source[index + 1];
  let method = source[index + 2];
  for (let destinationIndex = 0; destinationIndex < destination.length - 2; destinationIndex += 3) {
    if (destination[destinationIndex] === target && destination[destinationIndex + 1] === method) {
      return;
    }
  }
  destination.push(target, method, source[index + 3]);
}

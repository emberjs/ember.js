/*
  observerMap = {
    [sender] : {
      [keyMap] : [ target, method, flags ] // listeners
    }
  }
*/

export default class ObserverSet {
  constructor() {
    this.observerMap = new Map();
  }

  add(sender, keyName) {
    let keyMap = this.observerMap.get(sender);

    let listeners;
    if (keyMap === undefined) {
      keyMap = new Map();
      this.observerMap.set(sender, keyMap);
    } else {
      listeners = keyMap.get(keyName);
    }

    if (listeners === undefined) {
      listeners = [];
      keyMap.set(keyName, listeners);
    }

    return listeners;
  }

  forEach(cb) {
    this.observerMap.forEach(function(keyMap, sender) {
      keyMap.forEach(function(listeners, keyName) {
        cb(sender, keyName, listeners);
      });
    });
  }

  clear() {
    this.observerMap.clear();
  }
}

import { sendEvent } from './events';

/*
  this.observerMap = {
    [senderGuid]: { // variable name: `keyMap`
      [keyName]: listIndex
    }
  },
  this.observers = [
    {
      sender: obj,
      keyName: keyName,
      eventName: eventName,
      listeners: [
        [target, method, flags]
      ]
    },
    ...
  ]
*/
export default class ObserverSet {
  constructor() {
    this.observerMap = new Map();
    this.observers = [];
  }

  add(sender, keyName, eventName) {
    let observerMap = this.observerMap;
    let observers = this.observers;
    let keyMap = observerMap.get(sender);

    let index;
    if (keyMap === undefined) {
      keyMap = {};
      observerMap.set(sender, keyMap);
    } else {
      index = keyMap[keyName];
    }

    if (index === undefined) {
      index = observers.push(
        sender,
        keyName,
        eventName,
        [] // listeners
      ) - 4;

      keyMap[keyName] = index;
    }

    return observers[index + 3];
  }

  flush() {
    let observers = this.observers;
    let sender, keyName, eventName, listeners;
    this.clear();
    for (let i = 0; i < observers.length; i += 4) {
      sender = observers[i];
      if (sender.isDestroying || sender.isDestroyed) { continue; }
      keyName = observers[i + 1];
      eventName = observers[i + 2];
      listeners = observers[i + 3];
      sendEvent(sender, eventName, [sender, keyName], listeners);
    }
  }

  clear() {
    this.observerMap.clear();
    this.observers = [];
  }
}

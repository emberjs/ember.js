import { guidFor } from 'ember-utils';
import { sendEvent } from './events';

/*
  this.observerSet = {
    [senderGuid]: { // variable name: `keySet`
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
    this.clear();
  }

  add(sender, keyName, eventName) {
    let observerSet = this.observerSet;
    let observers = this.observers;
    let senderGuid = guidFor(sender);
    let keySet = observerSet[senderGuid];
    let index;

    if (!keySet) {
      observerSet[senderGuid] = keySet = {};
    }
    index = keySet[keyName];
    if (index === undefined) {
      index = observers.push({
        sender,
        keyName,
        eventName,
        listeners: []
      }) - 1;
      keySet[keyName] = index;
    }
    return observers[index].listeners;
  }

  flush() {
    let observers = this.observers;
    let i, observer, sender;
    this.clear();
    for (i = 0; i < observers.length; ++i) {
      observer = observers[i];
      sender = observer.sender;
      if (sender.isDestroying || sender.isDestroyed) { continue; }
      sendEvent(sender, observer.eventName, [sender, observer.keyName], observer.listeners);
    }
  }

  clear() {
    this.observerSet = {};
    this.observers = [];
  }
}

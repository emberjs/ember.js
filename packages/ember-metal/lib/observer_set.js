import { sendEvent } from './events';

export default class ObserverSet {
  constructor(postfix) {
    this.postfix = postfix || '';
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

  flush() {
    let postfix = this.postfix;
    this.observerMap.forEach(function(keyMap, sender) {
      keyMap.forEach(function(listeners, keyName) {
        if (sender.isDestroying || sender.isDestroyed) { return; }
        sendEvent(sender, keyName + postfix, [sender, keyName], listeners);
      });
    });
    this.clear();
  }

  clear() {
    this.observerMap.clear();
  }
}

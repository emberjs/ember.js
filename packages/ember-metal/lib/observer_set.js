import { sendEvent } from './events';

/**
  ObserverSet is a data structure used to keep track of observers
  that have been deferred.

  It ensures that observers are called in the same order that they
  were initially triggered.

  It also ensures that observers for any object-key pairs are called
  only once, even if they were triggered multiple times while
  deferred. In this case, the order that the observer is called in
  will depend on the first time the observer was triggered.

  @private
  @class ObserverSet
*/
export default class ObserverSet {
  constructor() {
    this.added = new Map();
    this.queue = [];
  }

  add(object, key, event) {
    let keys = this.added.get(object);
    if (keys === undefined) {
      keys = new Set();
      this.added.set(object, keys);
    }

    if (!keys.has(key)) {
      this.queue.push(object, key, event);
      keys.add(key);
    }
  }

  flush() {
    // The queue is saved off to support nested flushes.
    let queue = this.queue;
    this.added.clear();
    this.queue = [];

    for (let i = 0; i < queue.length; i += 3) {
      let object = queue[i];
      let key = queue[i + 1];
      let event = queue[i + 2];

      if (object.isDestroying || object.isDestroyed) {
        continue;
      }

      sendEvent(object, event, [object, key]);
    }
  }
}

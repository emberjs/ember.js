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

  add(object, key) {
    let keys = this.added.get(object);
    if (keys === undefined) {
      keys = new Set();
      this.added.set(object, keys);
    }

    if (!keys.has(key)) {
      this.queue.push({ object, key });
      keys.add(key);
    }
  }

  forEach(cb) {
    for (let i = 0; i < this.queue.length; i++) {
      let { object, key } = this.queue[i];

      if (object.isDestroying || object.isDestroyed) {
        continue;
      }

      cb(object, key);
    }
  }

  clear() {
    this.added.clear();
    this.queue.length = 0;
  }
}

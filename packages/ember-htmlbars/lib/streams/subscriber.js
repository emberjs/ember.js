import assign from 'ember-metal/assign';

/**
  @module ember-metal
*/

/**
  @private
  @class Subscriber
  @namespace Ember.streams
  @constructor
*/
export default function Subscriber(callback, context) {
  this.next = null;
  this.prev = null;
  this.callback = callback;
  this.context = context;
}

assign(Subscriber.prototype, {
  removeFrom(stream) {
    let next = this.next;
    let prev = this.prev;

    if (prev) {
      prev.next = next;
    } else {
      stream.subscriberHead = next;
    }

    if (next) {
      next.prev = prev;
    } else {
      stream.subscriberTail = prev;
    }

    stream.maybeDeactivate();
  }
});

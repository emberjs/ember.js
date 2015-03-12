import merge from "ember-metal/merge";
import { isStream } from 'ember-metal/streams/utils';

/**
  @module ember-metal
*/

/**
  @private
  @class Dependency
  @namespace Ember.streams
  @constructor
*/
function Dependency(dependent, stream, callback, context) {
  this.next = null;
  this.prev = null;
  this.dependent = dependent;
  this.stream = stream;
  this.callback = callback;
  this.context = context;
  this.unsubscription = null;
}

merge(Dependency.prototype, {
  subscribe() {
    this.unsubscribe = this.stream.subscribe(this.callback, this.context);
  },

  unsubscribe() {
    this.unsubscription();
    this.unsubscription = null;
  },

  removeFrom(stream) {
    var next = this.next;
    var prev = this.prev;

    if (prev) {
      prev.next = next;
    } else {
      stream.dependencyHead = next;
    }

    if (next) {
      next.prev = prev;
    } else {
      stream.dependencyTail = prev;
    }

    if (this.unsubscription) {
      this.unsubscribe();
    }
  },

  replace(stream, callback, context) {
    if (!isStream(stream)) {
      this.stream = null;
      this.callback = null;
      this.context = null;
      this.removeFrom(this.dependent);
      return null;
    }

    this.stream = stream;
    this.callback = callback;
    this.context = context;

    if (this.unsubscription) {
      this.unsubscribe();
      this.subscribe();
    }

    return this;
  }
});

export default Dependency;

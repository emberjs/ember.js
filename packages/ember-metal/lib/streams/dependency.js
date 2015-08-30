import { assert } from 'ember-metal/debug';
import merge from 'ember-metal/merge';
import {
  read,
  setValue,
  isStream,
  subscribe
} from 'ember-metal/streams/utils';

/**
  @module ember-metal
*/

/**
  @private
  @class Dependency
  @namespace Ember.streams
  @constructor
*/
function Dependency(depender, dependee) {
  assert('Dependency error: Depender must be a stream', isStream(depender));

  this.next = null;
  this.prev = null;
  this.depender = depender;
  this.dependee = dependee;
  this.unsubscription = null;
}

merge(Dependency.prototype, {
  subscribe() {
    assert('Dependency error: Dependency tried to subscribe while already subscribed', !this.unsubscription);

    this.unsubscription = subscribe(this.dependee, this.depender.notify, this.depender);
  },

  unsubscribe() {
    if (this.unsubscription) {
      this.unsubscription();
      this.unsubscription = null;
    }
  },

  replace(dependee) {
    if (this.dependee !== dependee) {
      this.dependee = dependee;

      if (this.unsubscription) {
        this.unsubscribe();
        this.subscribe();
      }
      return true;
    }
    return false;
  },

  getValue() {
    return read(this.dependee);
  },

  setValue(value) {
    return setValue(this.dependee, value);
  }

  // destroy() {
  //   var next = this.next;
  //   var prev = this.prev;

  //   if (prev) {
  //     prev.next = next;
  //   } else {
  //     this.depender.dependencyHead = next;
  //   }

  //   if (next) {
  //     next.prev = prev;
  //   } else {
  //     this.depender.dependencyTail = prev;
  //   }

  //   this.unsubscribe();
  // }
});

export default Dependency;

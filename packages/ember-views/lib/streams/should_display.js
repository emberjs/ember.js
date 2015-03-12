import create from 'ember-metal/platform/create';
import merge from "ember-metal/merge";
import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";
import Stream from "ember-metal/streams/stream";
import { isStream } from "ember-metal/streams/utils";

export default function shouldDisplay(predicate) {
  if (isStream(predicate)) {
    return new ShouldDisplayStream(predicate);
  }

  var truthy = predicate && get(predicate, 'isTruthy');
  if (typeof truthy === 'boolean') { return truthy; }

  if (isArray(predicate)) {
    return get(predicate, 'length') !== 0;
  } else {
    return !!predicate;
  }
}

function ShouldDisplayStream(predicate) {
  Ember.assert("ShouldDisplayStream error: predicate must be a stream", isStream(predicate));

  this.init();
  this.predicate = this.addDependency(predicate);
  this.isTruthy = this.addDependency(predicate.get('isTruthy'));
  this.length = null;
}

ShouldDisplayStream.prototype = create(Stream.prototype);

merge(ShouldDisplayStream.prototype, {
  compute() {
    var truthy = this.isTruthy.value();

    if (typeof truthy === 'boolean') {
      return truthy;
    }

    if (this.length) {
      return this.length.value() !== 0;
    } else {
      return !!this.predicate.value();
    }
  },

  revalidate() {
    if (isArray(this.predicate.value())) {
      if (!this.length) {
        this.length = this.addDependency(this.predicate.dependee.get('length'));
      }
    } else {
      if (this.length) {
        this.length.destroy();
        this.length = null;
      }
    }
  }
});

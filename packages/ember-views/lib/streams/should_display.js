import { assert } from 'ember-metal/debug';
import merge from 'ember-metal/merge';
import { get } from 'ember-metal/property_get';
import { isArray } from 'ember-runtime/utils';
import Stream from 'ember-metal/streams/stream';
import { read, isStream } from 'ember-metal/streams/utils';

export default function shouldDisplay(predicate) {
  if (isStream(predicate)) {
    return new ShouldDisplayStream(predicate);
  }

  var type = typeof predicate;

  if (type === 'boolean') { return predicate; }

  if (type && type === 'object' && predicate !== null) {
    var isTruthy = get(predicate, 'isTruthy');
    if (typeof isTruthy === 'boolean') {
      return isTruthy;
    }
  }

  if (isArray(predicate)) {
    return get(predicate, 'length') !== 0;
  } else {
    return !!predicate;
  }
}

function ShouldDisplayStream(predicate) {
  assert('ShouldDisplayStream error: predicate must be a stream', isStream(predicate));

  var isTruthy = predicate.get('isTruthy');

  this.init();
  this.predicate = predicate;
  this.isTruthy = isTruthy;
  this.lengthDep = null;

  this.addDependency(predicate);
  this.addDependency(isTruthy);
}

ShouldDisplayStream.prototype = Object.create(Stream.prototype);

merge(ShouldDisplayStream.prototype, {
  compute() {
    var truthy = read(this.isTruthy);

    if (typeof truthy === 'boolean') {
      return truthy;
    }

    if (this.lengthDep) {
      return this.lengthDep.getValue() !== 0;
    } else {
      return !!read(this.predicate);
    }
  },

  revalidate() {
    if (isArray(read(this.predicate))) {
      if (!this.lengthDep) {
        this.lengthDep = this.addMutableDependency(this.predicate.get('length'));
      }
    } else {
      if (this.lengthDep) {
        this.lengthDep.destroy();
        this.lengthDep = null;
      }
    }
  }
});

import Stream from "ember-metal/streams/stream";
import {
  read,
  isStream
} from "ember-metal/streams/utils";
import create from 'ember-metal/platform/create';
import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";

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

function ShouldDisplayStream(predicateStream) {
  this.init();
  this.oldPredicate = undefined;
  this.predicateStream = predicateStream;
  this.isTruthyStream = predicateStream.get('isTruthy');
  this.lengthStream = undefined;
  this.dependency = {
    predicate: this.addDependency(this.predicateStream),
    isTruthy: this.addDependency(this.isTruthyStream),
    length: null
  };
}

ShouldDisplayStream.prototype = create(Stream.prototype);

ShouldDisplayStream.prototype.revalidate = function() {
  var oldPredicate = this.oldPredicate;
  var newPredicate = read(this.predicateStream);
  var newIsArray = isArray(newPredicate);

  if (newPredicate !== oldPredicate) {
    if (this.lengthStream && !newIsArray) {
      this.dependency.length.removeFrom(this);
      this.dependency.length = null;
      this.lengthStream = undefined;
    }

    if (!this.lengthStream && newIsArray) {
      this.lengthStream = this.predicateStream.get('length');
      this.dependency.length = this.addDependency(this.lengthStream);
    }

    this.oldPredicate = newPredicate;
  }
};

ShouldDisplayStream.prototype.valueFn = function() {
  var truthy = read(this.isTruthyStream);
  if (typeof truthy === 'boolean') {
    return truthy;
  }

  if (this.lengthStream) {
    var length = read(this.lengthStream);
    return length !== 0;
  }

  return !!read(this.predicateStream);
};

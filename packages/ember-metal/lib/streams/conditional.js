import Stream from "ember-metal/streams/stream";
import {
  read,
  subscribe,
  unsubscribe,
  isStream
} from "ember-metal/streams/utils";
import create from "ember-metal/platform/create";

export default function conditional(test, consequent, alternate) {
  if (isStream(test)) {
    return new ConditionalStream(test, consequent, alternate);
  } else {
    if (test) {
      return consequent;
    } else {
      return alternate;
    }
  }
}

function ConditionalStream(test, consequent, alternate) {
  this.init();

  this.oldTestResult = undefined;
  this.test = test;
  this.consequent = consequent;
  this.alternate = alternate;
}

ConditionalStream.prototype = create(Stream.prototype);

ConditionalStream.prototype.valueFn = function() {
  var oldTestResult = this.oldTestResult;
  var newTestResult = !!read(this.test);

  if (newTestResult !== oldTestResult) {
    switch (oldTestResult) {
      case true: unsubscribe(this.consequent, this.notify, this); break;
      case false: unsubscribe(this.alternate, this.notify, this); break;
      case undefined: subscribe(this.test, this.notify, this);
    }

    switch (newTestResult) {
      case true: subscribe(this.consequent, this.notify, this); break;
      case false: subscribe(this.alternate, this.notify, this);
    }

    this.oldTestResult = newTestResult;
  }

  return newTestResult ? read(this.consequent) : read(this.alternate);
};

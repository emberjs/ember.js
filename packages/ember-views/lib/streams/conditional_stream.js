import Stream from "ember-metal/streams/stream";
import {
  read,
  subscribe,
  unsubscribe
} from "ember-metal/streams/utils";
import { create } from "ember-metal/platform";

function ConditionalStream(testFunc, testStream, consequent, alternate) {
  this.init();

  this.oldTestResult = undefined;
  this.testFunc = testFunc;
  this.testStream = testStream;
  this.consequent = consequent;
  this.alternate = alternate;
}

ConditionalStream.prototype = create(Stream.prototype);

ConditionalStream.prototype.valueFn = function() {
  var oldTestResult = this.oldTestResult;
  var newTestResult = !!this.testFunc(read(this.testStream));

  if (newTestResult !== oldTestResult) {
    switch (oldTestResult) {
      case true: unsubscribe(this.consequent, this.notify, this); break;
      case false: unsubscribe(this.alternate, this.notify, this); break;
      case undefined: subscribe(this.testStream, this.notify, this);
    }

    switch (newTestResult) {
      case true: subscribe(this.consequent, this.notify, this); break;
      case false: subscribe(this.alternate, this.notify, this);
    }

    this.oldTestResult = newTestResult;
  }

  return newTestResult ? read(this.consequent) : read(this.alternate);
};

export default ConditionalStream;

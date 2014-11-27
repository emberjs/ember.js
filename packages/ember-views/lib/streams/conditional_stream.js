import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/read";
import { create as o_create } from "ember-metal/platform";

function ConditionalStream(test, consequent, alternate) {
  this.init();
  this.oldTest = undefined;
  this.test = test;
  this.consequent = consequent;
  this.alternate = alternate;
}

ConditionalStream.prototype = o_create(Stream.prototype);

ConditionalStream.prototype._unsubscribe = function(value) {
  if (value && value.isStream) {
    value.unsubscribe(this.notify, this);
  }
};

ConditionalStream.prototype._subscribe = function(value) {
  if (value && value.isStream) {
    value.subscribe(this.notify, this);
  }
};

ConditionalStream.prototype.valueFn = function() {
  var test = !!read(this.test);

  if (this.oldTest === undefined) {
    if (this.test && this.test.isStream) {
      this.test.subscribe(this.notify, this);
    }
  }

  if (test !== this.oldTest) {
    if (this.oldTest) {
      this._unsubscribe(this.consequent);
    } else {
      this._unsubscribe(this.alternate);
    }
    if (test) {
      this._subscribe(this.consequent);
    } else {
      this._subscribe(this.alternate);
    }
    this.oldTest = test;
  }

  return test ? read(this.consequent) : read(this.alternate);
};

export default ConditionalStream;

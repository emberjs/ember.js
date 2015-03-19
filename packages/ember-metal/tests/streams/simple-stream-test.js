import Stream from "ember-metal/streams/stream";
import SimpleStream from "ember-metal/streams/simple-stream";

var source, value;

QUnit.module('SimpleStream', {
  setup() {
    value = "zlurp";

    source = new Stream(function() {
      return value;
    });

    source.setValue = function(_value) {
      value = _value;
      this.notify();
    };
  },
  teardown() {
    value = undefined;
    source = undefined;
  }
});

QUnit.skip('supports a stream argument', function() {
  var stream = new SimpleStream(source);
  equal(stream.value(), "zlurp");

  stream.setValue("blorg");
  equal(stream.value(), "blorg");
});

QUnit.skip('supports a non-stream argument', function() {
  var stream = new SimpleStream(value);
  equal(stream.value(), "zlurp");

  stream.setValue("blorg");
  equal(stream.value(), "zlurp");
});

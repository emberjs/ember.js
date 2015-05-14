import Stream from "ember-metal/streams/stream";
import ProxyStream from "ember-metal/streams/proxy-stream";

var source, value;

QUnit.module('ProxyStream', {
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

QUnit.test('supports a stream argument', function() {
  var stream = new ProxyStream(source);
  equal(stream.value(), "zlurp");

  stream.setValue("blorg");
  equal(stream.value(), "blorg");
});

QUnit.test('supports a non-stream argument', function() {
  var stream = new ProxyStream(value);
  equal(stream.value(), "zlurp");

  stream.setValue("blorg");
  equal(stream.value(), "zlurp");
});

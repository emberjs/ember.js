import Stream from "ember-metal/streams/stream";
import KeyStream from "ember-metal/streams/key-stream";

var source, value;

QUnit.module('KeyStream', {
  setup: function() {
    value = { foo: "zlurp" };

    source = new Stream(function() {
      return value;
    });

    source.setValue = function(_value) {
      value = _value;
      this.notify();
    };
  },
  teardown: function() {
    value = undefined;
    source = undefined;
  }
});

QUnit.test('can be instantiated manually', function() {
  var stream = new KeyStream(source, 'foo');
  equal(stream.value(), "zlurp");
});

QUnit.test('can be instantiated via `Stream.prototype.get`', function() {
  var stream = source.get('foo');
  equal(stream.value(), "zlurp");
});

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { mixin } from "ember-metal/mixin";
import run from 'ember-metal/run_loop';
import Stream from "ember-metal/streams/stream";
import StreamBinding from "ember-metal/streams/stream_binding";

var source, value;

QUnit.module('Stream Binding', {
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

QUnit.test('basic', function() {
  var binding = new StreamBinding(source);

  equal(binding.value(), "zlurp");

  run(function() {
    source.setValue("blorg");
  });

  equal(binding.value(), "blorg");

  binding.destroy(); // destroy should not fail
});

QUnit.test('the source stream can send values to a single subscriber', function() {
  var binding = new StreamBinding(source);
  var obj = mixin({}, { toBinding: binding });

  equal(get(obj, 'to'), "zlurp", "immediately syncs value forward on init");

  run(function() {
    source.setValue("blorg");
    equal(get(obj, 'to'), "zlurp", "does not immediately sync value on set");
  });

  equal(get(obj, 'to'), "blorg", "value has synced after run loop");
});

QUnit.test('the source stream can send values to multiple subscribers', function() {
  var binding = new StreamBinding(source);
  var obj1 = mixin({}, { toBinding: binding });
  var obj2 = mixin({}, { toBinding: binding });

  equal(get(obj1, 'to'), "zlurp", "immediately syncs value forward on init");
  equal(get(obj2, 'to'), "zlurp", "immediately syncs value forward on init");

  run(function() {
    source.setValue("blorg");
    equal(get(obj1, 'to'), "zlurp", "does not immediately sync value on set");
    equal(get(obj2, 'to'), "zlurp", "does not immediately sync value on set");
  });

  equal(get(obj1, 'to'), "blorg", "value has synced after run loop");
  equal(get(obj2, 'to'), "blorg", "value has synced after run loop");
});

QUnit.test('a subscriber can set the value on the source stream and notify the other subscribers', function() {
  var binding = new StreamBinding(source);
  var obj1 = mixin({}, { toBinding: binding });
  var obj2 = mixin({}, { toBinding: binding });

  run(function() {
    set(obj1, 'to', "blorg");
    equal(get(obj2, 'to'), "zlurp", "does not immediately sync value on set");
    equal(source.value(), "zlurp", "does not immediately sync value on set");
  });

  equal(get(obj2, 'to'), "blorg", "value has synced after run loop");
  equal(source.value(), "blorg", "value has synced after run loop");
});

QUnit.test('if source and subscribers sync value, source wins', function() {
  var binding = new StreamBinding(source);
  var obj1 = mixin({}, { toBinding: binding });
  var obj2 = mixin({}, { toBinding: binding });
  var obj3 = mixin({}, { toBinding: binding });

  run(function() {
    set(obj1, 'to', "blorg");
    source.setValue("hoopla");
    set(obj2, 'to', "flarp");
    equal(get(obj3, 'to'), "zlurp", "does not immediately sync value on set");
  });

  equal(source.value(), "hoopla", "value has synced after run loop");
  equal(get(obj1, 'to'), "hoopla", "value has synced after run loop");
  equal(get(obj2, 'to'), "hoopla", "value has synced after run loop");
  equal(get(obj3, 'to'), "hoopla", "value has synced after run loop");
});

QUnit.test('the last value sent by the source wins', function() {
  var binding = new StreamBinding(source);
  var obj = mixin({}, { toBinding: binding });

  run(function() {
    source.setValue("blorg");
    source.setValue("hoopla");
    equal(get(obj, 'to'), "zlurp", "does not immediately sync value on set");
  });

  equal(source.value(), "hoopla", "value has synced after run loop");
  equal(get(obj, 'to'), "hoopla", "value has synced after run loop");
});

QUnit.test('continues to notify subscribers after first consumption, even if not consumed', function() {
  var counter = 0;
  var binding = new StreamBinding(source);

  binding.value();

  binding.subscribe(function() {
    source.value();
    counter++;
  });

  equal(counter, 0);

  run(function() {
    source.setValue("blorg");
    equal(counter, 0);
  });
  equal(counter, 1);

  run(function() {
    source.setValue("hoopla");
    source.setValue("zlurp");
    equal(counter, 1);
  });
  equal(counter, 2);
});

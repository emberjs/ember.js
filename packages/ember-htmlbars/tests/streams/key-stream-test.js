import { isWatching } from 'ember-metal/watching';
import { Stream } from 'ember-htmlbars/streams/stream';
import KeyStream from 'ember-htmlbars/streams/key-stream';
import { set } from 'ember-metal/property_set';

let source, object, count;

function incrementCount() {
  count++;
}

QUnit.module('KeyStream', {
  setup() {
    count = 0;
    object = { name: 'mmun' };

    source = new Stream(() => object);
  },
  teardown() {
    count = undefined;
    object = undefined;
    source = undefined;
  }
});

QUnit.test('can be instantiated manually', function() {
  let nameStream = new KeyStream(source, 'name');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');
});

QUnit.test('can be instantiated via `Stream.prototype.get`', function() {
  let nameStream = source.get('name');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');
});

QUnit.test('is notified when the observed object\'s property is mutated', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(incrementCount);

  equal(count, 0, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  set(object, 'name', 'wycats');

  equal(count, 1, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'wycats', 'Stream value is correct');
});

QUnit.test('is notified when the source stream\'s value changes to a new object', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(incrementCount);

  equal(count, 0, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  object = { name: 'wycats' };
  source.notify();

  equal(count, 1, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'wycats', 'Stream value is correct');

  set(object, 'name', 'kris');

  equal(count, 2, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'kris', 'Stream value is correct');
});

QUnit.test('is notified when the source stream\'s value changes to the same object', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(incrementCount);

  equal(count, 0, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  source.notify();

  equal(count, 1, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  set(object, 'name', 'kris');

  equal(count, 2, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'kris', 'Stream value is correct');
});

QUnit.test('is notified when setSource is called with a new stream whose value is a new object', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(incrementCount);

  equal(count, 0, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  object = { name: 'wycats' };
  nameStream.setSource(new Stream(() => object));

  equal(count, 1, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'wycats', 'Stream value is correct');

  set(object, 'name', 'kris');

  equal(count, 2, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'kris', 'Stream value is correct');
});

QUnit.test('is notified when setSource is called with a new stream whose value is the same object', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(incrementCount);

  equal(count, 0, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  nameStream.setSource(new Stream(() => object));

  equal(count, 1, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'mmun', 'Stream value is correct');

  set(object, 'name', 'kris');

  equal(count, 2, 'Subscribers called correct number of times');
  equal(nameStream.value(), 'kris', 'Stream value is correct');
});

QUnit.test('adds and removes key observers on activation and deactivation', function() {
  let nameStream = source.get('name');

  ok(!isWatching(object, 'name'), 'Key is not observered immediately after creation');

  nameStream.value();

  ok(!isWatching(object, 'name'), 'Key is not observered after calling value with no subscribers');

  let firstCallback = function() {};
  nameStream.subscribe(firstCallback);

  ok(!isWatching(object, 'name'), 'Key is not observered immediately after first subscription');

  nameStream.value();

  ok(isWatching(object, 'name'), 'Key is observered after activation');

  let secondCallback = function() {};
  nameStream.subscribe(secondCallback);

  ok(isWatching(object, 'name'), 'Key is still observered after second subscription is added');

  nameStream.unsubscribe(secondCallback);

  ok(isWatching(object, 'name'), 'Key is still observered after second subscription is removed');

  nameStream.unsubscribe(firstCallback);

  ok(!isWatching(object, 'name'), 'Key is not observered after deactivation');
});

QUnit.test('removes key observers on destruction', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(() => {});
  nameStream.value();

  ok(isWatching(object, 'name'), '(Precondition) Key is observered after activation');

  nameStream.destroy();

  ok(!isWatching(object, 'name'), 'Key is not observered after destruction');
});

QUnit.test('manages key observers correctly when the object changes', function() {
  let nameStream = source.get('name');
  nameStream.subscribe(() => {});
  nameStream.value();

  ok(isWatching(object, 'name'), '(Precondition) Key is observered after activation');

  let prevObject = object;
  object = { name: 'wycats' };
  source.notify();

  ok(isWatching(prevObject, 'name'), 'Key is still observered on the previous object before recomputing');
  ok(!isWatching(object, 'name'), 'Key is still not observered on the new object before recomputing');

  nameStream.value();

  ok(!isWatching(prevObject, 'name'), 'Key is not observered on the previous object after recomputing');
  ok(isWatching(object, 'name'), 'Key is observered on the new object after recomputing');
});

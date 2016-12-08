import EmberObject from '../../../system/object';
import Evented from '../../../mixins/evented';

QUnit.module('Object events');

QUnit.test('a listener can be added to an object', function() {
  let count = 0;
  let F = function() { count++; };

  let obj = EmberObject.extend(Evented).create();

  obj.on('event!', F);
  obj.trigger('event!');

  equal(count, 1, 'the event was triggered');

  obj.trigger('event!');

  equal(count, 2, 'the event was triggered');
});

QUnit.test('a listener can be added and removed automatically the first time it is triggered', function() {
  let count = 0;
  let F = function() { count++; };

  let obj = EmberObject.extend(Evented).create();

  obj.one('event!', F);
  obj.trigger('event!');

  equal(count, 1, 'the event was triggered');

  obj.trigger('event!');

  equal(count, 1, 'the event was not triggered again');
});

QUnit.test('triggering an event can have arguments', function() {
  let self, args;

  let obj = EmberObject.extend(Evented).create();

  obj.on('event!', function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.trigger('event!', 'foo', 'bar');

  deepEqual(args, ['foo', 'bar']);
  equal(self, obj);
});

QUnit.test('a listener can be added and removed automatically and have arguments', function() {
  let self, args;
  let count = 0;

  let obj = EmberObject.extend(Evented).create();

  obj.one('event!', function() {
    args = [].slice.call(arguments);
    self = this;
    count++;
  });

  obj.trigger('event!', 'foo', 'bar');

  deepEqual(args, ['foo', 'bar']);
  equal(self, obj);
  equal(count, 1, 'the event is triggered once');

  obj.trigger('event!', 'baz', 'bat');

  deepEqual(args, ['foo', 'bar']);
  equal(count, 1, 'the event was not triggered again');
  equal(self, obj);
});

QUnit.test('binding an event can specify a different target', function() {
  let self, args;

  let obj = EmberObject.extend(Evented).create();
  let target = {};

  obj.on('event!', target, function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.trigger('event!', 'foo', 'bar');

  deepEqual(args, ['foo', 'bar']);
  equal(self, target);
});

QUnit.test('a listener registered with one can take method as string and can be added with different target', function() {
  let count = 0;
  let target = {};
  target.fn = function() { count++; };

  let obj = EmberObject.extend(Evented).create();

  obj.one('event!', target, 'fn');
  obj.trigger('event!');

  equal(count, 1, 'the event was triggered');

  obj.trigger('event!');

  equal(count, 1, 'the event was not triggered again');
});

QUnit.test('a listener registered with one can be removed with off', function() {
  let obj = EmberObject.extend(Evented, {
    F() {}
  }).create();
  let F = function() {};

  obj.one('event!', F);
  obj.one('event!', obj, 'F');

  equal(obj.has('event!'), true, 'has events');

  obj.off('event!', F);
  obj.off('event!', obj, 'F');

  equal(obj.has('event!'), false, 'has no more events');
});

QUnit.test('adding and removing listeners should be chainable', function() {
  let obj = EmberObject.extend(Evented).create();
  let F = function() {};

  let ret = obj.on('event!', F);
  equal(ret, obj, '#on returns self');

  ret = obj.off('event!', F);
  equal(ret, obj, '#off returns self');

  ret = obj.one('event!', F);
  equal(ret, obj, '#one returns self');
});

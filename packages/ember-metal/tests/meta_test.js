import {
  meta
} from 'ember-metal/meta';

QUnit.module('Ember.meta');

QUnit.test('should return the same hash for an object', function() {
  var obj = {};

  meta(obj).foo = 'bar';

  equal(meta(obj).foo, 'bar', 'returns same hash with multiple calls to Ember.meta()');
});

QUnit.test('meta is not enumerable', function () {
  var proto, obj, props, prop;
  proto = { foo: 'bar' };
  meta(proto);
  obj = Object.create(proto);
  meta(obj);
  obj.bar = 'baz';
  props = [];
  for (prop in obj) {
    props.push(prop);
  }
  deepEqual(props.sort(), ['bar', 'foo']);
  if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
    try {
      JSON.stringify(obj);
    } catch (e) {
      ok(false, 'meta should not fail JSON.stringify');
    }
  }
});

QUnit.test('meta is not enumerable', function () {
  var proto, obj, props, prop;
  proto = { foo: 'bar' };
  meta(proto);
  obj = Object.create(proto);
  meta(obj);
  obj.bar = 'baz';
  props = [];
  for (prop in obj) {
    props.push(prop);
  }
  deepEqual(props.sort(), ['bar', 'foo']);
  if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
    try {
      JSON.stringify(obj);
    } catch (e) {
      ok(false, 'meta should not fail JSON.stringify');
    }
  }
});

QUnit.skip('meta.listeners basics', function(assert) {
  let t = {};
  let m = meta({});
  m.addToListeners({ eventName: 'hello', target: t, method: 'm', flags: 0 });
  let matching = m.matchingListeners(e => e.eventName === 'hello');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].target, t);
  m.removeFromListeners({ eventName: 'hello', target: t, method: 'm' });
  matching = m.matchingListeners(e => e.eventName === 'hello');
  assert.equal(matching.length, 0);
});

QUnit.skip('meta.listeners inheritance', function(assert) {
  let target = {};
  let parent = {};
  let parentMeta = meta(parent);
  parentMeta.addToListeners({ eventName: 'hello', target, method: 'm', flags: 0 });

  let child = Object.create(parent);
  let m = meta(child);

  let matching = m.matchingListeners(e => e.eventName === 'hello');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].target, target);
  m.removeFromListeners({ eventName: 'hello', target, method: 'm' });
  matching = m.matchingListeners(e => e.eventName === 'hello');
  assert.equal(matching.length, 0);
});

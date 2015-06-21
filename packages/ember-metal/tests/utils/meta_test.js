import {
  getMeta,
  setMeta,
  meta,
  metaPath
} from 'ember-metal/utils';

QUnit.module('Ember.meta');

QUnit.test('should return the same hash for an object', function() {
  var obj = {};

  meta(obj).foo = 'bar';

  equal(meta(obj).foo, 'bar', 'returns same hash with multiple calls to Ember.meta()');
});

QUnit.module('Ember.metaPath');

QUnit.test('should not create nested objects if writable is false', function() {
  var obj = {};

  ok(!meta(obj).foo, 'precond - foo property on meta does not yet exist');
  expectDeprecation(function() {
    equal(metaPath(obj, ['foo', 'bar', 'baz'], false), undefined, 'should return undefined when writable is false and doesn\'t already exist');
  });
  equal(meta(obj).foo, undefined, 'foo property is not created');
});

QUnit.test('should create nested objects if writable is true', function() {
  var obj = {};

  ok(!meta(obj).foo, 'precond - foo property on meta does not yet exist');

  expectDeprecation(function() {
    equal(typeof metaPath(obj, ['foo', 'bar', 'baz'], true), 'object', 'should return hash when writable is true and doesn\'t already exist');
  });
  ok(meta(obj).foo.bar.baz['bat'] = true, 'can set a property on the newly created hash');
});

QUnit.test('getMeta and setMeta', function() {
  var obj = {};

  ok(!getMeta(obj, 'foo'), 'precond - foo property on meta does not yet exist');
  setMeta(obj, 'foo', 'bar');
  equal(getMeta(obj, 'foo'), 'bar', 'foo property on meta now exists');
});

QUnit.module('Ember.meta enumerable');

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

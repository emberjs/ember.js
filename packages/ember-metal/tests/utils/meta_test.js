import {
  meta
} from 'ember-metal/utils';

QUnit.module('Ember.meta');

QUnit.test('should return the same hash for an object', function() {
  var obj = {};

  meta(obj).foo = 'bar';

  equal(meta(obj).foo, 'bar', 'returns same hash with multiple calls to Ember.meta()');
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

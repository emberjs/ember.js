import get from 'ember-metal/property_get';
import {
  Mixin,
  mixin
} from 'ember-metal/mixin';

QUnit.module('Mixin concatenatedProperties');

QUnit.test('defining concatenated properties should concat future version', function() {
  var MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Mixin.create({
    foo: ['d', 'e', 'f']
  });

  var obj = mixin({}, MixinA, MixinB);
  deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

QUnit.test('defining concatenated properties should concat future version', function() {
  var MixinA = Mixin.create({
    concatenatedProperties: null
  });

  var MixinB = Mixin.create({
    concatenatedProperties: null
  });

  var obj = mixin({}, MixinA, MixinB);

  deepEqual(obj.concatenatedProperties, []);
});


QUnit.test('concatenatedProperties should be concatenated', function() {
  var MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Mixin.create({
    concatenatedProperties: 'bar',
    foo: ['d', 'e', 'f'],
    bar: [1,2,3]
  });

  var MixinC = Mixin.create({
    bar: [4,5,6]
  });

  var obj = mixin({}, MixinA, MixinB, MixinC);
  deepEqual(get(obj, 'concatenatedProperties'), ['foo', 'bar'], 'get concatenatedProperties');
  deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
  deepEqual(get(obj, 'bar'), [1,2,3,4,5,6], 'get bar');
});

QUnit.test('adding a prop that is not an array should make array', function() {
  var MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: [1,2,3]
  });

  var MixinB = Mixin.create({
    foo: 4
  });

  var obj = mixin({}, MixinA, MixinB);
  deepEqual(get(obj, 'foo'), [1,2,3,4]);
});

QUnit.test('adding a prop that is not an array should make array', function() {
  var MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 'bar'
  });

  var obj = mixin({}, MixinA);
  deepEqual(get(obj, 'foo'), ['bar']);
});

QUnit.test('adding a non-concatenable property that already has a defined value should result in an array with both values', function() {
  var mixinA = Mixin.create({
    foo: 1
  });

  var mixinB = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 2
  });

  var obj = mixin({}, mixinA, mixinB);
  deepEqual(get(obj, 'foo'), [1, 2]);
});

QUnit.test('adding a concatenable property that already has a defined value should result in a concatenated value', function() {
  var mixinA = Mixin.create({
    foobar: 'foo'
  });

  var mixinB = Mixin.create({
    concatenatedProperties: ['foobar'],
    foobar: 'bar'
  });

  var obj = mixin({}, mixinA, mixinB);
  equal(get(obj, 'foobar'), 'foobar');
});

import { get, mixin } from './support';
import { Mixin } from 'glimmer-object';

QUnit.module('Mixin.concatenatedProperties');

QUnit.test('defining concatenated properties should concat future version', function() {
  let MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  let MixinB = Mixin.create({
    foo: ['d', 'e', 'f']
  });

  let obj = mixin({}, MixinA, MixinB);
  deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

QUnit.test('defining concatenated properties should concat future version', function() {
  let MixinA = Mixin.create({
    concatenatedProperties: null
  });

  let MixinB = Mixin.create({
    concatenatedProperties: null
  });

  let obj = mixin({}, MixinA, MixinB);

  deepEqual(obj.concatenatedProperties, []);
});

QUnit.test('concatenatedProperties should be concatenated', function() {
  let MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  let MixinB = Mixin.create({
    concatenatedProperties: 'bar',
    foo: ['d', 'e', 'f'],
    bar: [1, 2, 3]
  });

  let MixinC = Mixin.create({
    bar: [4, 5, 6]
  });

  let obj = mixin({}, MixinA, MixinB, MixinC);
  deepEqual(get(obj, 'concatenatedProperties'), ['foo', 'bar'], 'get concatenatedProperties');
  deepEqual(get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
  deepEqual(get(obj, 'bar'), [1, 2, 3, 4, 5, 6], 'get bar');
});

QUnit.test('adding a prop that is not an array should make array', function() {
  let MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: [1, 2, 3]
  });

  let MixinB = Mixin.create({
    foo: 4
  });

  let obj = mixin({}, MixinA, MixinB);
  deepEqual(get(obj, 'foo'), [1, 2, 3, 4]);
});

QUnit.test('adding a prop that is not an array should make array', function() {
  let MixinA = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 'bar'
  });

  let obj = mixin({}, MixinA);
  deepEqual(get(obj, 'foo'), ['bar']);
});

QUnit.skip('adding a non-concatenable property that already has a defined value should result in an array with both values', function() {
  let mixinA = Mixin.create({
    foo: 1
  });

  let mixinB = Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 2
  });

  let obj = mixin({}, mixinA, mixinB);
  deepEqual(get(obj, 'foo'), [1, 2]);
});

QUnit.skip('adding a concatenable property that already has a defined value should result in a concatenated value', function() {
  let mixinA = Mixin.create({
    foobar: 'foo'
  });

  let mixinB = Mixin.create({
    concatenatedProperties: ['foobar'],
    foobar: 'bar'
  });

  let obj = mixin({}, mixinA, mixinB);
  equal(get(obj, 'foobar'), 'foobar');
});

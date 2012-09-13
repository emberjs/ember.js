/*globals setup */

module('Ember.Mixin concatenatedProperties');

test('defining concatenated properties should concat future version', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Ember.Mixin.create({
    foo: ['d', 'e', 'f']
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('concatenatedProperties should be concatenated', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Ember.Mixin.create({
    concatenatedProperties: 'bar',
    foo: ['d', 'e', 'f'],
    bar: [1,2,3]
  });

  var MixinC = Ember.Mixin.create({
    bar: [4,5,6]
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  deepEqual(Ember.get(obj, 'concatenatedProperties'), ['foo', 'bar'], 'get concatenatedProperties');
  deepEqual(Ember.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
  deepEqual(Ember.get(obj, 'bar'), [1,2,3,4,5,6], 'get bar');
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: [1,2,3]
  });

  var MixinB = Ember.Mixin.create({
    foo: 4
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), [1,2,3,4]);
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 'bar'
  });

  var obj = Ember.mixin({}, MixinA);
  deepEqual(Ember.get(obj, 'foo'), ['bar']);
});

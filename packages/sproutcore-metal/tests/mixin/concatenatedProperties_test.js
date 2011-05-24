// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals setup */

module('SC.Mixin concatenatedProperties');

test('defining concatenated properties should concat future version', function() {

  var MixinA = SC.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });
  
  var MixinB = SC.Mixin.create({
    foo: ['d', 'e', 'f']
  });
  
  var obj = SC.mixin({}, MixinA, MixinB);
  same(SC.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('concatenatedProperties should be concatenated', function() {

  var MixinA = SC.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });
  
  var MixinB = SC.Mixin.create({
    concatenatedProperties: 'bar',
    foo: ['d', 'e', 'f'],
    bar: [1,2,3]
  });
  
  var MixinC = SC.Mixin.create({
    bar: [4,5,6]
  });
  
  var obj = SC.mixin({}, MixinA, MixinB, MixinC);
  same(SC.get(obj, 'concatenatedProperties'), ['foo', 'bar'], 'get concatenatedProperties');
  same(SC.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
  same(SC.get(obj, 'bar'), [1,2,3,4,5,6], 'get bar');
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = SC.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: [1,2,3]
  });

  var MixinB = SC.Mixin.create({
    foo: 4
  });

  var obj = SC.mixin({}, MixinA, MixinB);
  same(SC.get(obj, 'foo'), [1,2,3,4]);
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = SC.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 'bar'
  });

  var obj = SC.mixin({}, MixinA);
  same(SC.get(obj, 'foo'), ['bar']);
});

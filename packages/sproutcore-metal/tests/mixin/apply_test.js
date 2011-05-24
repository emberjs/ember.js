// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

module('SC.Mixin.apply');

function K() {}

test('using apply() should apply properties', function() {
  var MixinA = SC.Mixin.create({ foo: 'FOO', baz: K });
  var obj = {};
  SC.mixin(obj, MixinA);

  equals(SC.get(obj, 'foo'), "FOO", 'should apply foo');
  equals(SC.get(obj, 'baz'), K, 'should apply foo');
});

test('applying anonymous properties', function() {
  var obj = {};
  SC.mixin(obj, {
    foo: 'FOO',
    baz: K
  });

  equals(SC.get(obj, 'foo'), "FOO", 'should apply foo');
  equals(SC.get(obj, 'baz'), K, 'should apply foo');
});

test('applying null values', function() {
  raises(function() {
    SC.mixin({}, null);
  }, Error);
});
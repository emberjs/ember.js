// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

module('Ember.Mixin.apply');

function K() {}

test('using apply() should apply properties', function() {
  var MixinA = Ember.Mixin.create({ foo: 'FOO', baz: K });
  var obj = {};
  Ember.mixin(obj, MixinA);

  equal(Ember.get(obj, 'foo'), "FOO", 'should apply foo');
  equal(Ember.get(obj, 'baz'), K, 'should apply foo');
});

test('applying anonymous properties', function() {
  var obj = {};
  Ember.mixin(obj, {
    foo: 'FOO',
    baz: K
  });

  equal(Ember.get(obj, 'foo'), "FOO", 'should apply foo');
  equal(Ember.get(obj, 'baz'), K, 'should apply foo');
});

test('applying null values', function() {
  raises(function() {
    Ember.mixin({}, null);
  }, Error);
});
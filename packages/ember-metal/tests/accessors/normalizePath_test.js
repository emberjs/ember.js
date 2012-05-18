// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.normalizePath');

test('foo -> foo', function() {
  equal(Ember.normalizePath('foo'), 'foo');
});

test('foo.bar -> foo.bar', function() {
  equal(Ember.normalizePath('foo.bar'), 'foo.bar');
});

test('this.foo.bar -> this.foo.bar', function() {
  equal(Ember.normalizePath('this.foo.bar'), 'this.foo.bar');
});

test('.foo.bar -> this.foo.bar', function() {
  equal(Ember.normalizePath('.foo.bar'), 'this.foo.bar');
});

test('*foo.bar -> this.foo.bar', function() {
  Ember.TESTING_DEPRECATION = true;
  try {
    equal(Ember.normalizePath('*foo.bar'), 'this.foo.bar');
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});


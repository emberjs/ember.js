// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.normalizePath');

test('foo -> foo', function() {
  equals(SC.normalizePath('foo'), 'foo');
});

test('foo.bar -> foo.bar', function() {
  equals(SC.normalizePath('foo.bar'), 'foo.bar');
});

test('this.foo.bar -> this.foo.bar', function() {
  equals(SC.normalizePath('this.foo.bar'), 'this.foo.bar');
});

test('.foo.bar -> this.foo.bar', function() {
  equals(SC.normalizePath('.foo.bar'), 'this.foo.bar');
});

test('*foo.bar -> this.foo.bar', function() {
  equals(SC.normalizePath('*foo.bar'), 'this.foo.bar');
});


// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Mixin.detect');

test('detect() finds a directly applied mixin', function() {
  
  var MixinA = Ember.Mixin.create();
  var obj = {};
  
  equals(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinA.apply(obj);
  equals(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds nested mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  var obj = {};
  
  equals(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinB.apply(obj);
  equals(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds mixins on other mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  equals(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
  equals(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
});

test('detect handles null values', function() {
  var MixinA = Ember.Mixin.create();
  equals(MixinA.detect(null), false);
});

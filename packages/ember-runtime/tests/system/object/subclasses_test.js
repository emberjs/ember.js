// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/object/subclasses');

test('Ember.Object should have a subclass set', function() {
  ok(Ember.Object.subclasses instanceof Ember.Set);
});

test('defining a new subclass should add it to set of parent', function() {
  var Subclass = Ember.Object.extend();
  ok(Ember.Object.subclasses.contains(Subclass));
});

test('defining sub-sub class should only go to parent', function() {
  var Sub = Ember.Object.extend();
  var SubSub = Sub.extend();
  
  ok(Ember.Object.subclasses.contains(Sub), 'Ember.Object contains Sub');
  ok(Sub.subclasses.contains(SubSub), 'Sub contains SubSub');
});


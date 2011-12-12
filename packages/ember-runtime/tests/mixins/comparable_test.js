// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok isObj equals expects */

var Rectangle = Ember.Object.extend(Ember.Comparable, {
  length: 0,
  width: 0,
  
  area: function() {
    return Ember.get(this,'length') * Ember.get(this, 'width');
  },
  
  compare: function(a, b) {
    return Ember.compare(a.area(), b.area());
  }
  
});

var r1, r2;

module("Comparable", {
  
  setup: function() {
    r1 = Rectangle.create({length: 6, width: 12});
    r2 = Rectangle.create({length: 6, width: 13});
  },
  
  teardown: function() {
  }
  
});

test("should be comparable and return the correct result", function() {
  equals(Ember.Comparable.detect(r1), true);
  equals(Ember.compare(r1, r1), 0);
  equals(Ember.compare(r1, r2), -1);
  equals(Ember.compare(r2, r1), 1);
});

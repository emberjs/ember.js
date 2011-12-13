// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/copyable');

var suite = Ember.CopyableTests;

suite.module('frozenCopy');

suite.test("frozen objects should return same instance", function() {
  var obj, copy;
  
  obj = this.newObject();
  if (Ember.get(this, 'shouldBeFreezable')) {
    ok(!Ember.Freezable || Ember.Freezable.detect(obj), 'object should be freezable');

    copy = obj.frozenCopy();
    ok(this.isEqual(obj, copy), 'new copy should be equal');
    ok(Ember.get(copy, 'isFrozen'), 'returned value should be frozen');
    
    copy = obj.freeze().frozenCopy();
    equals(copy, obj, 'returns frozen object should be same');
    ok(Ember.get(copy, 'isFrozen'), 'returned object should be frozen');
    
  } else {
    ok(!Ember.Freezable || !Ember.Freezable.detect(obj), 'object should not be freezable');
  }
});



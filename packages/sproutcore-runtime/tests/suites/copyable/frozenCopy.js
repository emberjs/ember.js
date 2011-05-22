// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/copyable');

var suite = SC.CopyableTests;

suite.module('frozenCopy');

suite.test("frozen objects should return same instance", function() {
  var obj, copy;
  
  obj = this.newObject();
  if (SC.get(this, 'shouldBeFreezable')) {
    ok(!SC.Freezable || SC.Freezable.detect(obj), 'object should be freezable');

    copy = obj.frozenCopy();
    ok(this.isEqual(obj, copy), 'new copy should be equal');
    ok(SC.get(copy, 'isFrozen'), 'returned value should be frozen');
    
    copy = obj.freeze().frozenCopy();
    equals(copy, obj, 'returns frozen object should be same');
    ok(SC.get(copy, 'isFrozen'), 'returned object should be frozen');
    
  } else {
    ok(!SC.Freezable || !SC.Freezable.detect(obj), 'object should not be freezable');
  }
});



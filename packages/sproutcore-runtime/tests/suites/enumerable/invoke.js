// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/enumerable');

var suite = SC.EnumerableTests;

suite.module('invoke');

suite.test('invoke should call on each object that implements', function() {
  var cnt, ary, obj;
  
  function F(amt) {
    cnt += amt===undefined ? 1 : amt;
  }
  cnt = 0;
  ary = [
    { foo: F },
    SC.Object.create({ foo: F }),
    
    // NOTE: does not impl foo - invoke should just skip
    SC.Object.create({ bar: F }),

    { foo: F }
  ];
  
  obj = this.newObject(ary);
  obj.invoke('foo');
  equals(cnt, 3, 'should have invoked 3 times');
  
  cnt = 0;
  obj.invoke('foo', 2);
  equals(cnt, 6, 'should have invoked 3 times, passing param');
});



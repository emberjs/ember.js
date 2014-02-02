// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok equals same CoreTest */

sc_require('debug/test_suites/array/base');

SC.ArraySuite.define(function(T) {
  
  var observer, obj ;
  
  module(T.desc("shiftObject"), {
    setup: function() {
      obj = T.newObject();
      observer = T.observer(obj);
    }
  });

  test("[].shiftObject() => [] + returns undefined + NO notify", function() {
    observer.observe('[]', 'length') ;
    equals(obj.shiftObject(), undefined, 'should return undefined') ;
    T.validateAfter(obj, [], observer, NO, NO);
  });

  test("[X].shiftObject() => [] + notify", function() {
    var exp = T.expected(1)[0];
    
    obj.replace(0,0, [exp]);
    observer.observe('[]', 'length') ;

    equals(obj.shiftObject(), exp, 'should return shifted object') ;
    T.validateAfter(obj, [], observer, YES, YES);
  });

  test("[A,B,C].shiftObject() => [B,C] + notify", function() {
    var before  = T.expected(3),
        value   = before[0],
        after   = before.slice(1);
        
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    equals(obj.shiftObject(), value, 'should return shifted object') ;
    T.validateAfter(obj, after, observer, YES);
  });
  
});

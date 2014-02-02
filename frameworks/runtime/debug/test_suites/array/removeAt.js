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
  
  module(T.desc("removeAt"), {
    setup: function() {
      obj = T.newObject();
      observer = T.observer(obj);
    }
  });

  test("[X].removeAt(0) => [] + notify", function() {

    var before = T.expected(1);
    obj.replace(0,0, before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(0) ;
    T.validateAfter(obj, [], observer, YES);
  });
  
  test("[].removeAt(200) => OUT_OF_RANGE_EXCEPTION exception", function() {
    var didThrow = NO ;
    try {
      obj.removeAt(200);
    } catch (e) {
      equals(e, SC.OUT_OF_RANGE_EXCEPTION, 'should throw SC.OUT_OF_RANGE_EXCEPTION');
      didThrow = YES ;
    }
    ok(didThrow, 'should raise exception');
  });

  test("[A,B].removeAt(0) => [B] + notify", function() {
    var before = T.expected(2), 
        after   = [before[1]];
    
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(0);
    T.validateAfter(obj, after, observer, YES);
  });

  test("[A,B].removeAt(1) => [A] + notify", function() {
    var before = T.expected(2), 
        after   = [before[0]];
    
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(1);
    T.validateAfter(obj, after, observer, YES);
  });

  test("[A,B,C].removeAt(1) => [A,C] + notify", function() {
    var before = T.expected(3), 
        after   = [before[0], before[2]];
    
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(1);
    T.validateAfter(obj, after, observer, YES);
  });
  
  test("[A,B,C,D].removeAt(1,2) => [A,D] + notify", function() {
    var before = T.expected(4), 
        after   = [before[0], before[3]];
    
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(1,2);
    T.validateAfter(obj, after, observer, YES);
  });

  test("[A,B,C,D].removeAt(IndexSet<0,2-3>) => [B] + notify", function() {
    var before = T.expected(4), 
        after   = [before[1]];
    
    obj.replace(0,0,before);
    observer.observe('[]', 'length') ;
    
    obj.removeAt(SC.IndexSet.create(0).add(2,2));
    T.validateAfter(obj, after, observer, YES);
  });
  
});


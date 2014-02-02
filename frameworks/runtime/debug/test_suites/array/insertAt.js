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
  
  module(T.desc("insertAt"), {
    setup: function() {
      obj = T.newObject();
      observer = T.observer(obj);
    }
  });

  test("[].insertAt(0, X) => [X] + notify", function() {

    var after = T.expected(1);
    
    observer.observe('[]') ;
    obj.insertAt(0, after) ;
    T.validateAfter(obj, after, observer);
  });
  
  test("[].insertAt(200,X) => OUT_OF_RANGE_EXCEPTION exception", function() {
    var didThrow = NO ;
    try {
      obj.insertAt(200, T.expected(1));
    } catch (e) {
      equals(e, SC.OUT_OF_RANGE_EXCEPTION, 'should throw SC.OUT_OF_RANGE_EXCEPTION');
      didThrow = YES ;
    }
    ok(didThrow, 'should raise exception');
  });

  test("[A].insertAt(0, X) => [X,A] + notify", function() {
    var exp = T.expected(2), 
        before  = exp.slice(0,1),
        replace = exp[1],
        after   = [replace, before[0]];
    
    obj.replace(0,0,before);
    observer.observe('[]');
    
    obj.insertAt(0, replace);
    T.validateAfter(obj, after, observer);
  });
  
  test("[A].insertAt(1, X) => [A,X] + notify", function() {
    var exp = T.expected(2), 
        before  = exp.slice(0,1),
        replace = exp[1],
        after   = [before[0], replace];
    
    obj.replace(0,0,before);
    observer.observe('[]');
    
    obj.insertAt(1, replace);
    T.validateAfter(obj, after, observer);
  });

  test("[A].insertAt(200,X) => OUT_OF_RANGE exception", function() {
    obj.replace(0,0, T.expected(1)); // add an item
    
    var didThrow = NO ;
    try {
      obj.insertAt(200, T.expected(1));
    } catch (e) {
      equals(e, SC.OUT_OF_RANGE_EXCEPTION, 'should throw SC.OUT_OF_RANGE_EXCEPTION');
      didThrow = YES ;
    }
    ok(didThrow, 'should raise exception');
  });
  
  test("[A,B,C].insertAt(0,X) => [X,A,B,C] + notify", function() {
    var exp = T.expected(4), 
        before  = exp.slice(1),
        replace = exp[0],
        after   = [replace, before[0], before[1], before[2]];
    
    obj.replace(0,0,before);
    observer.observe('[]');
    
    obj.insertAt(0, replace);
    T.validateAfter(obj, after, observer);
  });
  
  test("[A,B,C].insertAt(1,X) => [A,X,B,C] + notify", function() {
    var exp = T.expected(4), 
        before  = exp.slice(1),
        replace = exp[0],
        after   = [before[0], replace, before[1], before[2]];
    
    obj.replace(0,0,before);
    observer.observe('[]');
    
    obj.insertAt(1, replace);
    T.validateAfter(obj, after, observer);
  });

  test("[A,B,C].insertAt(3,X) => [A,B,C,X] + notify", function() {
    var exp = T.expected(4), 
        before  = exp.slice(1),
        replace = exp[0],
        after   = [before[0], before[1], before[2], replace];
    
    obj.replace(0,0,before);
    observer.observe('[]');
    
    obj.insertAt(3, replace);
    T.validateAfter(obj, after, observer);
  });
  
});

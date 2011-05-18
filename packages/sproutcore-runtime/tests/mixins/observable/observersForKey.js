// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Observable Tests
// ========================================================================
/*globals module test ok isObj equals expects Namespace */

// ..........................................................
// GET()
//

module("object.observesForKey()", {

});

test("should get observers", function() {
  var o1 = SC.Object.create({ foo: 100 }),
      o2 = SC.Object.create({ func: function() {} }),
      o3 = SC.Object.create({ func: function() {} }),
      observers = null;
      
  equals(o1.observersForKey('foo').get('length'), 0, "o1.observersForKey should return empty array");
  
  o1.addObserver('foo', o2, o2.func);
  o1.addObserver('foo', o3, o3.func);
  
  observers = o1.observersForKey('foo');
    
  equals(observers.get('length'), 2, "o2.observersForKey should return an array with length 2");
  equals(observers[0][0], o2, "first item in observers array should be o2");
  equals(observers[1][0], o3, "second item in observers array should be o3");
});
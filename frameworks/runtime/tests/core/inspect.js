// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.inspect Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var obj1,obj2,obj3; //global variables

module("Inspect module",{
  
      setup: function(){	
        obj1 = [1,3,4,9];
        obj2 = 24;     
        obj3 = {};
     }
});


test("SC.inspect module should give a string type",function(){
    var object1 = SC.inspect(obj1); 	
	equals(YES,SC.T_STRING === SC.typeOf(object1) ,'description of the array');
	
	var object2 = SC.inspect(obj2);
	equals(YES,SC.T_STRING === SC.typeOf(object2),'description of the numbers');
	
	var object3 = SC.inspect(obj3);
	equals(YES,SC.T_STRING === SC.typeOf(object3),'description of the object');
});
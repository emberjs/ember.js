// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ========================================================================
// SC.Builder Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var obj; //global variables

// Test cases for pushStack and end functions
module("Builder",{
	 
	  setup: function(){
	  	obj = [1,2,3,4];
	    
	}
});

test("To check if the set of array elements are pushed into stack",function(){
    
    var c = SC.Builder.fn.pushStack(obj);
    equals(4,obj.length = c.length,'No Of elements in the stack');
    equals(YES,obj[0]==c[0],'First element');
    equals(YES,obj[1]==c[1],'Second element'); 
    equals(YES,obj[2]==c[2],'Third element'); 
    equals(YES,obj[3]==c[3],'Fourth element'); 

    var d = SC.Builder.fn.end();
    equals(YES,SC.typeOf(d) == SC.T_HASH,'Previous item returned');   
});

test("create a new builder subclass with any passed properties copied to the builder's 'fn' property",function(){
	obj =SC.Builder.create({ name : 'Charles'});
	var fn_name =obj.fn.name;
	equals(fn_name,"Charles","name should match");
});

test("instantiate the builder, any passed args will be forwarded onto an internal init() method",function(){
	obj = new SC.Builder({name : 'Charles',age :23, sex :'M'});
	var objA =obj.fn.init();
	equals(objA.name,obj.fn.name);
	equals(objA.age,obj.fn.age);
	equals(objA.sex,obj.fn.sex);
});
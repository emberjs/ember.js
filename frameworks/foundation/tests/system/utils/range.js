// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Range Tests
// ========================================================================


module("SC.Range");

test("to find the maxRange() and minRange() values of a given range",function(){
	var obj = {start:15,length:75};
	equals(YES,SC.minRange(obj) == 15,'Minimum range');
    equals(YES,SC.maxRange(obj) == 90,'Maximum range');
});

test("unionRanges() to find the union of two ranges",function(){
	var obj = {start:15,length:75};
	var obj1 = {start:5,length:50};
	var c = SC.unionRanges(obj,obj1);
	equals(obj1.start,SC.minRange(c),'Minimum range');
	equals(85,c.length,'Maximum range');
});

test("rangesEqual() to find if the given ranges are equal",function(){
    var obj = {start:15,length:75};
	var obj1 = {start:15,length:75};
	var obj2 = {start:5,length:50};
	var c = SC.rangesEqual(obj,obj1);
	var d = SC.rangesEqual(obj1,obj2);
	equals(true,c,'Equal ranges');
	equals(false,d,'Unequal ranges');	
});

test("cloneRange() to clone the given range",function(){
	var obj = {start:15,length:75};
	var c = SC.cloneRange(obj);
	equals(obj.start,SC.minRange(c),'Minimum range');
	equals(75,c.length,'Maximum range');
});

test("valueInRange() to find if a given value is in range",function(){
	var obj = {start:15,length:75};
	var c = SC.valueInRange(25,obj);
	var d = SC.valueInRange(10,obj);
	equals(true,c,'In range');
	equals(false,d,'Not in range');
});

// test("valueInRange() to find if a given value is in range",function(){
// 	var obj = {start:15,length:75};
// 	var c = SC.valueInRange(25,obj);
// 	var d = SC.valueInRange(10,obj);
// 	equals(true,c,'In range');
// 	equals(false,d,'Not in range');
// });

test("intersectRanges() to get the intersection of 2 ranges",function(){
	var obj1 = {start:15,length:75};
	var obj2 = {start:5,length:50};
	
	var c = SC.intersectRanges(obj1,obj2);
	equals(SC.minRange(obj1),SC.minRange(c),'Minimum Intersection Range');
	equals(40,c.length,'Maximum Intersection Range');
});
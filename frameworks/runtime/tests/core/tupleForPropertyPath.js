// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.tupleForPropertyPath Tests
// ========================================================================
/*globals module test */

var object, object1,object3; //global variables

module("Checking the tuple for property path",{
	
	setup: function(){
		 object = SC.Object.create({
			name:'SproutCore',
			value:'',						//no value defined for the property
			objectA:SC.Object.create({
					propertyVal:"chainedProperty"
			})		
		 });
   }

});
   

test("should check for the tuple property", function() {
     var object2 = [];
     object2 = SC.tupleForPropertyPath(object.name,'');
     equals(object2[0], window, "the window object");
     equals(object2[1],'SproutCore',"the property name");	
     object2 = SC.tupleForPropertyPath(object.objectA.propertyVal,'object');
	 equals(object2[0],'object',"the root");
     equals(object2[1],'chainedProperty',"a chained property");
});

test("should check for the tuple property when path is undefined",function(){     //test case where no property defined
     var object2;
     object2 = SC.tupleForPropertyPath(object.value,'');
     equals(YES,object2 === null,'returns null for undefined path');	
});

test("should check for path argument", function() {
	equals(SC.tupleForPropertyPath(null), null, "returns null for null path");
})
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Validator.Number Tests
// ========================================================================


// htmlbody('<!-- Test Styles -->\
//   <form id="form" action="formaction"><input type="text" name="action" value="Test" id="email" maxlength="30"/></form>\
// ');

module("SC.Validator.Number ");	
test("validate() a number", function() {
 var field = SC.$('input');
 //alert(SC.Validator.Number.validate('',field));
});

test("Checking fieldValueForObject" ,function(){
 var obj = {};
 var value;
 value = SC.Validator.Number.fieldValueForObject(obj,'','');
 equals(SC.T_HASH,SC.typeOf(value),'Returns an object');
 value = SC.Validator.Number.fieldValueForObject(5354534545312.999,'','');
 equals(5354534545313,value,'Value rounded to closest value');
 value = SC.Validator.Number.fieldValueForObject(null,'','');
 equals('',value,'for null');
 value = SC.Validator.Number.fieldValueForObject(undefined,'','');
 equals('',value,'for undefined');
});

test("Checking objectForFieldValue" ,function(){
 var obj = {};
 var value = '';
 value = SC.Validator.Number.objectForFieldValue('','','');
 equals(null,value,'Returns null for an empty string parameter');
 value = SC.Validator.Number.objectForFieldValue('121 222','','');
 equals(121,value,'numerical string with spaces');
 value = SC.Validator.Number.objectForFieldValue('121.999','','');
 equals(121,value,'a float value string');
 // value = SC.Validator.Number.objectForFieldValue(null,'','');
 //  equals('',value,'for null');
 //  value = SC.Validator.Number.objectForFieldValue(undefined,'','');
 //  equals('',undefined,'for undefined');
});

test("Checking validateKeyDown",function(){
 //SC.Validator.Number.validateKeyDown('222323','','');
 //TypeError: SC.Validator.Number.validateKeyDown is not a function	
});
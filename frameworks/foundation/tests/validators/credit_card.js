// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Validator.CreditCard  Tests
// ========================================================================

module("credit_card validation - fieldValueForObject()");
test("Expects a string of 16 digits.  Will split into groups of 4 for display.",function(){
	var obj=SC.Validator.CreditCard.create();
	var string = "1234567890123456";
	var grouped_string = obj.fieldValueForObject("1234567891234567");
	equals(grouped_string,"1234 5678 9123 4567");	
});
test("Removes all whitespace or dashes to make a single string",function(){
	var obj=SC.Validator.CreditCard.create();
	var string = "1234 5678-9012-3456";
	var clean_string = obj.objectForFieldValue(string);
	equals(clean_string,"1234567890123456");	
});

test("Checks all valid card numbers or dashes to make a single string",function(){
	var obj=SC.Validator.CreditCard.create();
	var invalid_cc = "1234 5678-9012-3456";
	equals(obj.checkNumber(invalid_cc),false);
	var valid_cc = "4111 1111 1111 1111";
	equals(obj.checkNumber(valid_cc),true);	
});

// PROBLEM in function validateKeyDown 
// returns true instead of false and vice -versa
//test("Allow only numbers, dashes, and spaces",function(){
//	obj=SC.Validator.CreditCard.create();
//	string = "sdfk123";
//	equals(obj.validateKeyDown('','',string),false);
//	string = "123424";
//	equals(obj.validateKeyDown('','',string),true);
//});
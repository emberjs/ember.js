// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.UserDefaults Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var obj; //global variables

module("User Defaults",{
 	   
 	  setup: function(){
 	   
 	   obj = SC.Object.create({
 		   bck : 'green'
 	    }); 	

 	  SC.userDefaults.defaults({
			'app:testingValue': 99
		});
 	}
});



test("To check if the user defaults are stored and read from local storage",function(){
    SC.userDefaults.writeDefault('Back',obj.bck);
    equals(SC.userDefaults.readDefault('Back'), obj.bck, 'should read written property');
});

test("Test readDefault function will return a predefined default value when loading in Firefox v13", function() {

  var expected = 99;
  var result   = SC.userDefaults.readDefault('testingValue');
  equals(result, expected, "test should equal 99");
});
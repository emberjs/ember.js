// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Validator.Password Base Tests
// ========================================================================
/*globals module, test, ok, isObj, equals, expects */
// htmlbody('<!-- Test Styles -->\
// <form id="form" action="formaction"><input type="password" name="action" value="Test" id="field" maxlength="30"/></form>\
// ');
module("SC.Validator.password");

test("Attaching the field to the form");
/* WON'T FIX AT THIS TIME.

This entire file was commented out.
An empty unit test file will cause a timeout in the test runner,
so I'm converting this to a warning.

, function() {
  var a = SC.Validator.Password.attachTo(SC.$("#form"), SC.$('#field'));
  alert(a);
});
*/

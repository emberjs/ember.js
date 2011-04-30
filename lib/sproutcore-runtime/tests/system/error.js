// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Error Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

module("SC.ERROR");

test("SC.Error.desc creates an error instance with description,label and code", function() {
  var c = SC.Error.desc('This is an error instance','Error Instance', "FOO", 99999);
  equals(SC.T_ERROR,SC.typeOf(c),'Error instance');
  equals('This is an error instance',c.message,'Description');
  equals('Error Instance',c.label,'Label');
  equals(c.get('errorValue'), "FOO", 'error value should be set');
  equals(99999,c.code,'Code');
});

test("SC.$error creates an error instance with description,label and code",function(){
  var d = SC.$error('This is a new error instance','New Error Instance', "FOO", 99999);
  equals(SC.T_ERROR,SC.typeOf(d),'New Error instance');
  equals('This is a new error instance',d.message,'Description');
  equals('New Error Instance',d.label,'Label');
  equals(d.get('errorValue'), "FOO", 'error value should be set');
  equals(99999,d.code,'Code');
});

test("SC.$ok should return YES if the passed value is an error object or false", function() {
  ok(SC.$ok(true), '$ok(true) should be YES');
  ok(!SC.$ok(false), '$ok(false) should be NO');
  ok(SC.$ok(null), '$ok(null) should be YES');
  ok(SC.$ok(undefined), '$ok(undefined) should be YES');
  ok(SC.$ok("foo"), '$ok(foo) should be YES');
  ok(!SC.$ok(SC.$error("foo")), '$ok(SC.Error) should be NO');

  ok(!SC.$ok(new SC.Error()), '$ok(Error) should be NO');
  ok(!SC.$ok(SC.Object.create({ isError: YES })), '$ok({ isError: YES }) should be NO');
});

test("SC.$val should return the error value if it has one", function() {
  equals(SC.val(true), true, 'val(true) should be true');
  equals(SC.val(false), false, 'val(false) should be false');
  equals(SC.val(null), null, 'val(null) should be YES');
  equals(SC.val(undefined), undefined, '$ok(undefined) should be YES');
  equals(SC.val("foo"), "foo", 'val(foo) should be YES');
  equals(SC.val(SC.$error("foo", "FOO", "BAZ")), "BAZ", 'val(SC.Error) should be BAZ');
  equals(SC.val(SC.$error("foo", "FOO")), undefined, 'val(SC.Error) should be undefined');
  equals(SC.val(new SC.Error()), null, 'val(Error) should be null');
  equals(SC.val(SC.Object.create({ isError: YES, errorValue: "BAR" })), "BAR", 'val({ isError: YES, errorValue: BAR }) should be BAR');
});

test("errorObject property should return the error itself", function() {
  var er = SC.$error("foo");
  equals(er.get('errorObject'), er, 'errorObject should return receiver');
});

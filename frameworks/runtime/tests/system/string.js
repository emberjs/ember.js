// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok isObj equals expects */

// Note that these unit tests are calling SC.String.fmt directly, which has a different
// signature than String.prototype.fmt does.

module("String Formatting");
test("Passing ordered arguments", function() {
  equals(SC.String.fmt("%@, %@%@", ["Hello", "World", "!"]), "Hello, World!");
});

test("Passing indexed arguments", function() {
  equals(SC.String.fmt("%@2, %@3%@1", ["!", "Hello", "World"]), "Hello, World!");
});

test("Passing named arguments", function() {
  // NOTE: usually, "str".fmt() would be called. Because we are calling String.fmt,
  // which takes an array of arguments, we have to pass the arguments as an array.
  equals(SC.String.fmt("%{first}, %{last}%{punctuation}", [
    { first: "Hello", last: "World", "punctuation": "!" }
  ]), "Hello, World!");
});

test("Passing incomplete named arguments", function() {
  equals( SC.String.fmt("%{first}, %{last}%{punctuation}", [{first: 'Hello', punctuation: '!'}]), "Hello, %{last}!", "Formatting a string with an incomplete set of named arguments should leave unspecified named arguments in place." );
})

test("Passing arguments with formatters", function() {
  var F = function(value) {
    return "$" + value;
  };
  
  equals(SC.String.fmt("%{number}", [{ number: 12, numberFormatter: F }]), "$12", "Formatter was applied");
});

test("Passing formatting strings with formatters", function() {
  var F = function(value, arg) {
    return "$" + value + ";" + arg;
  };
  
  equals(SC.String.fmt("%{number:blah}", [{ number: 12, numberFormatter: F }]), "$12;blah", "Formatter was applied with argument");
});
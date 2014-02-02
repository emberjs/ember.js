// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

var context = null;

module("SC.RenderContext#begin", {
  setup: function() {
    context = SC.RenderContext();
  }
});

test("should return a new context with parent context as prevObject", function() {
  var c2 = context.begin();
  ok(c2 !== context, "new context");
  equals(c2.prevObject, context, 'previous context');
});

test("should set offset for new context equal to length of previous context", function() {
  context.push("line1");
  var expected = context.length ;
  var c2 = context.begin();
  equals(c2.offset, expected, "offset");
});

test("should copy same strings array to new child context", function() {
  context.push("line1");
  var c2 =context.begin();
  equals(c2.strings, context.strings);
});

test("should start new context with length of 1 (reserving a space for opening tag)", function() {
  context.push("line1");
  var c2 = context.begin() ;
  equals(c2.length, 1, 'has empty line');
  equals(c2.strings.length, 3, "parent empty line + parent line + empty line");
});

test("should assign passed tag name to new context", function() {
  var c2 = context.begin('foo');
  equals(c2.tagName(), 'foo', 'tag name');
});

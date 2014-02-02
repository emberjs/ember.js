// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context */

var context = null;

module("SC.RenderContext#get", {
  setup: function() {
    context = SC.RenderContext();
  },
  
  teardown: function() {
    context = null;
  }
});

test("it should return strings array with space for top tag if no params passed and no strings pushed yet", function() {
  same(context.get(), [null]);
});

test("it should return full strings array if no params passed and no strings pushed yet", function() {
  context.push("line1");
  same(context.get(), [null, "line1"]);
});

test("it should return individual string if index passed that is within current length", function() {
  context.push("line1");
  equals(context.get(1), "line1");
});

test("it should return undefined if index passed that is outside of current range", function() {
  context.push("line1");
  equals(context.get(3), undefined);
});

// test this special case since the internal strings array is created lazily.
test("it should return undefined if index passed and no strings set yet", function() {
  equals(context.get(2), undefined);
});

test("it should return the value based on an index from the context offset of the context is chained", function() {
  context.push('line1', 'line2');
  var childContext = context.begin();
  childContext.push("NEXT");
  equals(childContext.get(1), "NEXT", 'gets child line');
}) ;

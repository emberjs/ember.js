// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context */

var context = null;

module("SC.RenderContext#init");

test("it should return a new context object with the passed tag name", function() {
  equals(SC.RenderContext('foo').tagName(), 'foo', 'tag name');
});

test("it should use a default tag name of div if not passed", function() {
  equals(SC.RenderContext().tagName(), 'div', 'tag name');
});

test("it should lowercase any tag name passed in", function() {
  equals(SC.RenderContext('DIV').tagName(), 'div', 'lowercase tag name');
});

test("it should have a length of 1 with a null value for the first time, saving space for the opening tag", function() {
  var context = SC.RenderContext();
  equals(context.length, 1, 'context length');
  equals(context.get(0), null, 'first item');
});

test("if script tag is passed, should mark context._selfClosing as NO" ,function() {
  var context = SC.RenderContext('script');
  ok(context._selfClosing === NO, "selfClosing MUST be no");
  
  context = SC.RenderContext('SCRIPT');
  ok(context._selfClosing === NO, "selfClosing MUST be no 2");
});

test("if element is passed, it should save element and not reserve space for string output", function() {
  var elem = document.createElement('div');
  var context = SC.RenderContext(elem);
  equals(context.length, 0, 'no length');
  equals(context._elem, elem, 'element');
  elem = context._elem = null; //cleanup
});

test("offset should should use offset + length of parent for self", function() {
  var context =SC.RenderContext('div');
  context.offset = 2;
  context.length = 3;
  var newContext = SC.RenderContext('div', context);
  equals(newContext.offset, 5, 'has proper offset');
});


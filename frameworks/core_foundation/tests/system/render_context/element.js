// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

var context = null;

module("SC.RenderContext#element", {
  setup: function() {
    context = SC.RenderContext() ;
  },
  
  teardown: function() {
    context = null;
  }
});

test("converts context to a DOM element and returns root element if there is one", function() {
  context.id('foo');
  var elem = context.element();
  ok(elem, 'elem not null');
  equals(elem.tagName.toString().toLowerCase(), 'div', 'is div');
  equals(elem.id.toString(), 'foo', 'is id=foo');
  elem = null ;
});

test("returns null if context does not generate valid element", function() {
  context = SC.RenderContext(null);
  var elem = context.element();
  equals(elem, null, 'should be null');
  elem = null;
});

test("returns first element if context renders multiple element", function() {
  context.tag('div').tag('span');
  var elem = context.element();
  ok(elem, 'elem not null');
  equals(elem.tagName.toString().toLowerCase(), 'div', 'is div');
  elem = null;
});

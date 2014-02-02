// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

var context = null;

// ..........................................................
// classes()
//
module("SC.RenderContext#classes", {
  setup: function() {
    context = SC.RenderContext() ;
  }
});

test("returns empty array if no current class names", function() {
  same(context.classes(), [], 'classes') ;
});

test("addClass(array) updates class names", function() {
  var cl = 'bar baz'.w();
  equals(context.addClass(cl), context, "returns receiver");
  same(context.classes(), cl, 'class names');
});

test("returns classes if set", function() {
  context.addClass('bar');
  same(context.classes(), ['bar'], 'classNames');
});

test("clone on retrieval if addClass(array) set", function() {
  var cl = 'foo bar'.w();
  context.addClass(cl);

  var result = context.classes();
  ok(result !== cl, "class name is NOT same instance");
  same(result, cl, "but arrays are equivalent");

  equals(result, context.classes(), "2nd retrieval is same instance");
});

test("extracts class names from element on first retrieval", function() {
  var elem = document.createElement('div');
  SC.$(elem).attr('class', 'foo bar');
  context = SC.RenderContext(elem);

  var result = context.classes();
  same(result, ['foo', 'bar'], 'extracted class names');
});

// ..........................................................
// hasClass()
//
module("SC.RenderContext#hasClass", {
  setup: function() {
    context = SC.RenderContext().addClass('foo bar'.w()) ;
  }
});

test("should return true if context classNames has class name", function() {
  equals(YES, context.hasClass('foo'), 'should have foo');
});

test("should return false if context classNames does not have class name", function() {
  equals(NO, context.hasClass('imaginary'), "should not have imaginary");
});

test("should return false if context has no classNames", function() {
  context = context.begin('div');
  ok(context.classes().length === 0, 'precondition - context has no classNames');
  equals(NO, context.hasClass('foo'), 'should not have foo');
});

// ..........................................................
// addClass()
//
module("SC.RenderContext#addClass", {
  setup: function() {
    context = SC.RenderContext().addClass('foo') ;
  }
});

test("should return receiver", function() {
  equals(context.addClass('foo'), context, "receiver");
});

test("should add class name to existing classNames array on currentTag", function() {
  context.addClass('bar');
  same(context.classes(), ['foo', 'bar'], 'has classes');
  equals(context._classesDidChange, YES, "note did change");
});

test("should only add class name once - does nothing if name already in array", function() {
  same(context.classes(), ['foo'], 'precondition - has foo classname');
  context._classesDidChange = NO; // reset  to pretend once not modified

  context.addClass('foo');
  same(context.classes(), ['foo'], 'no change');
  equals(context._classesDidChange, NO, "note did not change");
});

// ..........................................................
// removeClass()
//
module("SC.RenderContext#removeClass", {
  setup: function() {
    context = SC.RenderContext().addClass(['foo', 'bar']) ;
  }
});

test("should remove class if already in classNames array", function() {
  ok(context.classes().indexOf('foo')>=0, "precondition - has foo");

  context.removeClass('foo');
  ok(context.classes().indexOf('foo')<0, "does not have foo");
});

test('should return receiver', function() {
  equals(context.removeClass('foo'), context, 'receiver');
});

test("should do nothing if class name not in array", function() {
  context._classesDidChange = NO; // reset to pretend not modified
  context.removeClass('imaginary');
  same(context.classes(), 'foo bar'.w(), 'did not change');
  equals(context._classesDidChange, NO, "note did not change");
});

test("should do nothing if there are no class names", function() {
  context = context.begin();
  same(context.classes(), [], 'precondition - no class names');
  context._classesDidChange = NO; // reset to pretend not modified

  context.removeClass('foo');
  same(context.classes(), [], 'still no class names -- and no errors');
  equals(context._classesDidChange, NO, "note did not change");
});

// ..........................................................
// setClass
//
module("SC.RenderContext#setClass", {
  setup: function() {
    context = SC.RenderContext().addClass('foo') ;
  }
});

test("should add named class if shouldAdd is YES", function() {
  ok(!context.hasClass("bar"), "precondition - does not have class bar");
  context.setClass("bar", YES);
  ok(context.hasClass("bar"), "now has bar");
});

test("should remove named class if shouldAdd is NO", function() {
  ok(context.hasClass("foo"), "precondition - has class foo");
  context.setClass("foo", NO);
  ok(!context.hasClass("foo"), "should not have foo ");
});

test("should return receiver", function() {
  equals(context, context.setClass("bar", YES), "returns receiver");
});

test("should add/remove all classes if a hash of class names is passed", function() {
  ok(context.hasClass("foo"), "precondition - has class foo");
  ok(!context.hasClass("bar"), "precondition - does not have class bar");

  context.setClass({ foo: NO, bar: YES });

  ok(context.hasClass("bar"), "now has bar");
  ok(!context.hasClass("foo"), "should not have foo ");
});

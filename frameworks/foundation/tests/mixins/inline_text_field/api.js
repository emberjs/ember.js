// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start Q$ */

var field, view;

/**
  Track the public functions and properties of the class.  This will serve as an early warning
  when functions that people may depend on disappear between versions to ensure that we don't
  break promised support without proper deprecations.

  tylerkeating: This is probably redundant since each of these functions and properties should
  be individually tested elsewhere.
*/
module("Test the public functions and properties of SC.InlineTextFieldView", {
  setup: function() {
    view = SC.View.create(SC.InlineEditable, {});
    field = SC.InlineTextFieldView.create({});
  },

  teardown: function() {
    field = null;
  }
});

test("contains all public functions",
function() {
  ok(field.respondsTo('beginEditing'), "should respond to beginEditing()");
  ok(field.respondsTo('commitEditing'), "should respond to commitEditing()");
  ok(field.respondsTo('discardEditing'), "should respond to discardEditing()");
  ok(field.respondsTo('blurEditor'), "should respond to blurEditor()");
  ok(field.respondsTo('cancel'), "should respond to cancel()");
});

test("a view with SC.InlineEditable mixin contains all public functions",
function() {
  ok(view.respondsTo('beginEditing'), "should respond to beginEditing()");
  ok(view.respondsTo('commitEditing'), "should respond to commitEditing()");
  ok(view.respondsTo('discardEditing'), "should respond to discardEditing()");
});

test("contains all public properties",
function() {
  ok(field.get('isEditing') !== undefined, "should have isEditing property");
});

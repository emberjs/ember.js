// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

(function() {

var fakeDelegate, fakeEditor, view;

fakeDelegate = {
  acquireEditorCalled: NO,
  acquireEditorAllowed: YES,
  acquireEditor: function() {
    this.acquireEditorCalled = YES;

    return this.acquireEditorAllowed ? fakeEditor : null;
  },

  shouldBeginCalled: NO,
  shouldBeginAllowed: YES,
  inlineEditorShouldBeginEditing: function() {
    this.shouldBeginCalled = YES;

    return this.shouldBeginAllowed;
  },

  willBeginCalled: NO,
  inlineEditorWillBeginEditing: function() {
    this.willBeginCalled = YES;
  },

  didBeginCalled: NO,
  inlineEditorDidBeginEditing: function() {
    ok(this.willBeginCalled, "willBegin was called before didBegin");
    this.didBeginCalled = YES;
  },

  inlineEditorShouldDiscardEditing: function() {
    return YES;
  }
};

fakeEditor = SC.View.create(SC.InlineEditor, {
  inlineEditorDelegate: fakeDelegate,

  beginEditingCalled: NO,
  beginEditingAllowed: YES,
  beginEditing: function(original, editable) {
    this.beginEditingCalled = YES;

    var ret = original(editable);

    return this.beginEditingAllowed ? ret : NO;
  }.enhance()
});

view = SC.View.create(SC.InlineEditable, {
  inlineEditorDelegate: fakeDelegate
});

function reset() {
  if(fakeEditor.isEditing) fakeEditor.discardEditing();

  fakeDelegate.shouldBeginCalled = NO;
  fakeDelegate.acquireEditorCalled = NO;
  fakeEditor.beginEditingCalled = NO;
  fakeDelegate.willBeginCalled = NO;
  fakeDelegate.didBeginCalled = NO;
};

module("SC.InlineEditor.beginEditing");

test("beginEditing succeeds when passed a target", function() {
  reset();

  ok(fakeEditor.beginEditing(view), "beginEditing succeeded");
});

test("beginEditing fails when not passed a target", function() {
  reset();

  ok(!fakeEditor.beginEditing(), "beginEditing failed");
});

test("beginEditing calls willBegin and didBegin in order", function() {
  reset();

  SC.run(function() {
    ok(fakeEditor.beginEditing(view), "beginEditing succeeded");
  }, undefined, YES);

  ok(fakeDelegate.willBeginCalled, "willBegin was called");

  ok(fakeDelegate.didBeginCalled, "didBegin was called");
});

test("beginEditing does not call delegate methods on failure", function() {
  reset();

  SC.run(function() {
    ok(!fakeEditor.beginEditing(), "beginEditing failed");
  }, undefined, YES);

  ok(!fakeDelegate.willBeginCalled, "willBegin was not called");

  ok(!fakeDelegate.didBeginCalled, "didBegin was not called");
});

})();



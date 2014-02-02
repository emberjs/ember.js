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

module('SC.InlineEditable.beginEditing');

test("beginEditing calls shouldBegin and acquireEditor and returns YES on success", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = YES;

  fakeDelegate.acquireEditorAllowed = YES;

  fakeEditor.beginEditingAllowed = YES;

  ok(view.beginEditing(), "beginEditing succeeded");

  ok(fakeDelegate.shouldBeginCalled, "shouldBegin was called");

  ok(fakeDelegate.acquireEditorCalled, "acquireEditor was called");

  ok(fakeEditor.beginEditingCalled, "beginEditing was called");
});

test("beginEditing should fail when shouldBegin returns NO", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = NO;

  fakeDelegate.acquireEditorAllowed = YES;

  fakeEditor.beginEditingAllowed = YES;

  ok(!view.beginEditing(), "beginEditing failed");

  ok(fakeDelegate.shouldBeginCalled, "shouldBegin was called");

  ok(!fakeDelegate.acquireEditorCalled, "acquireEditor was not called");

  ok(!fakeEditor.beginEditingCalled, "beginEditing was not called");
});

test("beginEditing should return NO without throwing an error if acquire returns null", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = YES;

  fakeDelegate.acquireEditorAllowed = NO;

  fakeEditor.beginEditingAllowed = YES;

  ok(!view.beginEditing(), "beginEditing failed");

  ok(fakeDelegate.shouldBeginCalled, "shouldBegin was called");

  ok(fakeDelegate.acquireEditorCalled, "acquireEditor was called");

  ok(!fakeEditor.beginEditingCalled, "beginEditing was not called");
});

test("beginEditing should fail if inlineEditor.beginEditing fails", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = YES;

  fakeDelegate.acquireEditorAllowed = YES;

  fakeEditor.beginEditingAllowed = NO;

  ok(!view.beginEditing(), "beginEditing failed");

  ok(fakeDelegate.shouldBeginCalled, "shouldBegin was called");

  ok(fakeDelegate.acquireEditorCalled, "acquireEditor was called");

  ok(fakeEditor.beginEditingCalled, "beginEditing was called");
});

test("delegate methods should be called in order on success", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = YES;
  fakeDelegate.acquireEditorAllowed = YES;

  fakeEditor.beginEditingAllowed = YES;

  SC.run(function() {
    ok(view.beginEditing(), "beginEditing succeeded");
  }, undefined, YES);

  ok(fakeDelegate.willBeginCalled, "willBegin was called");

  ok(fakeDelegate.didBeginCalled, "didBegin was called");
});

test("delegate methods should not be called on failure", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = NO;
  fakeDelegate.acquireEditorAllowed = YES;

  fakeEditor.beginEditingAllowed = YES;

  SC.run(function() {
    ok(!view.beginEditing(), "beginEditing failed");
  }, undefined, YES);

  ok(!fakeDelegate.willBeginCalled, "willBegin was not called");

  ok(!fakeDelegate.didBeginCalled, "didBegin was not called");
});

test("beginEditing should fail if already editing", function() {
  reset();

  fakeDelegate.shouldBeginAllowed = YES;
  fakeDelegate.acquireEditorAllowed = YES;

  ok(view.beginEditing(), "first begin succeeded");

  ok(!view.beginEditing(), "second begin failed");
});

})();


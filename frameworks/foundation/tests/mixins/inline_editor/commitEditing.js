// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

(function() {

var fakeDelegate, fakeEditor, view;

fakeDelegate = {
  acquireEditor: function() {
    return fakeEditor;
  },

  shouldCommitCalled: NO,
  shouldCommitAllowed: YES,
  inlineEditorShouldCommitEditing: function() {
    this.shouldCommitCalled = YES;

    return this.shouldCommitAllowed;
  },

  willCommitCalled: NO,
  inlineEditorWillCommitEditing: function() {
    this.willCommitCalled = YES;
  },

  didCommitCalled: NO,
  inlineEditorDidCommitEditing: function() {
    this.didCommitCalled = YES;
    ok(this.willCommitCalled, "willCommit called before didCommit");

    view._endEditing();
  }
};

fakeEditor = SC.View.create(SC.InlineEditor, {
  inlineEditorDelegate: fakeDelegate,

  beginEditing: function(original, editable) {
    return original(editable);
  }.enhance(),

  commitEditingCalled: NO,
  commitEditingAllowed: YES,
  commitEditing: function(original) {
    this.commitEditingCalled = YES;

    var ret = original();

    return this.commitEditingAllowed ? ret : NO;
  }.enhance()
});

view = SC.View.create(SC.InlineEditable, {
  inlineEditorDelegate: fakeDelegate
});

function reset() {
  if(fakeEditor.isEditing) fakeEditor.discardEditing();

  fakeDelegate.shouldCommitCalled = NO;
  fakeEditor.commitEditingCalled = NO;

  fakeDelegate.willCommitCalled = NO;
  fakeDelegate.didCommitCalled = NO;
}

module('SC.InlineEditable.commitEditing');

test("commitEditing should ask shouldCommit and then call commitEditing", function() {
  reset();

  fakeDelegate.shouldCommitAllowed = YES;
  fakeEditor.commitEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(fakeEditor.commitEditing(), "commitEditing successful");

  ok(fakeEditor.commitEditingCalled, "commitEditing called");

  ok(fakeDelegate.shouldCommitCalled, "shouldCommit called");
});

test("commitEditing should fail if shouldCommit returns false", function() {
  reset();

  fakeDelegate.shouldCommitAllowed = NO;
  fakeEditor.commitEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(!fakeEditor.commitEditing(), "commitEditing failed");

  ok(fakeEditor.commitEditingCalled, "commitEditing called");

  ok(fakeDelegate.shouldCommitCalled, "shouldCommit called");
});

test("commitEditing should cleanup properly on success", function() {
  reset();

  fakeDelegate.shouldCommitAllowed = YES;
  fakeEditor.commitEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(fakeEditor.commitEditing(), "committed editing");

  ok(view.beginEditing(), "cleaned up successfully on commit");
});

test("delegate methods are called in order by commitEditing", function() {
  reset();

  fakeDelegate.shouldCommitAllowed = YES;
  fakeEditor.commitEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  SC.run(function() {
    ok(fakeEditor.commitEditing(), "committed editing");
  }, undefined, YES);

  ok(fakeDelegate.willCommitCalled, "willCommit was called");

  ok(fakeDelegate.didCommitCalled, "didCommit was called");
});

test("delegate methods are not called when commitEditing fails", function() {
  reset();

  fakeDelegate.shouldCommitAllowed = NO;
  fakeEditor.commitEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  SC.run(function() {
    ok(!fakeEditor.commitEditing(), "commit failed");
  }, undefined, YES);

  ok(!fakeDelegate.willCommitCalled, "willCommit was not called");

  ok(!fakeDelegate.didCommitCalled, "didCommit was not called");
});

})();



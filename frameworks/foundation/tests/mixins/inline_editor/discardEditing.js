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

  shouldDiscardCalled: NO,
  shouldDiscardAllowed: YES,
  inlineEditorShouldDiscardEditing: function() {
    this.shouldDiscardCalled = YES;

    return this.shouldDiscardAllowed;
  },

  willDiscardCalled: NO,
  inlineEditorWillDiscardEditing: function() {
    this.willDiscardCalled = YES;
  },

  didDiscardCalled: NO,
  inlineEditorDidDiscardEditing: function() {
    this.didDiscardCalled = YES;
    ok(this.willDiscardCalled, "willDiscard called before didDiscard");

    view._endEditing();
  }
};

fakeEditor = SC.View.create(SC.InlineEditor, {
  inlineEditorDelegate: fakeDelegate,

  beginEditing: function(original, editable) {
    return original(editable);
  }.enhance(),

  discardEditingCalled: NO,
  discardEditingAllowed: YES,
  discardEditing: function(original) {
    this.discardEditingCalled = YES;

    var ret = original();

    return this.discardEditingAllowed ? ret : NO;
  }.enhance()
});

view = SC.View.create(SC.InlineEditable, {
  inlineEditorDelegate: fakeDelegate
});

function reset() {
  if(fakeEditor.isEditing) fakeEditor.commitEditing();

  fakeDelegate.shouldDiscardCalled = NO;
  fakeEditor.discardEditingCalled = NO;

  fakeDelegate.willDiscardCalled = NO;
  fakeDelegate.didDiscardCalled = NO;
}

module('SC.InlineEditable.discardEditing');

test("discardEditing should ask shouldDiscard and then call discardEditing", function() {
  reset();

  fakeDelegate.shouldDiscardAllowed = YES;
  fakeEditor.discardEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(fakeEditor.discardEditing(), "discardEditing successful");

  ok(fakeEditor.discardEditingCalled, "discardEditing called");

  ok(fakeDelegate.shouldDiscardCalled, "shouldDiscard called");
});

test("discardEditing should fail if shouldDiscard returns false", function() {
  reset();

  fakeDelegate.shouldDiscardAllowed = NO;
  fakeEditor.discardEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(!fakeEditor.discardEditing(), "discardEditing failed");

  ok(fakeEditor.discardEditingCalled, "discardEditing called");

  ok(fakeDelegate.shouldDiscardCalled, "shouldDiscard called");
});

test("discardEditing should cleanup properly on success", function() {
  reset();

  // test when successful
  fakeDelegate.shouldDiscardAllowed = YES;
  fakeEditor.discardEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  ok(fakeEditor.discardEditing(), "discardted editing");

  ok(view.beginEditing(), "cleaned up successfully on discard");
});

test("delegate methods are called in order by discardEditing", function() {
  reset();

  fakeDelegate.shouldDiscardAllowed = YES;
  fakeEditor.discardEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  SC.run(function() {
    ok(fakeEditor.discardEditing(), "discardted editing");
  }, undefined, YES);

  ok(fakeDelegate.willDiscardCalled, "willDiscard was called");

  ok(fakeDelegate.didDiscardCalled, "didDiscard was called");
});

test("delegate methods are not called when discardEditing fails", function() {
  reset();

  fakeDelegate.shouldDiscardAllowed = NO;
  fakeEditor.discardEditingAllowed = YES;

  ok(view.beginEditing(), "began editing");

  SC.run(function() {
    ok(!fakeEditor.discardEditing(), "discard failed");
  }, undefined, YES);

  ok(!fakeDelegate.willDiscardCalled, "willDiscard was not called");

  ok(!fakeDelegate.didDiscardCalled, "didDiscard was not called");
});

})();



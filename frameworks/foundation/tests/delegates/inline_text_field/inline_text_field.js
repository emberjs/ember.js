// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

(function() {
var testPane = SC.ControlTestPane.design(), customEditor, commitEditor, discardEditor, failEditor;

testPane.add('label', SC.LabelView, {
  value: "i am a test label"
});

customEditor = SC.View.extend(SC.InlineEditor);

commitEditor = SC.View.extend(SC.InlineEditor, {
  didCommit: NO,

  commitEditing: function() {
    this.didCommit = YES;
    return YES;
  }
});

discardEditor = SC.View.extend(SC.InlineEditor, {
  didCommit: NO,

  commitEditing: function() {
    this.didCommit = YES;
    return NO;
  },

  didDiscard: NO,

  discardEditing: function() {
    this.didDiscard = YES;
    return YES;
  }
});

failEditor = SC.View.extend(SC.InlineEditor, {
  didCommit: NO,

  commitEditing: function() {
    this.didCommit = YES;
    return NO;
  },

  didDiscard: NO,

  discardEditing: function() {
    this.didDiscard = YES;
    return NO;
  }
});


module("SC.InlineTextFieldDelegate basic", testPane.standardSetup());

test("basic acquire and release", function() {
  var label = testPane.view('label');
  var editor = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(editor.kindOf(SC.InlineTextFieldView), "acquired an inlineTextFieldView");
  same(editor.get('pane'), label.get('pane'), "editor created in the correct pane");
  same(editor.get('parentView'), label.get('parentView'), "editor created in the correct parent");

  SC.InlineTextFieldDelegate.releaseEditor(editor);

  ok(editor.isDestroyed, "editor should be destroyed");
  same(editor.get('pane'), null, "editor removed from pane after release");
  same(editor.get('parentView'), null, "editor removed from parent view after release");
});

test("acquire custom editor", function() {
  var label = testPane.view('label');

  label.exampleEditor = customEditor;

  var editor = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(editor.kindOf(customEditor), "acquired a custom editor");
  same(editor.get('pane'), label.get('pane'), "editor created in the correct pane");

  SC.InlineTextFieldDelegate.releaseEditor(editor);

  same(editor.get('pane'), null, "editor removed from pane after release");
});

test("if second editor is requested, commit the first", function() {
  var label = testPane.view('label');

  label.exampleEditor = commitEditor;

  var first = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(first, "first editor was acquired");

  first.isEditing = YES;

  var second = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(first.didCommit, "first editor was committed");
  ok(!first.didDiscard, "first editor was not discarded");

  ok(second, "second editor was acquired");

  SC.InlineTextFieldDelegate.releaseEditor(first);
  SC.InlineTextFieldDelegate.releaseEditor(second);
});

test("if second editor is requested, commit the first, and discard if commit fails", function() {
  var label = testPane.view('label');

  label.exampleEditor = discardEditor;

  var first = SC.InlineTextFieldDelegate.acquireEditor(label);

  first.isEditing = YES;

  var second = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(first.didCommit, "first editor was committed");
  ok(first.didDiscard, "commit failed so discard was called");

  ok(second, "second editor was created");

  SC.InlineTextFieldDelegate.releaseEditor(first);
  SC.InlineTextFieldDelegate.releaseEditor(second);
});

test("if second editor is requested, fail to create second editor if commit and discard fail", function() {
  var label = testPane.view('label');

  label.exampleEditor = failEditor;

  var first = SC.InlineTextFieldDelegate.acquireEditor(label);

  first.isEditing = YES;

  var second = SC.InlineTextFieldDelegate.acquireEditor(label);

  ok(first.didCommit, "first editor was committed");
  ok(first.didDiscard, "commit failed so discard was called");

  equals(second, null, "second editor was not created");

  SC.InlineTextFieldDelegate.releaseEditor(first);
});
})();


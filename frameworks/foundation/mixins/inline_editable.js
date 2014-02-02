// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin is used for views that show a seperate editor view to edit.
  For example, the default behavior of SC.LabelView if isEditable is set
  to YES is to popup an SC.InlineTextFieldView when double clicked. This is a
  seperate text input that will handle the editing and save its value back to
  the label when it is finished.

  To use this functionality, all you have to do is apply this mixin to
  your view. You may define your own SC.InlineEditorDelegate to further
  customize editing behavior.

      MyProject.MyView = SC.View.extend(SC.InlineEditable, {
        inlineEditorDelegate: myDelegate
      });

  The delegate methods will default to your view unless the
  inlineEditorDelegate implements them. Simple views do not require a
  seperate delegate. If your view has a more complicated editing
  interaction, you may also implement a custom delegate. For example, if
  you have a form with several views that all edit together, you might
  set the parent view as the delegate so it can manage the lifecycle and
  layout of the editors.

  See SC.InlineEditorDelegate for more information on using a delegate to
  customize your view's edit behavior.

  Your view can now be edited by calling beginEditing() on it.

      myView.beginEditing();

  This will create an editor for the view. You can then end the editing process
  by calling commitEditing() or discardEditing() on either the view or the
  editor. commitEditing() will save the value and discard will revert to the
  original value.

      myView.commitEditing();
      myView.discardEditing();

  Note that the editor is a private property of the view, so the only views that
  should be able to access the methods on it are the editor itself, the view it
  is editing, and their delegates.
*/
SC.InlineEditable = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  isInlineEditable: YES,

  /**
    Flag to enable or disable editing.

    @type Boolean
    @default YES
  */
  isEditable: YES,

  /**
    The view that will be used to edit this view. Defaults to
    SC.InlineTextFieldView, which is simply a text field that positions itself
    over the view being edited.

    @type SC.InlineEditor
    @default SC.InlineTextFieldView
  */
  exampleEditor: SC.InlineTextFieldView,

  /**
    Indicates whether the view is currently editing. Attempting to
    beginEditing a view that is already editing will fail.

    @type Boolean
    @default NO
  */
  isEditing: NO,

  /**
    Delegate that will be notified of events related to the editing
    process. Also responsible for managing the lifecycle of the editor.

    @type SC.InlineEditorDelegate
    @default SC.InlineTextFieldDelegate
  */
  inlineEditorDelegate: SC.InlineTextFieldDelegate,

  /**
    @private
    The editor responsible for editing this view.
  */
  _editor: null,

  /**
    Tells the view to start editing. This will create an editor for it
    and transfer control to the editor.

    Will fail if the delegate returns NO to inlineEditorShouldBeginEditing.

    @returns {Boolean} whether the view successfully entered edit mode
  */
  beginEditing: function() {
    var del;

    del = this.delegateFor('inlineEditorShouldBeginEditing', this.inlineEditorDelegate);
    if(del && !del.inlineEditorShouldBeginEditing(this, this.get('value'))) return NO;

    this._editor = this.invokeDelegateMethod(this.inlineEditorDelegate, 'acquireEditor', this);

    if(this._editor) return this._editor.beginEditing(this);
    else return NO;
  },

  /**
    Tells the view to save the value currently in the editor and finish
    editing. The delegate will be consulted first by calling
    inlineEditorShouldCommitEditing, and the operation will not be
    allowed if the delegate returns NO.

    Will fail if the delegate returns NO to inlineEditorShouldCommitEditing.

    @returns {Boolean} whether the delegate allowed the value to be committed
  */
  commitEditing: function() {
    return this._editor ? this._editor.commitEditing() : NO;
  },

  /**
    Tells the view to leave edit mode and revert to the value it had
    before editing. May fail if the delegate returns NO to
    inlineEditorShouldDiscardEditing. It is possible for the delegate to
    return false to inlineEditorShouldDiscardEditing but true to
    inlineEditorShouldCommitEditing, so a client view may attempt to
    call commitEditing in case discardEditing fails.

    Will fail if the delegate returns NO to inlineEditorShouldDiscardEditing.

    @returns {Boolean} whether the delegate allowed the view to discard its value
  */
  discardEditing: function() {
    return this._editor ? this._editor.discardEditing() : NO;
  },

  /**
    Allows the view to begin editing if it is editable and it is not
    already editing.

    @returns {Boolean} if the view is allowed to begin editing
  */
  inlineEditorShouldBeginEditing: function() {
    return !this.get('isEditing') && this.get('isEditable');
  },

  // TODO: implement validator
  /**
    By default, the editor starts with the value of the view being edited.

    @params {SC.InlineEditable} editor the view being edited
    @params {SC.InlineEditor} value the editor for the view
    @params {Object} editable the initial value of the editor
  */
  inlineEditorWillBeginEditing: function(editor, value, editable) {
    editor.set('value', this.get('value'));
  },

  /**
    Sets isEditing to YES once editing has begun.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidBeginEditing: function(editor, value, editable) {
    this.set('isEditing', YES);
  },

  /** @private
    Calls inlineEditorWillEndEditing for backwards compatibility.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorWillCommitEditing: function(editor, value, editable) {
    if(this.inlineEditorWillEndEditing) this.inlineEditorWillEndEditing(editor, value);
  },

  /**
    By default, commiting editing simply sets the value that the editor
    returned and cleans up.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidCommitEditing: function(editor, value, editable) {
    editable.setIfChanged('value', value);

    if(this.inlineEditorDidEndEditing) this.inlineEditorDidEndEditing(editor, value);

    this._endEditing();
  },

  /**
    Calls inlineEditorWillEndEditing for backwards compatibility.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorWillDiscardEditing: function(editor, editable) {
    if(this.inlineEditorWillEndEditing) this.inlineEditorWillEndEditing(editor, this.get('value'));
  },

  /**
    Calls inlineEditorDidEndEditing for backwards compatibility and then
    cleans up.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidDiscardEditing: function(editor, editable) {
    if(this.inlineEditorDidEndEditing) this.inlineEditorDidEndEditing(editor, this.get('value'));

    this._endEditing();
  },

  /**
    @private
    Shared code used to cleanup editing after both discarding and commiting.
  */
  _endEditing: function() {
    // _editor may be null if we were called using the
    // SC.InlineTextFieldView class methods
    if(this._editor) {
      this.invokeDelegateMethod(this.inlineEditorDelegate, 'releaseEditor', this._editor);
      this._editor = null;
    }

    this.set('isEditing', NO);
  }
};


// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This is the default InlineEditorDelegate for SC.LabelView. The default editor
  is an SC.InlineTextFieldView.

  Only one editor is allowed to be active at a time. If another view requests an
  editor while an editor is already active, the delegate will first attempt to
  commit the existing editor, then discard it if commit fails, and fail to
  acquire if the active editor could not be discarded.

  Each time an editor is required, it instantiates it and appends it to the same
  parentView as the view being edited. The editor is responsible for positioning
  itself correctly in its beginEditing method.

  @since SproutCore 1.0
*/
SC.InlineTextFieldDelegate = /** @scope SC.InlineTextFieldDelegate */{

  /**
    The current shared inline editor.

    @type SC.InlineTextFieldView
  */
  editor: null,

  /**
    If an editor is currently active, dismisses it by first attempting to commit
    and if that fails attempting to dismiss. If that fails, the acquire fails
    and returns null.

    Otherwise, it creates the editor as a child of the client view's parentView
    and returns it.

    The default editor is an SC.InlineTextFieldView. The client view may
    customize this by setting a different inlineEditor as its exampleEditor
    property.

    @param {SC.InlineEditable} label the label that is requesting an editor
    @returns {SC.InlineEditor} the editor the label should use to edit
  */
  acquireEditor: function (label) {
    var editor = this.editor;

    if (editor) {
      // attempt to end editing on the previous editor and return null if unable
      // to end editing successfully
      if (editor.get('isEditing') && !editor.commitEditing() && !editor.discardEditing()) return null;

      // now release it
      this.releaseEditor(editor);
    }

    // default to SC.InlineTextFieldView
    var exampleEditor = label.exampleEditor ? label.exampleEditor : SC.InlineTextFieldView,
    parentView = label.get('parentView');

    // set ourself as the delegate for the editor
    editor = this.editor = parentView.createChildView(exampleEditor, {
      inlineEditorDelegate: this
    });

    parentView.appendChild(editor);

    return editor;
  },

  /**
    Cleans up the given editor by simply destroying it, which removes it from
    the view hierarchy. The client view should null any references to the editor
    so it may be garbage collected.

    @params {SC.InlineEditor} editor the editor that should be cleaned up
    @returns {Boolean} whether the cleanup succeeded
  */
  releaseEditor: function (editor) {
    editor.destroy();

    this.editor = null;

    return YES;
  }
};


// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin is for a view that is editable but is acting as a proxy to
  edit another view. For example, a calendar picker that pops up over
  top of a date display.

  Instantiation and destruction will be handled by the InlineEditorDelegate
  defined on the InlineEditable view.

  Any runtime configuration should be handled by the delegate's
  inlineEditorWillBeginEditing method. This will be done at the start of the
  beginEditing function, so your view should be able to handle having value
  changed by this method.

  Your view should also be sure to cleanup completely when editing is finished,
  because the delegate may decide to reuse the same editor elsewhere.

  See SC.InlineTextFieldView for an example of an implementation of
  SC.InlineEditor.
*/
SC.InlineEditor = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
    @readOnly
  */
  isInlineEditor: YES,

  /**
    Indicates the view is currently editing. For a typical editor, this
    will always be true as long as the view exists, but some
    InlineEditorDelegates may have more complex lifecycles in which
    editors are reused.

    @type Boolean
    @default NO
  */
  isEditing: NO,

  /**
    The delegate responsible for the editors lifecycle as well as the
    target for notifications. This property should be set when the
    delegate creates the editor and does not need to be in the view
    definition.

    @type SC.InlineEditorDelegate
    @default null
  */
  inlineEditorDelegate: null,

  /**
    @private
    The view that this view is responsible for editing.
    @type SC.InlineEditable
  */
  _target: null,

  /**
    Tells the editor to begin editing another view with the given starting value.
    Editors may be reused so make sure that the editor is fully cleaned
    up and reinitialized.

    Sets isEditing to YES.

    Will fail if the editor is already editing.

    If you override this method, be sure to call sc_super() at the beginning of
    you function so that the delegate will be able to configure the view when it
    is notified of the inlineEditorWillBeginEditing event.

    @param {SC.View} editable the view being edited
    @returns {Boolean} whether the editor was able to successfully begin editing
  */
  beginEditing:function(editable) {
    if(this.get('isEditing') || !editable || !editable.isInlineEditable) return NO;

    var del, target;

    target = this._target = editable;

    del = this.delegateFor('inlineEditorWillBeginEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillBeginEditing(this, this.get('value'), target);

    this.set('isEditing', YES);

    // needs to be invoked last because it needs to run after the view becomes
    // first responder
    this.invokeLast(this._callDidBegin);

    // remember that we invoked in case commit gets called before the invoke
    // goes off
    this._didBeginInvoked = YES;

    return YES;
  },

  /**
    @private
    Notifies the delegate of the didBeginEditing event. Needs to be invoked last
    because becoming first responder doesn't happen until the end of the runLoop
    and didBegin is supposed to occur after the editor becomes first responder.
  */
  _callDidBegin: function() {
    // don't notify if we already ended editing
    if(!this.get('isEditing')) return NO;

    this._didBeginInvoked = NO;

    var target = this._target, del;

    del = this.delegateFor('inlineEditorDidBeginEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidBeginEditing(this, this.get('value'), target);
  },

  /**
    Tells the editor to save its value back to its target view and end
    editing. Since the editor is a private property of the view it is
    editing for, this function should only be called from the editor
    itself. For example, you may want your editor to handle the enter
    key by calling commitEditing on itself.

    Will fail if the editor is not editing or if the delegate returns NO to
    inlineEditorShouldCommitEditing.

    @returns {Boolean} whether the editor was allowed to successfully commit its value
  */
  commitEditing:function() {
    if(!this.get('isEditing')) return NO;

    // if the handler was invoked but never went off, call it now
    if(this._didBeginInvoked) this._callDidBegin();

    var del, target = this._target;

    del = this.delegateFor('inlineEditorShouldCommitEditing', this.inlineEditorDelegate, target);
    if(del && !del.inlineEditorShouldCommitEditing(this, this.get('value'), target)) return NO;

    del = this.delegateFor('inlineEditorWillCommitEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillCommitEditing(this, this.get('value'), target);

    this._endEditing();

    del = this.delegateFor('inlineEditorDidCommitEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidCommitEditing(this, this.get('value'), target);

    return YES;
  },

  /**
    Tells the editor to discard its value and end editing. Like
    commitEditing, this should only be called by other methods of the
    editor. For example, the handle for the escape key might call
    discardEditing.

    Will fail if the editor is not editing or if the delegate returns NO to
    inlineEditorShouldDiscardEditing.

    @returns {Boolean} whether the editor was allowed to discard its value
  */
  discardEditing:function() {
    if(!this.get('isEditing')) return NO;

    // if the handler was invoked but never went off, call it now
    if(this._didBeginInvoked) this._callDidBegin();

    var del, target = this._target;

    del = this.delegateFor('inlineEditorShouldDiscardEditing', this.inlineEditorDelegate, target);
    if(del && !del.inlineEditorShouldDiscardEditing(this, target)) return NO;

    del = this.delegateFor('inlineEditorWillDiscardEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillDiscardEditing(this, target);

    this._endEditing();

    del = this.delegateFor('inlineEditorDidDiscardEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidDiscardEditing(this, target);

    return YES;
  },

  /**
    @private
    Performs the cleanup functionality shared between discardEditing and
    commitEditing.
  */
  _endEditing: function() {
    this.set('isEditing', NO);
    this._target = null;
  }

};

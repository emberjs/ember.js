// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  The Editable mixin is a standard protocol used to activate keyboard editing
  on views that are editable such as text fields, label views and item views.

  You should apply this mixin, or implement the methods, if you are
  designing an item view for a collection and you want to automatically
  trigger editing.

  ## Using Editable Views

  To use a view that includes the Editable mixin, you simply call three
  methods on the view:

    - To begin editing, call beginEditing().  This will make the view first responder and allow the user to make changes to it.  If the view cannot begin editing for some reason, it will return NO.
    - If you want to cancel editing, you should try calling discardEditing().  This will cause the editor to discard its changed value and resign first responder.  Some editors do not support cancelling editing and will return NO.  If this is the case, you may optionally try calling commitEditing() instead to force the view to resign first responder, even though this will commit the changes.
    - If you want to end editing, while saving any changes that were made, try calling commitEditing().  This will cause the editor to validate and apply its changed value and resign first responder.  If the editor cannot validate its contents for some reason, it will return NO.  In this case you may optionally try calling discardEditing() instead to force the view to resign first responder, even though this will discard the changes.

  ## Implementing an Editable View

  To implement a new view that is editable, you should implement the three
  methods defined below: beginEditing(), discardEditing(), and
  commitEditing().  If you already allow editing when your view becomes first
  responder and commit your changes when the view loses first responder status
  then you can simply apply this mixin and not override any methods.


  @since SproutCore 1.0
*/
SC.Editable = {

  /**
    Indicates whether a view is editable or not.  You can optionally
    implement the methods in this mixin to disallow editing is isEditable is
    NO.

    @type Boolean
    @default NO
  */
  isEditable: NO,

  /**
    Indicates whether editing is currently in progress.  The methods you
    implement should generally up this property as appropriate when you
    begin and end editing.

    @type Boolean
    @default NO
  */
  isEditing: NO,

  /**
    Begins editing on the view.

    This method is called by other views when they want you to begin editing.
    You should write this method to become first responder, perform any
    additional setup needed to begin editing and then return YES.

    If for some reason you do not want to allow editing right now, you can
    also return NO.  If your view is already editing, then you should not
    restart editing again but just return YES.

    The default implementation checks to see if editing is allowed, then
    becomes first responder and updates the isEditing property if appropriate.
    Generally you will want to replace this method with your own
    implementation and not call the default.

    @returns {Boolean} YES if editing began or is in progress, NO otherwise
  */
  beginEditing: function() {
    if (!this.get('isEditable')) return NO ;
    if (this.get('isEditing')) return YES ;

    // begin editing
    this.beginPropertyChanges();
    this.set('isEditing', YES) ;
    this.becomeFirstResponder();
    this.endPropertyChanges();

    return YES ;
  },

  /**
    Ends editing on the view, discarding any changes that were made to the
    view value in the meantime.

    This method is called by other views when they want to cancel editing
    that began earlier.  When this method is called you should resign first
    responder, restore the original value of the view and return YES.

    If your view cannot revert back to its original state before editing began
    then you can implement this method to simply return NO.  A properly
    implemented client may try to call commitEditing() instead to force your
    view to end editing anyway.

    If this method is called on a view that is not currently editing, you
    should always just return YES.

    The default implementation does not support discarding changes and always
    returns NO.

    @returns {Boolean} YES if changes were discarded and editing ended.
  */
  discardEditing: function() {
    // if we are not editing, return YES, otherwise NO.

    return !this.get('isEditing') ;
  },

  /**
    Ends editing on the view, committing any changes that were made to the
    view value in the meantime.

    This method is called by other views when they want to end editing,
    saving any changes that were made to the view in the meantime.  When this
    method is called you should resign first responder, save the latest
    value of the view and return YES.

    If your view cannot save the current state of the view for some reason
    (for example if validation fails), then you should return NO.  Properly
    implemented clients may then try to call discardEditing() to force your
    view to resign first responder anyway.

    Some views apply changes to their value immediately during an edit instead
    of waiting for the view to end editing.  If this is the case, you should
    still implement commitEditing but you simply may not save any value
    changes.

    If this method is called on a view that is not currently editing, you
    should always just return YES.

    The default implementation sets isEditing to NO, resigns first responder
    and returns YES.

    @returns {Boolean} YES if changes were discarded and editing ended.
  */
  commitEditing: function() {
    if (!this.get('isEditing')) return YES;
    this.set('isEditing', NO) ;
    this.resignFirstResponder();

    return YES ;
  }

} ;

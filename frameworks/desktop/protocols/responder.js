// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @static

  This protocol defines the allowable responder methods. To implement a
  specific responder method, and a method with the correct signature to your
  class.

  **DO NOT INCLUDE THIS MIXIN**.

  If you try and include this mixin, an error will be raised on startup.

  @author Erich Ocean
  @since SproutCore 1.0
*/
SC.ResponderProtocol = {

  // .......................................................................
  // Mouse Event Handlers
  //

  /**
    Called when the mouse is pressed. You must return `YES` to receive
    mouseDragged and mouseUp in the future.

    @param evt {SC.Event} the mousedown event
    @returns {Boolean} YES to receive additional mouse events, NO otherwise
  */
  mouseDown: function(evt) {},

  /**
    Called when the mouse is released.

    @param evt {SC.Event} the mouseup event
    @returns {Boolean} YES to handle the mouseUp, NO to allow click() and doubleClick() to be called
  */
  mouseUp: function(evt) {},

  /**
    Called when the mouse is dragged, after responding `YES` to a previous `mouseDown`:
    call.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseDragged: function(evt) {},

  /**
    Called when the mouse exits the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseExited: function(evt) {},

  /**
    Called when the mouse enters the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseEntered: function(evt) {},

  /**
    Called when the mouse moves within the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseMoved: function(evt) {},


  /**
    Called when a selectstart event in IE is triggered. **ONLY IE**
    We use it to disable IE accelerators and text selection

    @param evt {SC.Event} the selectstart event
    @returns {void}
  */
  selectStart: function(evt) {},

  /**
     Called when a contextmenu event is triggered. Used to disable contextmenu
     per view.

     @param evt {SC.Event} the contextmenu event
     @returns {void}
   */
  contextMenu: function(evt) {},

  // .......................................................................
  // Event Handlers
  //
  // These methods are called by the input manager in response to keyboard
  // events.  Most of these methods are defined here for you, but not actually
  // implemented in code.

  /**
    Insert the text or act on the key.

    @param {String} the text to insert or respond to
    @returns {Boolean} YES if you handled the method; NO otherwise
  */
  insertText: function(text) {},

  /**
    When the user presses a key-combination event, this will be called so you
    can run the command.

    @param charCode {String} the character code
    @param evt {SC.Event} the keydown event
    @returns {Boolean} YES if you handled the method; NO otherwise
  */
  performKeyEquivalent: function(charCode, evt) { return false; },

  /**
    This method is called if no other view in the current view hierarchy is
    bound to the escape or command-. key equivalent.  You can use this to
    cancel whatever operation is running.

    @param sender {Object} the object that triggered; may be null
    @param evt {SC.Event} the event that triggered the method
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  cancel: function(sender, evt) {},

  /**
    Delete the current selection or delete one element backward from the
    current selection.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  deleteBackward: function(sender, evt) {},

  /**
    Delete the current selection or delete one element forward from the
    current selection.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  deleteForward: function(sender, evt) {},

  /**
    A field editor might respond by selecting the field before it.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertBacktab: function(sender, evt) {},

  /**
    Insert a newline character or end editing of the receiver.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertNewline: function(sender, evt) {},

  /**
    Insert a tab or move forward to the next field.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertTab: function(sender, evt) {},

  /**
    Move insertion point/selection backward one. (i.e. left arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveLeft: function(sender, evt) {},

  /**
    Move the insertion point/selection forward one (i.e. right arrow key)
    in left-to-right text, this could be the left arrow key.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveRight: function(sender, evt) {},

  /**
    Move the insertion point/selection up one (i.e. up arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveUp: function(sender, evt) {},

  /**
    Move the insertion point/selection down one (i.e. down arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveDown: function(sender, evt) {},

  /**
    Move left, extending the selection. - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveLeftAndModifySelection: function(sender, evt) {},

  /**
    Move right, extending the seleciton - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveRightAndModifySelection: function(sender, evt) {},

  /**
    Move up, extending the selection - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveUpAndModifySelection: function(sender, evt) {},

  /**
    Move down, extending selection - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveDownAndModifySelection: function(sender, evt) {},

  /**
    Move insertion point/selection to beginning of document.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveToBeginningOfDocument: function(sender, evt) {},

  /**
    Move insertion point/selection to end of document.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveToEndOfDocument: function(sender, evt) {},

  /**
    Page down

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  pageDown: function(sender, evt) {},

  /**
    Page up

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  pageUp: function(sender, evt) {},

  /**
    Select all

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  selectAll: function(sender, evt) {}

};

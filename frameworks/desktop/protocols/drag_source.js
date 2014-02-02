// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag') ;

/**
  @namespace

  The DragSource protocol is used to dynamically generate multiple types of
  data from a single object.  You must implement this protocol if you want to
  provide the data for a drag event.
*/
SC.DragSource = {

  /**
    This method must be overridden for drag operations to be allowed. 
    Return a bitwise OR'd mask of the drag operations allowed on the
    specified target.  If you don't care about the target, just return a
    constant value.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.View} dropTarget The proposed target of the drop.
    @param {SC.Drag} drag The SC.Drag instance managing this drag.
  */
  dragSourceOperationMaskFor: function(drag, dropTarget) {
    return SC.DRAG_NONE;
  },
  
  /**
    If this property is set to `NO` or is not implemented, then the user may
    modify the drag operation by changing the modifier keys they have 
    pressed.
    
    @type Boolean
    @default NO
  */
  ignoreModifierKeysWhileDragging: NO,
    
  /**
    This method is called when the drag begins. You can use this to do any
    visual highlighting to indicate that the receiver is the source of the 
    drag.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Point} loc The point in *window* coordinates where the drag 
      began.  You can use convertOffsetFromView() to convert this to local 
      coordinates.
  */
  dragDidBegin: function(drag, loc) {},
  
  /**
    This method is called whenever the drag image is moved.  This is
    similar to the `dragUpdated()` method called on drop targets.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Point} loc  The point in *window* coordinates where the drag 
      mouse is.  You can use convertOffsetFromView() to convert this to local 
      coordinates.
  */
  dragDidMove: function(drag, loc) {},
  
  /**
    This method is called when the drag ended. You can use this to do any
    cleanup.  The operation is the actual operation performed on the drag.
    
    @param {SC.Drag} drag The drag instance managing the drag.
    @param {Point} loc The point in WINDOW coordinates where the drag
      ended.
    @param {DragOp} op The drag operation that was performed. One of
      SC.DRAG_COPY, SC.DRAG_MOVE, SC.DRAG_LINK, or SC.DRAG_NONE.
  */
  dragDidEnd: function(drag, loc, op) {}

};

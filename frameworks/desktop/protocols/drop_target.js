// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag');

/**
  @namespace
  
  Implement the DropTarget protocol in your view to be able to accept drop events. You 
  should define the methods below as needed to handle accepting of events.
  
  See the method descriptions for more information on what you need to implement.
  
  The general call sequence for all drop targets is (in pseudo-Ragel, regex
  format):
  
      dragStarted
      (
        computeDragOperations+
        (
          dragEntered
          dragUpdated
          ( computeDragOperations | dragUpdated )*
          ( acceptDragOperation performDragOperation? )? // mouseUp
          dragExited
        )*
      )*
      dragEnded
  
  Thus, every drop target will have its dragStarted and dragEnded methods called 
  once during every drag session. computeDragOperations, if called at all, may be 
  called more than once before the dragEntered method is called. Once dragEntered 
  is called, you are at guaranteed that both dragUpdated and dragExited will be 
  called at some point, followed by either dragEnded or additional 
  computeDragOperation calls.
*/
SC.DropTarget = {
  
  /**
    Must be true when your view is instantiated.
    
    Drop targets must be specially registered in order to receive drop
    events.  SproutCore knows to register your view when this property
    is true on view creation.
    
    @type Boolean
    @default YES
    @constant
  */  
  isDropTarget: YES,

  /**
    Called when the drag is started, regardless of where or not your drop
    target is current. You can use this to highlight your drop target
    as "eligible".
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object.
    @param {SC.Event} evt The most recent mouse move event.  Use to get location 
  */
  dragStarted: function(drag, evt) {},
  
  /**
    Called when the drag first enters the droppable area, if it returns a
    drag operations other than `SC.DRAG_NONE`.
    
    The default implementation does nothing.
    
    @param drag {SC.Drag} The current drag object.
    @param evt {SC.Event} The most recent mouse move event.  Use to get location
  */
  dragEntered: function(drag, evt) {},
  
  /**
    Called periodically when a drag is over your droppable area.
    
    Override this method this to update various elements of the drag state, 
    including the location of ghost view.  You should  use this method to 
    implement snapping.
    
    This method will be called periodically, even if the user is not moving
    the drag.  If you perform expensive operations, be sure to check the
    mouseLocation property of the drag to determine if you actually need to
    update anything before doing your expensive work.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object.
    @param {SC.Event} evt The most recent mouse move event. Use to get location
  */
  dragUpdated: function(drag, evt) {},
  
  /**
    Called when the user exits your droppable area or the drag ends
    and you were the last targeted droppable area.
    
    Override this method to perform any clean up on your UI such as hiding 
    a special highlight state or removing insertion points.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event}   evt  The most recent mouse move event. Use to get location.
  */
  dragExited: function(drag, evt) {},
  
  /**
    Called on all drop targets when the drag ends.  
    
    For example, the user might have dragged the view off the screen and let 
    go or they might have hit escape.  Override this method to perform any 
    final cleanup.  This will be called instead of dragExited.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event}   evt  The most recent mouse move event. Use to get location.
  */
  dragEnded: function(drag, evt) {},
  
  /**
    Called when the drag needs to determine which drag operations are
    valid in a given area.
    
    Override this method to return an OR'd mask of the allowed drag 
    operations.  If the user drags over a droppable area within another 
    droppable area, the drag will latch onto the deepest view that returns one 
    or more available operations.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event} evt The most recent mouse move event.  Use to get 
      location 
    @param {DragOp} op The proposed drag operation. A drag constant
    
    @returns {DragOps} A mask of all the drag operations allowed or 
      SC.DRAG_NONE
  */
  computeDragOperations: function(drag, evt, op) {
    return SC.DRAG_NONE;
  },
  
  /**
    Called when the user releases the mouse.
    
    This method gives your drop target one last opportunity to choose to 
    accept the proposed drop operation.  You might use this method to
    perform fine-grained checks on the drop location, for example.
    Return true to accept the drop operation.
    
    The default implementation returns `YES`.
    
    @param {SC.Drag} drag The drag instance managing this drag
    @param {DragOp} op The proposed drag operation. A drag constant
    
    @return {Boolean} YES if operation is OK, NO to cancel.
  */  
  acceptDragOperation: function(drag, op) {
    return YES;
  },
  
  /**
    Called to actually perform the drag operation.
    
    Override this method to actually perform the drag operation.  This method
    is only called if you returned `YES` in `acceptDragOperation()`. 
    
    Return the operation that was actually performed or `SC.DRAG_NONE` if the 
    operation was aborted.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.Drag} drag The drag instance managing this drag
    @param {DragOp} op The proposed drag operation. A drag constant.
    
    @return {DragOp} Drag Operation actually performed
  */
  performDragOperation: function(drag, op) {
    return SC.DRAG_NONE;
  }
  
};

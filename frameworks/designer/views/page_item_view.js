// ==========================================================================
// SC.pageItemView
// ==========================================================================
/*globals SC */

/**
  This View is used by Greenhouse when application is in design mode
  Used for displaying page items

  @extends SC.ListItemVIew
  @author Mike Ball

*/

SC.pageItemView = SC.ListItemView.extend({
  isDropTarget: YES,

  dragEntered: function(drag, evt) {
    this.$().addClass('highlight');
  },

  dragExited: function(drag, evt) {
    this.$().removeClass('highlight');

  },

  dragEnded: function(drag, evt) {
    this.$().removeClass('highlight');

  },

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
   @returns {DragOps} A mask of all the drag operations allowed or
     SC.DRAG_NONE
  */
  computeDragOperations: function(drag, evt) {
    if(drag.hasDataType('SC.Binding')){
      return SC.DRAG_LINK;
    }
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
  acceptDragOperation: function(drag, op) { return YES; },

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
    var data = drag.dataForType('SC.Binding'), that = this;
    if(data && SC._Greenhouse){
      var actionObj = SC.Object.create({
        type: 'Binding',
        source: data,
        target: that.get('content'),
        addItem: function(from, to, designAttrs){
          var view = this.getPath('source');
          var value = that._propertyPathForProp(this.getPath('target.view.page'),this.getPath('target.view'));
          view[from+"Binding"] = designAttrs[from+"Binding"] = value+"."+to;
          view.propertyDidChange(from+"Binding");

          var designer = view.get('designer');
          if(designer){
            designer.designProperties.pushObject(from+"Binding");
            designer.propertyDidChange('editableProperties');
          }
          if(view.displayDidChange) view.displayDidChange();
        }
      });

      SC._Greenhouse.sendAction('newBindingPopup', actionObj);

      return SC.DRAG_LINK;
    }
    else{
      return SC.DRAG_NONE;
    }
  },

  _propertyPathForProp: function(page, prop){
    for(var key in page){
      if(page.hasOwnProperty(key)){
        if(page[key] === prop) return page.get('pageName')+"."+key.toString();
      }
    }
  }

});


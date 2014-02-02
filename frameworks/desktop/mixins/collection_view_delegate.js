// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  A Collection View Delegate is consulted by a `SC.CollectionView` to make
  policy decisions about certain behaviors such as selection control and
  drag and drop.  If you need to control other aspects of your data, you may
  also want to add the `SC.CollectionContent` mixin.
  
  To act as a Collection Delegate, just apply this mixin to your class.  You
  must then set the "delegate" property on the CollectionView to your object.
  
  Alternatively, if no delegate is set on a CollectionView, but the content 
  implements this mixin, the content object will be used as the delegate 
  instead.
  
  If you set an ArrayController or its arrangedObjects property as the content
  of a CollectionView, the ArrayController will automatically act as the 
  delegate for the view.
  
  @since SproutCore 1.0
*/
SC.CollectionViewDelegate = {

  /**
    Walk like a duck. Used to detect the mixin by SC.CollectionView.
    
    @type Boolean
    @default YES
    @constant
  */
  isCollectionViewDelegate: YES,


  // ..........................................................
  // SELECTION
  // 

  /**
    This method will be called anytime the collection view is about to
    change the selection in response to user mouse clicks or keyboard events.
    
    You can use this method to adjust the proposed selection, eliminating any
    selected objects that cannot be selected.  The default implementation of
    this method simply returns the proposed selection.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.IndexSet} sel Proposed array of selected objects.
    @returns {SC.IndexSet} Actual allow selection index set
  */
  collectionViewSelectionForProposedSelection: function(view, sel) {
    return sel;
  },

  /**
    Called by the collection when attempting to select an item.  Return the
    actual indexes you want to allow to be selected.  Return null to disallow
    the change.  The default allows all selection.
    
    @param {SC.CollectionView} view the view collection view
    @param {SC.IndexSet} indexes the indexes to be selected
    @param {Boolean} extend YES if the indexes will extend existing sel
    @returns {SC.IndexSet} allowed index set
  */
  collectionViewShouldSelectIndexes: function (view, indexes, extend) {
    return indexes;
  },

  /**
    Called by the collection when attempting to deselect an item.  Return the
    actual indexes you want to allow to be deselected.  Return `null` to
    disallow the change.  The default allows all selection.
    
    Note that you should not modify the passed in IndexSet.  clone it instead.
    
    @param {SC.CollectionView} view the view collection view
    @param {SC.IndexSet} indexes the indexes to be selected
    @returns {SC.IndexSet} allowed index set
  */
  collectionViewShouldDeselectIndexes: function (view, indexes) {
    return indexes;
  },


  // ..........................................................
  // EDIT OPERATIONS
  // 

  /**
    Called by the collection view whenever the `deleteSelection()` method is
    called.  You can implement this method to get fine-grained control over
    which items can be deleted.  To prevent deletion, return null.
    
    This method is only called if canDeleteContent is `YES` on the collection
    view.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.IndexSet} indexes proposed index set of items to delete.
    @returns {SC.IndexSet} index set allowed to delete or null.
  */
  collectionViewShouldDeleteIndexes: function(view, indexes) {
    return indexes;
  },

  /**
    Called by the collection view to actually delete the selected items.
    
    The default behavior will use standard array operators to delete the
    indexes from the array. You can implement this method to provide your own
    deletion method.
    
    If you simply want to control the items to be deleted, you should instead
    implement `collectionViewShouldDeleteItems()`. This method will only be
    called if canDeleteContent is `YES` and `collectionViewShouldDeleteIndexes()`
    returns a non-empty index set
    
    @param {SC.CollectionView} view collection view
    @param {SC.IndexSet} indexes the items to delete
    @returns {Boolean} YES if the deletion was a success.
  */
  collectionViewDeleteContent: function(view, content, indexes) {
    if (!content) return NO ;

    if (SC.typeOf(content.destroyAt) === SC.T_FUNCTION) {
      content.destroyAt(indexes);
      view.selectPreviousItem(NO, 1);
      return YES ;
    } else if (SC.typeOf(content.removeAt) === SC.T_FUNCTION) {
      content.removeAt(indexes);
      view.selectPreviousItem(NO, 1);
      return YES;
    } else {
      return NO;
    }
  },


  // ..........................................................
  // DRAGGING
  // 
  
  /**
    Called by the collection view just before it starts a drag to give you
    an opportunity to decide if the drag should be allowed.
    
    You can use this method to implement fine-grained control over when a
    drag will be allowed and when it will not be allowed. For example, you
    may enable content reordering but then implement this method to prevent
    reordering of certain items in the view.
    
    The default implementation always returns `YES`.
    
    @param {SC.CollectionView} view the collection view
    @returns {Boolean} YES to allow, NO to prevent it
  */
  collectionViewShouldBeginDrag: function(view) {
    return YES;
  },

  /**
    Called by the collection view just before it starts a drag so that
    you can provide the data types you would like to support in the data.
    
    You can implement this method to return an array of the data types you
    will provide for the drag data.
    
    If you return `null` or an empty array, can you have set `canReorderContent`
    to `YES` on the CollectionView, then the drag will go ahead but only
    reordering will be allowed.  If `canReorderContent` is `NO`, then the drag
    will not be allowed to start.
    
    If you simply want to control whether a drag is allowed or not, you
    should instead implement `collectionViewShouldBeginDrag()`.
    
    The default returns an empty array.
    
    @param {SC.CollectionView} view the collection view to begin dragging.
    @returns {Array} array of supported data types.
  */
  collectionViewDragDataTypes: function(view) {
    return [];
  },

  /**
    Called by a collection view when a drag concludes to give you the option
    to provide the drag data for the drop.
    
    This method should be implemented essentially as you would implement the
    `dragDataForType()` if you were a drag data source.  You will never be asked
    to provide drag data for a reorder event, only for other types of data.
    
    The default implementation returns null.
    
    @param view {SC.CollectionView} the collection view that initiated the drag
    @param dataType {String} the data type to provide
    @param drag {SC.Drag} the drag object
    @returns {Object} the data object or null if the data could not be provided.
  */
  collectionViewDragDataForType: function(view, drag, dataType) {
    return null;
  },

  /**
    Called once during a drag the first time view is entered. Return all
    possible drag operations OR'd together.
    
    @param {SC.CollectionView} view the collection view that initiated the drag
    @param {SC.Drag} drag the drag object
    @param {Number} proposedDragOperations proposed logical OR of allowed drag operations.
    @returns {Number} the allowed drag operations. Defaults to op
  */
  collectionViewComputeDragOperations: function(view, drag, proposedDragOperations) {
    return proposedDragOperations;
  },

  /**
    Called by the collection view during a drag to let you determine the
    kind and location of a drop you might want to accept.
    
    You can override this method to implement fine-grained control over how
    and when a dragged item is allowed to be dropped into a collection view.
    
    This method will be called by the collection view both to determine in
    general which operations you might support and specifically the operations
    you would support if the user dropped an item over a specific location.
    
    If the `proposedDropOperation` parameter is `SC.DROP_ON` or `SC.DROP_BEFORE`,
    then the `proposedInsertionPoint` will be a non-negative value and you
    should determine the specific operations you will support if the user
    dropped the drag item at that point.
    
    If you do not like the proposed drop operation or insertion point, you
    can override these properties as well by setting the `proposedDropOperation`
    and `proposedInsertionIndex` properties on the collection view during this
    method. These properties are ignored all other times.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.Drag} drag the current drag object
    @param {Number} op proposed logical OR of allowed drag operations.
    @param {Number} proposedInsertionIndex an index into the content array representing the proposed insertion point.
    @param {String} proposedDropOperation the proposed drop operation. Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation. Defaults to op
  */
  collectionViewValidateDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    // don't allow dropping on by default
    return (proposedDropOperation & SC.DROP_ON) ? SC.DRAG_NONE : op ;
  },
  
  /**
    Called by the collection view to actually accept a drop.  This method will
    only be invoked AFTER your `validateDrop method has been called to
    determine if you want to even allow the drag operation to go through.
    
    You should actually make changes to the data model if needed here and
    then return the actual drag operation that was performed. If you return
    `SC.DRAG_NONE` and the dragOperation was `SC.DRAG_REORDER`, then the default
    reorder behavior will be provided by the collection view.
    
    @param {SC.CollectionView} view
    @param {SC.Drag} drag the current drag object
    @param {Number} op proposed logical OR of allowed drag operations.
    @param {Number} proposedInsertionIndex an index into the content array representing the proposed insertion point.
    @param {String} proposedDropOperation the proposed drop operation.  Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation. Defaults to proposedDragOperation
  */
  collectionViewPerformDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    return SC.DRAG_NONE;
  },
  
  /**
    Renders a drag view for the passed content indexes. If you return null
    from this, then a default drag view will be generated for you.
    
    The default implementation returns null.
    
    @param {SC.CollectionView} view
    @param {SC.IndexSet} dragContent
    @returns {SC.View} view or null
  */
  collectionViewDragViewFor: function(view, dragContent) {
    return null;
  },

  /**
    Allows the ghost view created in `collectionViewDragViewFor` to be displayed
    like a cursor instead of the default implementation. This sets the view 
    origin to be the location of the mouse cursor.
    
    @type Boolean
    @default NO
  */
  ghostActsLikeCursor: NO
  
};

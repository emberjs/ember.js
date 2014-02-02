// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ==========================================================================
// Project:   SC.designsController
// ==========================================================================
/*globals SC */
/*jslint evil: true*/

/**

  (Document Your Controller Here)

  this controller is used by Greenhouse to list all of the views in a page files

  @extends SC.Object
*/
SC.designsController = SC.ArrayController.create(SC.CollectionViewDelegate,
/** @scope SC.designsController.prototype */ {

  setDesigns: function(page, iframe){
    var designs = [];

    for(var v in page){
      if(page.hasOwnProperty(v)){
        if(v !== '__sc_super__' && page[v] && page[v].kindOf){
          if(page[v].kindOf(iframe.SC.Pane)){
            designs.push(SC.Object.create({type: 'pane', view: page.get(v), name: v}));
          }
          else if(page[v].kindOf(iframe.SC.View)){
            designs.push(SC.Object.create({type: 'view', view: page.get(v), name: v}));
          }
          else if(page[v].kindOf(iframe.SC.Page)){
            designs.push(SC.Object.create({type: 'page', view: page.get(v), name: v}));
          }
          else if(page[v].kindOf(iframe.SC.Controller)){
            designs.push(SC.Object.create({type: 'controller', name: v, view: page.get(v)}));
          }
          else if(page[v].kindOf(iframe.SC.Object) && !page[v].isPageDesignController){
            designs.push(SC.Object.create({type: 'controller', name: v, view: page.get(v)}));
          }

        }
      }
    }
    this.set('content', designs);
    this.set('page', page);
  },

  // ..........................................................
  // Drop Target
  //

  collectionViewComputeDragOperations: function(view, drag, op){
    return SC.DRAG_ANY;
  },
  /**
    Called by the collection view during a drag to let you determine the
    kind and location of a drop you might want to accept.

    You can override this method to implement fine-grained control over how
    and when a dragged item is allowed to be dropped into a collection view.

    This method will be called by the collection view both to determine in
    general which operations you might support and specifically the operations
    you would support if the user dropped an item over a specific location.

    If the `proposedDropOperation` parameter is `SC.DROP_ON` or
    `SC.DROP_BEFORE`, then the `proposedInsertionPoint` will be a
    non-negative value and you should determine the specific operations you
    will support if the user dropped the drag item at that point.

    If you do not like the proposed drop operation or insertion point, you
    can override these properties as well by setting the proposedDropOperation
    and proposedInsertionIndex properties on the collection view during this
    method.  These properties are ignored all other times.

    @param view {SC.CollectionView} the collection view
    @param drag {SC.Drag} the current drag object
    @param op {Number} proposed logical OR of allowed drag operations.
    @param proposedInsertionIndex {Number} an index into the content array
      representing the proposed insertion point.
    @param proposedDropOperation {String} the proposed drop operation.  Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation.  Defaults to op
  */
  collectionViewValidateDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    var data = drag.dataForType('SC.Object');
    if(data){
      return SC.DRAG_ANY;
    }
    else{
      // don't allow dropping on by default
      return (proposedDropOperation & SC.DROP_ON) ? SC.DRAG_NONE : op ;
    }
  },

  /**
    Called by the collection view to actually accept a drop.  This method will
    only be invoked *AFTER* your `validateDrop` method has been called to
    determine if you want to even allow the drag operation to go through.

    You should actually make changes to the data model if needed here and
    then return the actual drag operation that was performed.  If you return
    SC.DRAG_NONE and the dragOperation was `SC.DRAG_REORDER`, then the default
    reorder behavior will be provided by the collection view.

    @param view {SC.CollectionView}
    @param drag {SC.Drag} the current drag object
    @param op {Number} proposed logical OR of allowed drag operations.
    @param proposedInsertionIndex {Number} an index into the content array representing the proposed insertion point.
    @param proposedDropOperation {String} the proposed drop operation.  Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation.  Defaults to proposedDragOperation
  */
  collectionViewPerformDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    var data = drag.dataForType('SC.Object'),
        page = this.get('page'),
        scClass,
        that = this;
    if(data){
      var actionObj = SC.Object.create({
        data: data,
        addItemToPage: function(name){
          scClass = eval(this.getPath('data.scClass'));
          var type = SC.kindOf(scClass, SC.View) ? 'view' : 'controller';

          page[name] = scClass.design().create({page: page});
          that.pushObject(SC.Object.create({type: type, view: page.get(name), name: name}));
        }
      });

      SC._Greenhouse.sendAction('newPageElement', actionObj);
      return SC.DRAG_ANY;
    }
    return SC.DRAG_NONE ;
  }
}) ;

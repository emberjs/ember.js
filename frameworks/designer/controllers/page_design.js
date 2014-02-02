// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  An instance of this controller is created for every page where designers
  are involved.  The Designer's themselves will register with the
  controller so that you can hook to the controller to manage the views and
  their editors.

  Among other things, this controller implements global selection support for
  the designers.

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.PageDesignController = SC.Object.extend({

  isPageDesignController: YES,

  // ..........................................................
  // SELECTION
  //

  /** The current view builder selection. */
  selection: null,

  /**
    Updates the selection either by adding the item or by resetting the
    selection.  Calling this method with no parameters will reset the
    selection.

    The passed selection must be a Designer object.
  */
  select: function(sel, extend) {
    var base = this.get('selection');
    if (!base || !extend || !base.contains(sel)) {
      base = (!extend || !base) ? SC.CoreSet.create() : base.copy();
      base.add(sel);
      this.set('selection', base.freeze()) ;
      //make the designPane the firstResponder
      SC.designPage.getPath('designMainPane.container').becomeFirstResponder();
    }
    return this ;
  },

  /**
    Removes the passed items from the current selection.

    The passed selection must be a Designer object.
  */
  deselect: function(sel) {

    var base = this.get('selection');
    if (base && base.contains(sel)) {
      base = base.copy();
      base.remove(sel);
      this.set('selection', base.freeze());
    }
    return this;
  },
  /**
    Invoked whenever the selection changes.  Updates the selection states
    on the old and new views.
  */
  selectionDidChange: function() {
    var sel = this.get('selection'),
        oldSel = this._selection ;

    // save old selection for next time
    this._selection = sel ;

    // set the isSelected state on new selection.
    if (sel) sel.setEach('designIsSelected', YES);

    // remove the isSelected state for old selection not in new selection.
    if (oldSel) {
      oldSel.forEach(function(s){
        if (!sel || !sel.contains(s)) s.set('designIsSelected', NO);
      }, this);
    }

  }.observes('selection'),


  /**
    Called by a view to reposition the current selection during a mouse
    drag.
  */
  repositionSelection: function(evt, info) {
    var sel = this.get('selection');
    if (sel) sel.invoke('mouseReposition', evt, info);
  },

  /**
    Called by a view to prepare all views in selection for repositioning
  */
  prepareReposition: function(info) {
    var sel = this.get('selection');
    if (sel) sel.invoke('prepareReposition', info);
  },
  /**
    removes all views in the selection from their parent view
  */
  deleteSelection: function(){
    var sel = this.get('selection'), first, parentView;

    if(sel && sel.get('length') > 0){
      //TODO: delete multi selection
      //this.beginPropertyChanges();
      //while(sel.get('length') > 0){
        first = sel.firstObject();
        this.deselect(first);
        first = first.get('view');
        parentView = first.get('parentView');
        first.removeFromParent();
        if(parent.displayDidChange) parent.displayDidChange();
        first = null;
      //}
      //this.endPropertyChanges();
    }
  },


  // ..........................................................
  // DESIGNERS
  //

  /** All of the designers on the current page. */
  designers: null,

  /**
    Called by each designer when it is created to register itself with the
    controller.  You can use this to know which designers are currently in
    the document to delete them as needed.
  */
  registerDesigner: function(designer) {
    this.get('designers').add(designer);
  },

  // ..........................................................
  // ROOT DESIGNER
  //
  rootDesigner: null,

  makeRootDesigner: function(designer){
    var currRoot = this.get('rootDesigner');

    if(currRoot) currRoot.set('isRootDesigner', NO);

    this.deselect(designer);
    designer.set('isRootDesigner', YES);
    designer.set('prevRootDesigner', currRoot);
    //TODO: allow greenhouse to highlight the root view!
    this.set('rootDesigner', designer);
  },


  // ..........................................................
  // INTERNAL SUPPORT
  //
  init: function() {
    this.designers = SC.Set.create();
    this.sel = [];
    sc_super();
  }

}) ;

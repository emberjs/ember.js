// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A modal pane is used to capture mouse events inside a pane that is modal.
  You normally will not work with modal panes directly, though you may set
  the modalPane property to a subclass of this pane when designing custom
  panes.

  A modal pane is automatically appended when a pane with isModal set to
  `YES` is made visible and removed when the same pane is hidden.  The only
  purpose of the `ModalPane` is to absorb mouse events so that they cannot
  filter through to the underlying content.

  @extends SC.Pane
  @since SproutCore 1.0
*/
SC.ModalPane = SC.Pane.extend(
/** @scope SC.ModalPane.prototype */{

  /**
    @type Array
    @default ['sc-modal']
    @see SC.View#classNames
  */
  classNames: 'sc-modal',

  /** @private */
  _openPaneCount: 0,

  /** @private
    Called by a pane just before it appends itself.   The modal pane can
    make itself visible first if needed.

    @param {SC.Pane} pane the pane
    @returns {SC.ModalPane} receiver
  */
  paneWillAppend: function(pane) {
    var _tmpPane;
    this._openPaneCount++;
    if (!this.get('isVisibleInWindow')) this.append();
    var panes = SC.RootResponder.responder.panes;
    for(var i=0, iLen=panes.length; i<iLen; i++ ){
      _tmpPane = panes[i];
      if(_tmpPane!==pane) {
        //_tmpPane.set('ariaHidden', YES);
        this._hideShowTextfields(_tmpPane, NO);
      }
    }
    return this ;
  },

  /** @private
    Called by a pane just after it removes itself.  The modal pane can remove
    itself if needed.   Modal panes only remove themselves when an equal
    number of `paneWillAppend()` and `paneDidRemove()` calls are received.

    @param {SC.Pane} pane the pane
    @returns {SC.ModalPane} receiver
  */
  paneDidRemove: function(pane) {
    var _tmpPane;
    this._openPaneCount--;
    var panes = SC.RootResponder.responder.panes;
    for(var i=0, iLen=panes.length; i<iLen; i++ ){
      _tmpPane = panes[i];
      if(_tmpPane!==pane) {
        //_tmpPane.set('ariaHidden', NO);
        this._hideShowTextfields(_tmpPane, YES);
      }
    }
    if (this._openPaneCount <= 0) {
      this._openPaneCount = 0 ;
      if (this.get('isVisibleInWindow')) this.remove();
    }
  },

  /** @private
    If `focusable` is NO all SC.TextFieldViews not belonging to the given
    pane will have isBrowserFocusable set to NO.  If `focusable` is YES, then
    all SC.TextFieldViews not belonging to the given pane will have
    isBrowserFocusable set to YES, unless they previously had it set explictly
    to NO.
  */
  _hideShowTextfields: function(pane, focusable){
    var view;

    for (view in SC.View.views) {
      view = SC.View.views[view];
      if (view.get('isTextField') && view !== pane && view.get('pane') === pane) {
        if (focusable) {
          // Setting isBrowserFocusable back to YES. If we cached the previous
          // value, use that instead.
          if (view._scmp_isBrowserFocusable !== undefined) {
            focusable = view._scmp_isBrowserFocusable;

            // Clean up entirely.
            delete view._scmp_isBrowserFocusable;
          }
        } else {
          // Cache the value of isBrowserFocusable. If the text field
          // already had isBrowserFocusable: NO, we don't want to
          // set it back to YES.
          view._scmp_isBrowserFocusable = view.get('isBrowserFocusable');
        }
        view.set('isBrowserFocusable', focusable);
      }
    }
  },

  /** @private */
  mouseDown: function(evt) {
    var owner = this.get('owner');
    if (owner && owner.modalPaneDidClick) owner.modalPaneDidClick(evt);
  },

  /** @private */
  touchStart: function(evt) {
    this.mouseDown(evt);
  }
});

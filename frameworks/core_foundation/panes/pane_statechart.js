sc_require("panes/pane");

/**
  Adds SC.Pane specific processes.

  While it would be a little nicer to use didAppendToDocument,
  willRemoveFromDocument and other functions, we cannot because they are public
  callbacks and if a developer overrides them without knowing to call sc_super()
  everything will fail.  Instead, it's better to keep our static setup/remove
  code private.
  */
SC.Pane.reopen({

  /** @private */
  _notifyDidAttach: function () {
    // hook into root responder
    var responder = (this.rootResponder = SC.RootResponder.responder);
    responder.panes.add(this);

    // Legacy.
    this.set('isPaneAttached', YES);
    this.paneDidAttach();

    // Legacy?
    this.recomputeDependentProperties();
    this.set('currentWindowSize', responder.currentWindowSize);

    // Set the initial design mode.  The responder will update this if it changes.
    this.updateDesignMode(this.get('designMode'), responder.get('currentDesignMode'));

    // handle intercept if needed
    this._addIntercept();

    // If the layout is flexible (dependent on the window size), then the view
    // will resize when appended.
    if (!this.get('isFixedSize')) {
      // We call viewDidResize so that it calls parentViewDidResize on all child views.
      this.viewDidResize();
    }

    sc_super();
  },

  /** @private */
  _notifyWillDetach: function () {
    sc_super();

    // Legacy.
    this.set('isPaneAttached', NO);

    // remove intercept
    this._removeIntercept();

    // remove the pane
    var rootResponder = this.rootResponder;
    rootResponder.panes.remove(this);
    this.rootResponder = null;
  }

});

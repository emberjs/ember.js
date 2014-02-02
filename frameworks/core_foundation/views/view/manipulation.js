sc_require("views/view");

SC.View.reopen(
  /** @scope SC.View.prototype */{

  /**
    This code exists to make it possible to pool SC.Views.
    */
  _lastLayerId: null,

  /** @private */
  init: function (original) {
    original();

    // Set up the cached layerId if it has been set on create.
    this._lastLayerId = this.get('layerId');
  }.enhance(),

  /**
    Handles changes in the layer id.
  */
  layerIdDidChange: function() {
    var layer  = this.get('layer'),
        lid    = this.get('layerId'),
        lastId = this._lastLayerId;

    if (lid !== lastId) {
      // if we had an earlier one, remove from view hash.
      if (lastId && SC.View.views[lastId] === this) {
        delete SC.View.views[lastId];
      }

      // set the current one as the new old one
      this._lastLayerId = lid;

      // and add the new one
      SC.View.views[lid] = this;

      // and finally, set the actual layer id.
      if (layer) { layer.id = lid; }
    }
  }.observes("layerId"),

  // ------------------------------------------------------------------------
  // LAYER LOCATION
  //

  /**
    Insert the view into the the receiver's childNodes array.

    The view will be added to the childNodes array before the beforeView.  If
    beforeView is null, then the view will be added to the end of the array.
    This will also add the view's rootElement DOM node to the receivers
    containerElement DOM node as a child.

    If the specified view already belongs to another parent, it will be
    removed from that view first.

    @param {SC.View} view
    @param {SC.View} beforeView
    @returns {SC.View} the receiver
  */
  insertBefore: function(view, beforeView) {
    view.beginPropertyChanges(); // limit notifications

    // Reset any views that are already building in or out.
    if (view.resetBuildState) { view.resetBuildState(); }
    view._doAdopt(this, beforeView);

    view.endPropertyChanges();

    // Make sure all notifications are delayed since the appending
    // doesn't complete until the end of the RunLoop
    // There may be better ways to do this than with invokeLast,
    // but it's the best I can do for now - PDW
    // this.invokeLast(function () {
    //   var pane = view.get('pane');
    //   if (pane && pane.get('isPaneAttached')) {
    //     view._notifyDidAppendToDocument();
    //   }
    // });

    return this ;
  },

  removeChild: function(original, view) {
    if (!view) { return this; } // nothing to do
    if (view.parentView !== this) {
      throw new Error("%@.removeChild(%@) must belong to parent".fmt(this, view));
    }

    // notify views
    // TODO: Deprecate these notifications.
    if (view.willRemoveFromParent) { view.willRemoveFromParent() ; }
    if (this.willRemoveChild) { this.willRemoveChild(view) ; }

    original(view);

    return this;
  }.enhance(),

  /**
    Replace the oldView with the specified view in the receivers childNodes
    array. This will also replace the DOM node of the oldView with the DOM
    node of the new view in the receivers DOM.

    If the specified view already belongs to another parent, it will be
    removed from that view first.

    @param view {SC.View} the view to insert in the DOM
    @param view {SC.View} the view to remove from the DOM.
    @returns {SC.View} the receiver
  */
  replaceChild: function(view, oldView) {
    // suspend notifications
    view.beginPropertyChanges();
    oldView.beginPropertyChanges();
    this.beginPropertyChanges();

    this.insertBefore(view,oldView).removeChild(oldView) ;

    // resume notifications
    this.endPropertyChanges();
    oldView.endPropertyChanges();
    view.endPropertyChanges();

    return this;
  },

  /**
    Replaces the current array of child views with the new array of child
    views.

    This will remove *and* destroy all of the existing child views and their
    layers.

    Warning: The new array must be made of *child* views (i.e. created using
    this.createChildView() on the parent).

    @param {Array} newChildViews Child views you want to add
    @returns {SC.View} receiver
  */
  replaceAllChildren: function (newChildViews) {
    this.beginPropertyChanges();

    // If rendered, destroy our layer so we can re-render.
    // if (this.get('_isRendered')) {
    //   var layer = this.get('layer');

    //   // If attached, detach and track our parent node so we can re-attach.
    //   if (this.get('isAttached')) {
    //     // We don't allow for transitioning out at this time.
    //     // TODO: support transition out of child views.
    //     this._doDetach(true);
    //   }

    //   // Destroy our layer in one move.
    //   this.destroyLayer();
    // }

    // Remove the current child views.
    // We aren't rendered at this point so it bypasses the optimization in
    // removeAllChildren that would recreate the layer.  We would rather add the
    // new childViews before recreating the layer.
    this.removeAllChildren(true);

    // Add the new children.
    for (var i = 0, len = newChildViews.get('length'); i < len; i++) {
      this.appendChild(newChildViews.objectAt(i));
    }

    // We were rendered previously.
    // if (layer) {
    //   // Recreate our layer (now empty).
    //   this.createLayer();
    // }
    this.endPropertyChanges();

    return this ;
  },

  /**
    Appends the specified view to the end of the receivers childViews array.
    This is equivalent to calling insertBefore(view, null);

    @param view {SC.View} the view to insert
    @returns {SC.View} the receiver
  */
  appendChild: function(view) {
    return this.insertBefore(view, null);
  },

  // ------------------------------------------------------------------------
  // BUILDING IN/OUT
  //

  /**
    Call this to append a child while building it in. If the child is not
    buildable, this is the same as calling appendChild.

    @deprecated Version 1.10
  */
  buildInChild: function(view) {
    view.willBuildInToView(this);
    this.appendChild(view);
    view.buildInToView(this);
  },

  /**
    Call to remove a child after building it out. If the child is not buildable,
    this will simply call removeChild.

    @deprecated Version 1.10
  */
  buildOutChild: function(view) {
    view.buildOutFromView(this);
  },

  /**
    Called by child view when build in finishes. By default, does nothing.

    @deprecated Version 1.10
  */
  buildInDidFinishFor: function(child) {
  },

  /**
    @private
    Called by child view when build out finishes. By default removes the child view.
  */
  buildOutDidFinishFor: function(child) {
    this.removeChild(child);
  },

  /**
    Whether the view is currently building in.

    @deprecated Version 1.10
  */
  isBuildingIn: NO,

  /**
    Whether the view is currently building out.

    @deprecated Version 1.10
  */
  isBuildingOut: NO,

  /**
    Implement this, and call didFinishBuildIn when you are done.

    @deprecated Version 1.10
  */
  buildIn: function() {
    //@if(debug)
    SC.warn("The SC.View build methods have been deprecated in favor of the transition plugins.  To build in a view, please provide a transitionIn plugin (many are pre-built in SproutCore) and to build out a view, please provide a transitionOut plugin.");
    //@endif
    this.buildInDidFinish();
  },

  /**
    Implement this, and call didFinishBuildOut when you are done.

    @deprecated Version 1.10
  */
  buildOut: function() {
    //@if(debug)
    SC.warn("The SC.View build methods have been deprecated in favor of the transition plugins.  To build in a view, please provide a transitionIn plugin (many are pre-built in SproutCore) and to build out a view, please provide a transitionOut plugin.");
    //@endif
    this.buildOutDidFinish();
  },

  /**
    This should reset (without animation) any internal states; sometimes called before.

    It is usually called before a build in, by the parent view.
    @deprecated Version 1.10
  */
  resetBuild: function() {

  },

  /**
    Implement this if you need to do anything special when cancelling build out;
    note that buildIn will subsequently be called, so you usually won't need to do
    anything.

    This is basically called whenever build in happens.

    @deprecated Version 1.10
  */
  buildOutDidCancel: function() {

  },

  /**
    Implement this if you need to do anything special when cancelling build in.
    You probably won't be able to do anything. I mean, what are you gonna do?

    If build in was cancelled, it means build out is probably happening.
    So, any timers or anything you had going, you can cancel.
    Then buildOut will happen.

    @deprecated Version 1.10
  */
  buildInDidCancel: function() {

  },

  /**
    Call this when you have built in.

    @deprecated Version 1.10
  */
  buildInDidFinish: function() {
    this.isBuildingIn = NO;
    this._buildingInTo.buildInDidFinishFor(this);
    this._buildingInTo = null;
  },

  /**
    Call this when you have finished building out.

    @deprecated Version 1.10
  */
  buildOutDidFinish: function() {
    this.isBuildingOut = NO;
    this._buildingOutFrom.buildOutDidFinishFor(this);
    this._buildingOutFrom = null;
  },

  /**
    Usually called by parentViewDidChange, this resets the build state (calling resetBuild in the process).

    @deprecated Version 1.10
  */
  resetBuildState: function() {
    if (this.isBuildingIn) {
      this.buildInDidCancel();
      this.isBuildingIn = NO;
    }
    if (this.isBuildingOut) {
      this.buildOutDidCancel();
      this.isBuildingOut = NO;
    }

    // finish cleaning up
    this.buildingInTo = null;
    this.buildingOutFrom = null;

    this.resetBuild();
  },

  /**
    @private (semi)
    Called by building parent view's buildInChild method. This prepares
    to build in, but unlike buildInToView, this is called _before_ the child
    is appended.

    Mostly, this cancels any build out _before_ the view is removed through parent change.
  */
  willBuildInToView: function(view) {
    // stop any current build outs (and if we need to, we also need to build in again)
    if (this.isBuildingOut) {
      this.buildOutDidCancel();
    }
  },

  /**
    @private (semi)
    Called by building parent view's buildInChild method.
  */
  buildInToView: function(view) {
    // if we are already building in, do nothing.
    if (this.isBuildingIn) { return; }

    this._buildingInTo = view;
    this.isBuildingOut = NO;
    this.isBuildingIn = YES;
    this.buildIn();
  },

  /**
    @private (semi)
    Called by building parent view's buildOutChild method.

    The supplied view should always be the parent view.
  */
  buildOutFromView: function(view) {
    // if we are already building out, do nothing.
    if (this.isBuildingOut) { return; }

    // cancel any build ins
    if (this.isBuildingIn) {
      this.buildInDidCancel();
    }

    // in any case, we need to build out
    this.isBuildingOut = YES;
    this.isBuildingIn = NO;
    this._buildingOutFrom = view;
    this.buildOut();
  }
});

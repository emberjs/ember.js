sc_require("views/view/base");

// When in debug mode, core developers can log the view state.
//@if (debug)
SC.LOG_VIEW_STATES = false;
SC.LOG_VIEW_STATES_STYLE = {
  0x0200: 'color: #67b7db; font-style: italic;', // UNRENDERED
  0x0300: 'color: #67b7db; font-style: italic;', // UNATTACHED
  0x0301: 'color: #67b7db; font-style: italic;', // UNATTACHED_BY_PARENT
  0x03C0: 'color: #23abf5; font-style: italic;', // ATTACHED_SHOWN
  0x03C3: 'color: #1fe7a8; font-style: italic;', // ATTACHED_SHOWN_ANIMATING
  0x03A0: 'color: #67b7db; font-style: italic;', // ATTACHED_HIDDEN
  0x03A1: 'color: #67b7db; font-style: italic;', // ATTACHED_HIDDEN_BY_PARENT
  0x03C1: 'color: #b800db; font-style: italic;', // ATTACHED_BUILDING_IN
  0x0381: 'color: #b800db; font-style: italic;', // ATTACHED_BUILDING_OUT
  0x0382: 'color: #b800db; font-style: italic;', // ATTACHED_BUILDING_OUT_BY_PARENT
  0x03C2: 'color: #b800db; font-style: italic;', // ATTACHED_SHOWING
  0x03A2: 'color: #b800db; font-style: italic;' // ATTACHED_HIDING
};
//@endif


SC.CoreView.mixin(
  /** @scope SC.CoreView */ {

  /**
    The view has been rendered.

    Use a logical AND (single `&`) to test rendered status.  For example,

        view.get('viewState') & SC.CoreView.IS_RENDERED

    @static
    @constant
  */
  IS_RENDERED: 0x0100, // 256

  /**
    The view has been attached.

    Use a logical AND (single `&`) to test attached status.  For example,

        view.get('viewState') & SC.CoreView.IS_ATTACHED

    @static
    @constant
  */
  IS_ATTACHED: 0x0080, // 128

  /**
    The view is visible in the display.

    Use a logical AND (single `&`) to test shown status.  For example,

        view.get('viewState') & SC.CoreView.IS_SHOWN

    @static
    @constant
  */
  IS_SHOWN: 0x0040, // 64

  /**
    The view is invisible in the display.

    Use a logical AND (single `&`) to test hidden status.  For example,

        view.get('viewState') & SC.CoreView.IS_HIDDEN

    @static
    @constant
  */
  IS_HIDDEN: 0x0020, // 32

  /**
    The view has been created, but has not been rendered or attached.

    @static
    @constant
  */
  UNRENDERED: 0x0200, // 512

  /**
    The view has been created and rendered, but has not been attached
    (i.e. appended to the document).

    @static
    @constant
  */
  UNATTACHED: 0x0300, // 768

  /**
    The view has been created and rendered, but an ancestor is not attached.

    @static
    @constant
  */
  UNATTACHED_BY_PARENT: 0x0301, // 769

  /**
    The view has been created, rendered and attached and is visible in the
    display.

    @static
    @constant
  */
  ATTACHED_SHOWN: 0x03C0, // 960

  /**
    The view has been created, rendered and attached, is visible in the
    display and is being animated via a call to `animate()`.

    @static
    @constant
  */
  ATTACHED_SHOWN_ANIMATING: 0x03C3, // 963

  /**
    The view has been created, rendered and attached, but is not visible in the
    display.

    Test with & SC.CoreView.IS_HIDDEN
    @static
    @constant
  */
  ATTACHED_HIDDEN: 0x03A0, // 928

  /**
    The view has been created, rendered and attached, but is not visible in the
    display due to being hidden by a parent view.

    @static
    @constant
  */
  ATTACHED_HIDDEN_BY_PARENT: 0x03A1, // 929

  /**
    The view has been created, rendered and attached and is visible in the
    display.  It is currently transitioning according to the transitionIn
    property before being fully shown (i.e ATTACHED_SHOWN).

    @static
    @constant
  */
  ATTACHED_BUILDING_IN: 0x03C1, // 961

  /**
    The view has been created, rendered and attached.  It is currently
    transitioning according to the transitionOut property before being
    detached (i.e. removed from the document).

    @static
    @constant
  */
  ATTACHED_BUILDING_OUT: 0x0381, // 897

  /**
    The view has been created, rendered and attached.  It is currently
    transitioning according to the transitionOut property before being
    detached (i.e. removed from the document) because a parent view is
    being detached.

    @static
    @constant
  */
  ATTACHED_BUILDING_OUT_BY_PARENT: 0x0382, // 898

  /**
    The view has been created, rendered and attached and is visible in the
    display.  It is currently transitioning according to the transitionShow
    property before being fully shown (i.e ATTACHED_SHOWN).

    @static
    @constant
  */
  ATTACHED_SHOWING: 0x03C2, // 962

  /**
    The view has been created, rendered and attached.  It is currently
    transitioning according to the transitionHide property before being fully
    hidden.

    @static
    @constant
  */
  ATTACHED_HIDING: 0x03A2 // 930

});


SC.CoreView.reopen(
  /** @scope SC.CoreView.prototype */ {

  //@if(debug)
  /* BEGIN DEBUG ONLY PROPERTIES AND METHODS */

  /** @private Creates string representation of view, with view state. */
  toString: function () {
    return "%@ (%@)".fmt(sc_super(), this._viewStateString());
  },

  /** @private Creates string representation of view state.  */
  _viewStateString: function () {
    var ret = [], state = this.get('viewState');

    for (var prop in SC.CoreView) {
      if (prop.match(/[A-Z_]$/) && SC.CoreView[prop] === state) {
        ret.push(prop);
      }
    }

    return ret.join(" ");
  },

  /* END DEBUG ONLY PROPERTIES AND METHODS */
  //@endif

  // ------------------------------------------------------------------------
  // Properties
  //

  /* @private Internal variable used to store the number of children building out while we wait to be detached. */
  _buildingOutCount: null,

  /* @private Internal variable used to track the original view being detached that we are delaying so that we can build out. */
  _owningView: null,

  /* @private Internal variable used to store the original layout before running an automatic transition. */
  _preTransitionLayout: null,

  /* @private Internal variable used to store the original frame before running an automatic transition. */
  _preTransitionFrame: null,

  /* @private Internal variable used to cache layout properties which must be reset after the transition. */
  _transitionLayoutCache: null,

  /**
    The current state of the view as managed by its internal statechart.

    In order to optimize the behavior of SC.View, such as only observing display
    properties when in a rendered state or queueing updates when in a non-shown
    state, SC.View includes a simple internal statechart that maintains the
    current state of the view.

    Views have several possible states:

    * SC.CoreView.UNRENDERED
    * SC.CoreView.UNATTACHED
    * SC.CoreView.UNATTACHED_BY_PARENT
    * SC.CoreView.ATTACHED_SHOWING
    * SC.CoreView.ATTACHED_SHOWN
    * SC.CoreView.ATTACHED_SHOWN_ANIMATING
    * SC.CoreView.ATTACHED_HIDING
    * SC.CoreView.ATTACHED_HIDDEN
    * SC.CoreView.ATTACHED_HIDDEN_BY_PARENT
    * SC.CoreView.ATTACHED_BUILDING_IN
    * SC.CoreView.ATTACHED_BUILDING_OUT
    * SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT

    @type String
    @default SC.CoreView.UNRENDERED
    @readonly
  */
  viewState: SC.CoreView.UNRENDERED,

  /**
    Whether the view's layer is attached to the document or not.

    When the view's layer is attached to the document, this value will be true.

    @field
    @type Boolean
    @default false
    @readonly
  */
  isAttached: function () {
    var state = this.get('viewState');
    return state & SC.CoreView.IS_ATTACHED;
  }.property('viewState').cacheable(),

  /** @private
    Whether the view's layer exists or not.

    When the view's layer is created, this value will be true.  This includes
    the unattached view state and all of the attached states.

    @field
    @type Boolean
    @default false
    @readonly
  */
  // NOTE: This property is of little value, so it's private in case we decide to toss it.
  _isRendered: function () {
    return this.get('viewState') !== SC.CoreView.UNRENDERED;
  }.property('viewState').cacheable(),

  /**
    Whether the view is fully or becoming shown or not.

    When the view is shown in the window, this value will be true.  Note that
    if the view is transitioning out or hiding, this value will still be true.

    This is not necessarily the same as `isVisible` although the two properties
    are related.  For instance, it's possible to set `isVisible` to `true` and
    still have `isVisibleInWindow` be `false` or vice versa due to the
    `isVisibleInWindow` state of the view's parent view.  Therefore,
    `isVisibleInWindow` represents the actual visible state of the view and
    `isVisible` is used to attempt to alter that state.

    @field
    @type Boolean
    @default false
    @readonly
  */
  isVisibleInWindow: function () {
    var state = this.get('viewState');
    return state & SC.CoreView.IS_ATTACHED &&
      state !== SC.CoreView.ATTACHED_HIDDEN &&
      state !== SC.CoreView.ATTACHED_HIDDEN_BY_PARENT;
  }.property('viewState').cacheable(),


  // ------------------------------------------------------------------------
  // Actions (Locked down to the proper state)
  //

  /** @private Adopt this view action. */
  _doAdopt: function (parentView, beforeView) {
    var curParentView = this.get('parentView'),
      handled = true;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doAdopt(%@, %@)'.fmt(this, parentView, beforeView), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    if (curParentView && curParentView !== parentView) {
      //@if(debug)
      // This should be avoided, because using the same view instance without explicitly orphaning it first is a dangerous practice.
      SC.warn("Developer Warning: You should not adopt the view, %@, to a new parent without removing it from its old parent first.".fmt(this));
      //@endif

      // Force orphaning the view.
      this._doOrphan();
      curParentView = false;
    }

    // You can adopt childViews that have you set as their parent (i.e. created
    // with createChildView()), but have not yet been fully adopted.
    if (!curParentView || this.get('childViews').indexOf(this) < 0) {
      var idx,
        childViews = parentView.get('childViews'),
        parentViewState = parentView.get('viewState'),
        parentNode, nextNode, nextView, siblings;

      // Notify *will* (top-down from parent to children).
      if (parentView.willAddChild) { parentView.willAddChild(this, beforeView); }
      if (this.willAddToParent) { this.willAddToParent(parentView, beforeView); }

      // Set parentView.
      this.set('parentView', parentView);

      // Add to the new parent's childViews array.
      if (childViews.needsClone) { parentView.set(childViews = []); }
      idx = (beforeView) ? childViews.indexOf(beforeView) : childViews.length;
      if (idx < 0) { idx = childViews.length; }
      childViews.insertAt(idx, this);

      // Pass the current designMode to the view (and its children).
      this.updateDesignMode(this.get('designMode'), parentView.get('designMode'));

      // Notify adopted (on self and all child views).
      this._adopted();

      switch (this.get('viewState')) {
      case SC.CoreView.UNRENDERED:
        switch (parentViewState) {
        case SC.CoreView.UNRENDERED:
          break;
        default:
          // Bypass the unrendered state for adopted views.
          this._doRender();
        }
        break;
      case SC.CoreView.UNATTACHED:
        switch (parentViewState) {
        case SC.CoreView.UNRENDERED:
          // Bring the child view down to the state of the parent.
          this._doDestroyLayer();
          break;
        default:
          parentNode = parentView.get('containerLayer');
          siblings = parentView.get('childViews');
          nextView = siblings.objectAt(siblings.indexOf(this) + 1);
          nextNode = (nextView) ? nextView.get('layer') : null;

          this._doAttach(parentNode, nextNode);
        }
        break;
      default: // ATTACHED_X
        switch (parentViewState) {
        case SC.CoreView.UNRENDERED:
          // Bring the child view down to the state of the parent.
          this._doDestroyLayer();
          break;
        default:
          parentNode = parentView.get('containerLayer');
          siblings = parentView.get('childViews');
          nextView = siblings.objectAt(siblings.indexOf(this) + 1);
          nextNode = (nextView) ? nextView.get('layer') : null;

          this._doAttach(parentNode, nextNode);
        }
      }

      // Notify *did* (bottom-up from children to parent).
      if (this.didAddToParent) { this.didAddToParent(parentView, beforeView); }
      if (parentView.didAddChild) { parentView.didAddChild(this, beforeView); }
    } else {
      handled = false;
    }

    return handled;
  },

  /** @private Attach this view action. */
  _doAttach: function (parentNode, nextNode) {
    var state = this.get('viewState'),
      transitionIn = this.get('transitionIn'),
      parentView,
      isHandled = false;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doAttach(%@, %@)'.fmt(this, parentNode, nextNode), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {

    // Normal case: view is not attached and is being attached.
    case SC.CoreView.UNATTACHED:
      var node = this.get('layer');

      this._executeQueuedUpdates();

      // Attach to parentNode
      // IE doesn't support insertBefore(blah, undefined) in version IE9.
      parentNode.insertBefore(node, nextNode || null);

      parentView = this.get('parentView');
      if (!parentView || (parentView && parentView.get('isAttached'))) {
        // Update states after *will* and before *did* notifications!
        this._routeOnAttached();

        // Give child views a chance to notify and update state.
        this._callOnChildViews('_parentDidAppendToDocument');

        // Notify *did* (bottom-up from children to parent).
        this._notifyDidAttach();
      } else {
        // Update states after *will* and before *did* notifications!
        this._gotoUnattachedByParentState();
      }

      isHandled = true;
      break;

    // Special case: view switched from building out to building in.
    case SC.CoreView.ATTACHED_BUILDING_OUT:
      // If already building out, we need to cancel and possibly build in.
      this._callOnChildViews('_parentDidCancelBuildOut');

      // Remove the shared building out count if it exists.
      this._buildingOutCount = null;

      // Note: We can be in ATTACHED_BUILDING_OUT state without a transition out while we wait for child views.
      // Update states after *will* and before *did* notifications!
      if (this.get('transitionOut')) {
        if (transitionIn) {
          // this.invokeNext(function () {
            this._transitionIn();
          // });

          this._gotoAttachedBuildingInState();
        } else {
          // Update state first!
          this._gotoAttachedShownState();

          this._cancelTransition();
        }
      } else {

        // Route.
        this._gotoAttachedShownState();
      }

      isHandled = true;
      break;

    // Invalid states that have no effect.
    case SC.CoreView.ATTACHED_HIDING:
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
    case SC.CoreView.ATTACHED_SHOWING:
    case SC.CoreView.UNRENDERED:
      break;

    // Improper states that have no effect, but should be discouraged.
    case SC.CoreView.ATTACHED_SHOWN:
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
      //@if(debug)
      if (parentNode !== this.getPath('parentView.layer')) {
        // This should be avoided, because moving the view layer without explicitly removing it first is a dangerous practice.
        SC.warn("Developer Warning: You can not attach the view, %@, to a new node without properly detaching it first.".fmt(this));
      }
      //@endif
      break;
    case SC.CoreView.UNATTACHED_BY_PARENT:
      //@if(debug)
      SC.warn("Developer Warning: You can not attach the child view, %@, directly.".fmt(this));
      //@endif
      break;
    }

    return isHandled;
  },

  /** @private Destroy the layer of this view action. */
  _doDestroyLayer: function () {
    var state = this.get('viewState'),
      isHandled = false;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doDestroyLayer()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {

    // Invalid states that have no effect.
    case SC.CoreView.UNRENDERED:
    case SC.CoreView.ATTACHED_HIDING:
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
    case SC.CoreView.ATTACHED_SHOWING:
    case SC.CoreView.ATTACHED_SHOWN:
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
    case SC.CoreView.UNATTACHED_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
      break;

    // Normal case (SC.CoreView.UNATTACHED): view is rendered and its layer is being destroyed.
    default:
      // Notify *will* (top-down from parent to children).
      this._notifyWillDestroyLayer();
      this._callOnChildViews('_notifyWillDestroyLayer');

      // Remove our reference to the layer (our self and all our child views).
      this._executeDoDestroyLayer();
      this._callOnChildViews('_executeDoDestroyLayer');

      // UNUSED.
      // Notify *did* (bottom-up from children to parent).
      // this._callOnChildViews('_notifyDidDestroyLayer');
      // this._notifyDidDestroyLayer();

      isHandled = true;
    }

    return isHandled;
  },

  /** @private Detach this view action. */
  _doDetach: function (immediately) {
    var state = this.get('viewState'),
      transitionOut = this.get('transitionOut'),
      inPlace = false,
      isHandled = true;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doDetach()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {

    // Normal case: Attached visible view being detached.
    case SC.CoreView.ATTACHED_SHOWN:
      break;

    // Normal case: Attached non-visible view being detached.
    case SC.CoreView.UNATTACHED_BY_PARENT:
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
      // No need to transition out, since we're hidden.
      immediately = true;
      break;

    // Near normal case: Attached visible view that is in the middle of an animation.
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
      this.cancelAnimation();
      break;

    // Near normal case: Attached showing view. We cancel the incoming animation
    // rather than swapping to a build out (difficult to get right, because we lose track of the correct final layout).
    case SC.CoreView.ATTACHED_SHOWING:
      this.cancelAnimation(); // Fires didTransitionIn callback (state changes to ATTACHED_SHOWN/notifications sent).
      break;

    // Near normal case: Attached hiding view. We cancel the outgoing animation
    // rather than swapping to a build out (difficult to get right, because we lose track of the correct final layout).
    case SC.CoreView.ATTACHED_HIDING:
      this.cancelAnimation(); // Fires didTransitionOut callback (state changes to ATTACHED_HIDDEN/notifications sent).

      // No need to transition out, since we're hidden.
      immediately = true;
      break;

    // Near normal case: Attached building in view. We cancel the incoming
    // animation and build out the view in place.
    case SC.CoreView.ATTACHED_BUILDING_IN:
      if (immediately || !transitionOut) {
        this.cancelAnimation(); // Fires didTransitionIn callback (state changes to ATTACHED_SHOWN/notifications sent).
      } else {
        // Set the state manually so the callback doesn't do clean up and notify.
        this._gotoAttachedShownState();

        // Cancel the animation in place (setup properties still exist and will be cleared by transitionOut)
        this.cancelAnimation(SC.LayoutState.CURRENT); // Fires didTransitionIn callback (no state change/no notifications).

        // Transition out in place.
        inPlace = true;
      }
      break;

    // Special case: Already building out, because parent is building out. Stop
    // the transition in place so that it can continue in place on its own.
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT: // FAST PATH!
      // Note: *will* detach notice already sent.
      this.cancelAnimation(SC.LayoutState.CURRENT); // Fires didTransitionOut callback (necessary to clean up parent view build out wait)

      // Switch state to regular state (the view should only have been able to get to ATTACHED_BUILDING_OUT_BY_PARENT from ATTACHED_SHOWN).
      this._gotoAttachedShownState();

      // TODO: Grab the build out count for all child views of this view. What a nightmare for an edge case!

      // Transition out in place.
      inPlace = true;

      break;

    // Special case: Already building out. Fast path!
    case SC.CoreView.ATTACHED_BUILDING_OUT:
      // If immediately is passed, cancel the build out prematurely.
      if (immediately) {
        // Note: *will* detach notice already sent.
        this.cancelAnimation(); // Fires didTransitionOut callback (state changes to UNATTACHED/notifications sent).
      }

      // Don't try to notify or run transition out code again.
      return true;

    // Invalid states that have no effect. Fast path!
    case SC.CoreView.UNRENDERED:
    case SC.CoreView.UNATTACHED:
      return false;
    }

    // Notify *will* (top-down from parent to children). The children will be
    // notified only when they are actually about to be removed.
    // this._notifyWillDetach();

    if (immediately) {
      // Detach immediately.
      this._executeDoDetach();
    } else {
      // In order to allow the removal of a parent to be delayed by children's
      // transitions, we track which views are building out and finish
      // only when they're all done.
      this._buildingOutCount = 0;

      // Tell all the child views so that any with a transitionOut may run it.
      this._callOnChildViews('_parentWillBuildOutFromDocument', this);

      if (transitionOut) {
        // this.invokeNext(function () {
          this._transitionOut(inPlace, this);
        // });

        // Update states after *will* and before *did* notifications!
        this._gotoAttachedBuildingOutState();
      } else if (this._buildingOutCount > 0) {
        // Some children are building out, we will have to wait for them.
        this._gotoAttachedBuildingOutState();
      } else {
        this._buildingOutCount = null;

        // Detach immediately.
        this._executeDoDetach();
      }
    }

    return isHandled;
  },

  /** @private Hide this view action. */
  _doHide: function () {
    var state = this.get('viewState'),
      transitionHide = this.get('transitionHide');

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doHide()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {
    case SC.CoreView.UNRENDERED: // FAST PATH!
    case SC.CoreView.ATTACHED_HIDDEN: // FAST PATH!
    case SC.CoreView.ATTACHED_HIDING: // FAST PATH!
      return false;
    case SC.CoreView.UNATTACHED: // FAST PATH!
    case SC.CoreView.UNATTACHED_BY_PARENT: // FAST PATH!
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT: // FAST PATH!
    case SC.CoreView.ATTACHED_BUILDING_OUT: // FAST PATH!
      // Queue the visibility update for the next time we display.
      this._visibleStyleNeedsUpdate = true;

      return true;
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT: // FAST PATH!
      // Note that visibility update is NOT conditional for this state.
      this._doUpdateVisibleStyle();

      // Update states after *will* and before *did* notifications!
      this._gotoAttachedHiddenState();

      return true;
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_SHOWING:
      // Cancel the animation and revert to hidden.
      this.cancelAnimation();
      this._teardownTransition();
      this._gotoAttachedHiddenState();
      break;

    // Near normal case: Attached visible view that is in the middle of an animation.
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
      this.cancelAnimation();
      break;

    case SC.CoreView.ATTACHED_SHOWN:
      break;
    default:
    }

    // Notify *will* (top-down from parent to children).
    if (this.willHideInDocument) { this.willHideInDocument(); }

    if (transitionHide) {
      // Update states after *will* and before *did* notifications!
      this._gotoAttachedHidingState();

      // this.invokeNext(function () {
        this._transitionHide();
      // });

    } else {
      // Clear out any child views that are still transitioning before we hide.
      this._callOnChildViews('_parentWillHideInDocument');

      // Note that visibility update is NOT conditional for this state.
      this.invokeOnce(this._doUpdateVisibleStyle);

      // Update states after *will* and before *did* notifications!
      this._gotoAttachedHiddenState();
      this._callOnChildViews('_parentDidHideInDocument');

      // Notify *did* (bottom-up from children to parent).
      if (this.didHideInDocument) { this.didHideInDocument(); }
    }

    return true;
  },

  /** @private Orphan this view action. */
  _doOrphan: function () {
    var parentView = this.get('parentView'),
      handled = true;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doOrphan()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    if (parentView) {
      var childViews = parentView.get('childViews'),
        idx = childViews.indexOf(this);

      // Completely remove the view from its parent.
      this.set('parentView', null);

      // Remove view from old parent's childViews array.
      if (idx >= 0) { childViews.removeAt(idx); }

      // Notify orphaned.
      this._orphaned(parentView);
    } else {
      handled = false;
    }

    return handled;
  },

  /** @private Render this view action. */
  _doRender: function () {
    var state = this.get('viewState');

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doRender()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {
    case SC.CoreView.ATTACHED_SHOWING: // FAST PATHS!
    case SC.CoreView.ATTACHED_SHOWN:
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
    case SC.CoreView.ATTACHED_HIDING:
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
    case SC.CoreView.UNATTACHED:
    case SC.CoreView.UNATTACHED_BY_PARENT:
      return false;
    case SC.CoreView.UNRENDERED:
      // Render the layer.
      var context = this.renderContext(this.get('tagName'));

      this.renderToContext(context);
      this.set('layer', context.element());

      // Update states after *will* and before *did* notifications!
      this._gotoUnattachedState();

      // Notify *did* (bottom-up from children to parent).
      this._callOnChildViews('_parentDidRender');
      this._rendered();

      // Bypass the unattached state for adopted views.
      var parentView = this.get('parentView');
      if (parentView && parentView.get('_isRendered')) {
        var parentNode = parentView.get('containerLayer'),
          siblings = parentView.get('childViews'),
          nextView = siblings.objectAt(siblings.indexOf(this) + 1),
          nextNode = (nextView) ? nextView.get('layer') : null;

        // Attach to parentNode
        // IE doesn't support insertBefore(blah, undefined) in version IE9.
        // parentNode.insertBefore(node, nextNode || null);
        this._doAttach(parentNode, nextNode);
      }

      return true;
    }
  },

  /** @private Show this view action. */
  _doShow: function () {
    var state = this.get('viewState'),
      parentView = this.get('parentView'),
      // Views without a parent are not limited by a parent's current state.
      isParentShown = parentView ? parentView.get('viewState') & SC.CoreView.IS_SHOWN : true,
      transitionShow = this.get('transitionShow');

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doShow()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    switch (state) {

    // Normal case: view is hidden and is being shown.
    case SC.CoreView.ATTACHED_HIDDEN:
      if (isParentShown) {
        // Update before showing (note that visibility update is NOT conditional for this state).
        this._doUpdateVisibleStyle();

        // Notify *will* (top-down from parent to children).
        this._callOnChildViews('_parentWillShowInDocument');
        if (this.willShowInDocument) { this.willShowInDocument(); }
      } else {
        // Queue the visibility update for the next time we display.
        this._visibleStyleNeedsUpdate = true;

        // Update states after *will* and before *did* notifications!
        this._gotoAttachedHiddenByParentState();

        return true;
      }
      break;

    case SC.CoreView.ATTACHED_HIDING:
      // Cancel the animation and revert to shown.
      this.cancelAnimation();
      this._teardownTransition();
      this._gotoAttachedShownState();
      break;

    // Special case: Layer exists but is not attached. Queue an update to the visibility style.
    case SC.CoreView.UNATTACHED:
    case SC.CoreView.UNATTACHED_BY_PARENT:
      // Queue the visibility update for the next time we display.
      this._visibleStyleNeedsUpdate = true;
      return true;

    // Invalid states that have no effect.
    case SC.CoreView.UNRENDERED: // FAST PATH!
    case SC.CoreView.ATTACHED_SHOWN: // FAST PATH!
    case SC.CoreView.ATTACHED_SHOWN_ANIMATING:
    case SC.CoreView.ATTACHED_SHOWING: // FAST PATH!
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT: // FAST PATH!
    case SC.CoreView.ATTACHED_BUILDING_IN: // FAST PATH!
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT: // FAST PATH!
    case SC.CoreView.ATTACHED_BUILDING_OUT: // FAST PATH!
      return false;

    default:
    }

    this._executeQueuedUpdates();

    if (transitionShow) {
      // Update states after *will* and before *did* notifications!
      this._gotoAttachedShowingState();

      // this.invokeNext(function () {
        this._transitionShow();
      // });
    } else {
      // Update states after *will* and before *did* notifications!
      this._gotoAttachedShownState();

      // Notify *did* (bottom-up from children to parent).
      if (this.didShowInDocument) { this.didShowInDocument(); }
      this._callOnChildViews('_parentDidShowInDocument');
    }

    return true;
  },

  /** @private Update this view's contents action. */
  _doUpdateContent: function (force) {
    var isVisibleInWindow = this.get('isVisibleInWindow'),
      handled = true;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _doUpdateContent(%@)'.fmt(this, force), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    if (this.get('_isRendered')) {
      if (isVisibleInWindow || force) {
        // Only in the visible states do we allow updates without being forced.
        this._executeDoUpdateContent();
      } else {
        // Otherwise mark the view as needing an update when we enter a shown state again.
        this._contentNeedsUpdate = true;
      }
    } else {
      handled = false;
    }

    return handled;
  },

  // ------------------------------------------------------------------------
  // Events
  //

  /**
    This method is called by transition plugins when the incoming or showing
    transition completes.  You should only use this method if implementing a
    custom transition plugin.

    @param {SC.ViewTransitionProtocol} transition The transition plugin used.
    @param {Object} options The original options used.  One of transitionShowOptions or transitionInOptions.
  */
  didTransitionIn: function () {
    var state = this.get('viewState');

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — didTransitionIn()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    if (state === SC.CoreView.ATTACHED_SHOWING ||
      state === SC.CoreView.ATTACHED_BUILDING_IN) {
      this._teardownTransition();

      // Update states after *will* and before *did* notifications!
      this._gotoAttachedShownState();

      // Notify *did* (bottom-up from children to parent).
      if (this.didShowInDocument) { this.didShowInDocument(); }
      if (state === SC.CoreView.ATTACHED_SHOWING) {
        this._callOnChildViews('_parentDidShowInDocument');
      }
    }
  },

  /**
    This method is called by transition plugins when the outgoing or hiding
    transition completes.  You should only use this method if implementing a
    custom transition plugin.

    @param {SC.ViewTransitionProtocol} transition The transition plugin used.
    @param {Object} options The original options used.  One of transitionHideOptions or transitionOutOptions.
  */
  didTransitionOut: function () {
    var state = this.get('viewState');

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — didTransitionOut()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    if (state === SC.CoreView.ATTACHED_BUILDING_OUT) {
      this._teardownTransition();

      this._executeDoDetach();
    } else if (state === SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT) {
      var owningView = this._owningView;
      // We can't clean up the transition until the parent is done.  For
      // example, a fast child build out inside of a slow parent build out.
      owningView._buildingOutCount--;

      if (owningView._buildingOutCount === 0) {
        owningView._executeDoDetach();

        // Clean up.
        this._owningView = null;
      }
    } else if (state === SC.CoreView.ATTACHED_HIDING) {
      this._teardownTransition();

      // Notify *will* (top-down from parent to children).
      this._callOnChildViews('_parentWillHideInDocument');

      // Note that visibility update is NOT conditional for this state.
      this._doUpdateVisibleStyle();

      // Update states after *will* and before *did* notifications!
      this._gotoAttachedHiddenState();

      // Notify *did* (bottom-up from children to parent).
      this._callOnChildViews('_parentDidHideInDocument');
      if (this.didHideInDocument) { this.didHideInDocument(); }
    }
  },

  /** @private The 'adopted' event. */
  _adopted: function () {
    // This has been moved to the _notifyDidAttach event.
    // this.notifyPropertyChange('frame');
  },

  /** @private The 'orphaned' event. */
  _orphaned: function (oldParentView) {
    // Notify.
    if (oldParentView.didRemoveChild) { oldParentView.didRemoveChild(this); }
    if (this.didRemoveFromParent) { this.didRemoveFromParent(oldParentView); }
  },

  /** @private The 'rendered' event. */
  _rendered: function () {
    var displayProperties,
      len, idx;

    // Register display property observers.
    displayProperties = this.get('displayProperties');
    for (idx = 0, len = displayProperties.length; idx < len; idx++) {
      this.addObserver(displayProperties[idx], this, this.displayDidChange);
    }

    // Begin observing isVisible & isFirstResponder.
    this.addObserver('isVisible', this, this._isVisibleDidChange);
    this.addObserver('isFirstResponder', this, this._isFirstResponderDidChange);

    // TODO: we should be able to fix this with states
    // if (this.get('useStaticLayout')) this.viewDidResize();

    // var childView, childViews = this.get('childViews');
    // for (var i = childViews.length - 1; i >= 0; i--) {
    //   childView = childViews[i];

    //   // We allow missing childViews in the array so ignore them.
    //   if (!childView) { continue; }

      // A parent view creating a layer might result in the creation of a
      // child view's DOM node being created via a render context without
      // createLayer() being invoked on the child.  In such cases, if anyone
      // had requested 'layer' and it was cached as null, we need to
      // invalidate it.
      // TODO: we should be able to fix this with states
      // childView.notifyPropertyChange('layer');

      // A strange case, that a childView's frame won't be correct before
      // we have a layer, if the childView doesn't have a fixed layout
      // and we are using static layout.
      // TODO: we should be able to fix this with states
      // if (this.get('useStaticLayout')) {
      //   if (!childView.get('isFixedLayout')) { childView.viewDidResize(); }
      // }

    //   childView._rendered();
    // }

    // Notify.
    this._notifyDidRender();
  },

  // ------------------------------------------------------------------------
  // States
  //

  /** @private */
  _gotoAttachedBuildingInState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_BUILDING_IN);
  },

  /** @private */
  _gotoAttachedBuildingOutState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_BUILDING_OUT);
  },

  /** @private */
  _gotoAttachedBuildingOutByParentState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT);
  },

  /** @private */
  _gotoAttachedHiddenState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_HIDDEN);
  },

  /** @private */
  _gotoAttachedHiddenByParentState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_HIDDEN_BY_PARENT);
  },

  /** @private */
  _gotoAttachedHidingState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_HIDING);
  },

  /** @private */
  _gotoAttachedShowingState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_SHOWING);
  },

  /** @private */
  _gotoAttachedShownState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.ATTACHED_SHOWN);
  },

  /** @private */
  _gotoUnattachedState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.UNATTACHED);
  },

  /** @private */
  _gotoUnattachedByParentState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.UNATTACHED_BY_PARENT);
  },

  /** @private */
  _gotoUnrenderedState: function () {
    // Update the state.
    this.set('viewState', SC.CoreView.UNRENDERED);
  },

  // ------------------------------------------------------------------------
  // Methods
  //

  /** @private Clear building in transition. */
  _cancelTransition: function () {
    // Cancel conflicting transitions. This causes the animation callback to fire.
    this.cancelAnimation();
    // this._teardownTransition();
  },

  /** @private */
  _doUpdateVisibleStyle: function () {
    var isVisible = this.get('isVisible');

    this.$().toggleClass('sc-hidden', !isVisible);
    this.$().attr('aria-hidden', isVisible ? null : true);

    // Reset that an update is required.
    this._visibleStyleNeedsUpdate = false;
  },

  /** @private Destroys the layer and updates the state. */
  _executeDoDestroyLayer: function () {
    var displayProperties,
      idx, len;

    // Remove the layer reference.
    this.set('layer', null);

    // Unregister display property observers.
    displayProperties = this.get('displayProperties');
    for (idx = 0, len = displayProperties.length; idx < len; idx++) {
      this.removeObserver(displayProperties[idx], this, this.displayDidChange);
    }

    // Stop observing isVisible & isFirstResponder.
    this.removeObserver('isVisible', this, this._isVisibleDidChange);
    this.removeObserver('isFirstResponder', this, this._isFirstResponderDidChange);

    // Update states after *will* and before *did* notifications!
    this._gotoUnrenderedState();
  },

  /** @private Detaches the view and updates the state. */
  _executeDoDetach: function () {
    // Notify *will* (top-down from parent to children).
    this._notifyWillDetach();
    this._callOnChildViews('_parentWillRemoveFromDocument');

    // Detach the layer.
    var node = this.get('layer');
    node.parentNode.removeChild(node);

    // Update states after *will* and before *did* notifications!
    this._gotoUnattachedState();
    this._callOnChildViews('_parentDidRemoveFromDocument');
  },

  /** @private */
  _executeDoUpdateContent: function () {
    var mixins = this.renderMixin,
      context = this.renderContext(this.get('layer'));

    // If there is no update method, fallback to calling render with extra
    // firstTime argument set to false.
    if (!this.update) {
      this.render(context, false);
    } else {
      this.update(context.$());
    }

    // Call renderMixin methods.
    if (mixins) {
      var len = mixins.length;
      for (var idx = 0; idx < len; ++idx) {
        mixins[idx].call(this, context, false);
      }
    }

    // Call applyAttributesToContext so that subclasses that override it can
    // insert further attributes.
    this.applyAttributesToContext(context);

    context.update();

    // Legacy.
    this.set('layerNeedsUpdate', false);

    // Reset that an update is required.
    this._contentNeedsUpdate = false;

    // Notify.
    this.notifyPropertyChange('layer');
    if (this.didUpdateLayer) { this.didUpdateLayer(); }

    if (this.designer && this.designer.viewDidUpdateLayer) {
      this.designer.viewDidUpdateLayer(); //let the designer know
    }
  },

  /** @private */
  _executeQueuedUpdates: function () {

    // Update visibility style if necessary.
    if (this._visibleStyleNeedsUpdate) {
      this._doUpdateVisibleStyle();
    }

    // Update the content of the layer if necessary.
    if (this._contentNeedsUpdate) {
      this._executeDoUpdateContent();
    }
  },

  /** @private
    Marks the view as needing a visibility update if the isVisible property
    changes.

    This observer is connected when the view is attached and is disconnected
    when the view is detached.
  */
  _isVisibleDidChange: function () {
    if (this.get('isVisible')) {
      this._doShow();
    } else {
      this._doHide();
    }
  },

  /** @private
    Adds the 'focus' class to the view.

    This observer is connected when the view is attached and is disconnected
    when the view is detached.
  */
  _isFirstResponderDidChange: function () {
    var isFirstResponder = this.get('isFirstResponder');

    this.$().toggleClass('focus', isFirstResponder);
  },

  _notifyDidRender: function () {
    var mixins = this.didCreateLayerMixin,
      idx, len;

    // Send notice that the layer was created.
    if (this.didCreateLayer) { this.didCreateLayer(); }
    if (mixins) {
      len = mixins.length;
      for (idx = 0; idx < len; ++idx) {
        mixins[idx].call(this);
      }
    }
  },

  /** @private Notify on attached. */
  _notifyDidAttach: function () {
    // If we don't have the layout module then we don't know the frame until appended to the document.
    this.notifyPropertyChange('frame');

    // Notify.
    if (this.didAppendToDocument) { this.didAppendToDocument(); }
  },

  /** @private Notify on detaching. */
  _notifyWillDetach: function () {
    if (this.willRemoveFromDocument) { this.willRemoveFromDocument(); }
  },

  /** @private Notify before destroying layer. */
  _notifyWillDestroyLayer: function () {
    var idx, len,
      mixins;

    mixins = this.willDestroyLayerMixin;
    if (mixins) {
      len = mixins.length;
      for (idx = 0; idx < len; ++idx) {
        mixins[idx].call(this);
      }
    }

    if (this.willDestroyLayer) { this.willDestroyLayer(); }
  },

  /** @private Routes according to parent did append. */
  _parentDidAppendToDocument: function () {
    // Run any queued updates.
    this._executeQueuedUpdates();

    // Update states after *will* and before *did* notifications!
    this._routeOnAttached();

    // Notify.
    this._notifyDidAttach();
  },

  /** @private Updates according to parent did cancel build out. */
  _parentDidCancelBuildOut: function () {
    var state = this.get('viewState'),
      transitionIn = this.get('transitionIn');

    if (state === SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT) {
      if (transitionIn) {
        // this.invokeNext(function () {
          this._transitionIn();
        // });

        // Update states after *will* and before *did* notifications!
        this._gotoAttachedBuildingInState();
      } else {
        this._cancelTransition();

        // Update states after *will* and before *did* notifications!
        this._gotoAttachedShownState();
      }
    } else if (state === SC.CoreView.ATTACHED_BUILDING_OUT || state &
      SC.CoreView.IS_HIDDEN) {
      // There's no need to continue to further child views.
      return false;
    }
  },

  /** @private Updates according to parent did render. */
  _parentDidRender: function () {
    // Update states after *will* and before *did* notifications!
    this._gotoUnattachedByParentState();

    this._rendered();
  },

  /** @private Starts building out view if appropriate. */
  _parentWillBuildOutFromDocument: function (owningView) {
    var state = this.get('viewState'),
      transitionOut = this.get('transitionOut');

    switch (state) {
    case SC.CoreView.UNRENDERED:
    case SC.CoreView.UNATTACHED:
    case SC.CoreView.UNATTACHED_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
      // There's no need to continue to further child views.
      // return false;
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
    case SC.CoreView.ATTACHED_HIDING:
      // Notify *will* (top-down from parent to children).
      // this._notifyWillDetach();

      return false;
    case SC.CoreView.ATTACHED_SHOWING:
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_SHOWN:
      // Notify *will* (top-down from parent to children).
      // this._notifyWillDetach();

      if (transitionOut) {
        this._owningView = owningView;

        // this.invokeNext(function () {
          this._transitionOut(false, owningView);
        // });

        // Update states after *will* and before *did* notifications!
        this._gotoAttachedBuildingOutByParentState();
      }
      return true;
    default:
    }
  },

  /** @private Clean up before parent is detached. */
  _parentWillRemoveFromDocument: function () {
    var state = this.get('viewState');

    switch (state) {
    case SC.CoreView.UNRENDERED:
    case SC.CoreView.UNATTACHED:
    case SC.CoreView.UNATTACHED_BY_PARENT:
      // There's no need to continue to further child views.
      return false;
    // Cancel any outstanding isVisible transitions and mark for visibility update.
    case SC.CoreView.ATTACHED_SHOWING:
    case SC.CoreView.ATTACHED_HIDING:
      this._cancelTransition();
      this._teardownTransition();
      this._visibleStyleNeedsUpdate = true;
      break;
    // Cancel any other outstanding transitions.
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
      this._cancelTransition();
      this._teardownTransition();
      break;
    case SC.CoreView.ATTACHED_HIDDEN:
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
    case SC.CoreView.ATTACHED_SHOWN:
      break;
    default:
      // Attached and not in a transitionary state.
    }

    // Notify *will*.
    this._notifyWillDetach();
  },

  /** @private Routes according to parent did detach. */
  _parentDidRemoveFromDocument: function () {
    var state = this.get('viewState');

    if (state & SC.CoreView.IS_ATTACHED) {
      // Update states after *will* and before *did* notifications!
      this._gotoUnattachedByParentState();
    } else {
      // There's no need to continue to further child views.
      return false;
    }
  },

  /** @private Routes according to parent did hide. */
  _parentDidHideInDocument: function () {
    var state = this.get('viewState');

    switch (state) {
    case SC.CoreView.UNRENDERED: // FAST PATH!
    case SC.CoreView.UNATTACHED: // FAST PATH!
    case SC.CoreView.UNATTACHED_BY_PARENT:
    case SC.CoreView.ATTACHED_HIDING:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
    case SC.CoreView.ATTACHED_HIDDEN: // FAST PATH!
    case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
      // There's no need to continue to further child views.
      return false;
    case SC.CoreView.ATTACHED_BUILDING_IN:
    case SC.CoreView.ATTACHED_SHOWING:
    case SC.CoreView.ATTACHED_SHOWN:
      break;
    default:
    }

    // Update states after *will* and before *did* notifications!
    this._gotoAttachedHiddenByParentState();

    // Notify *did* (bottom-up from children to parent).
    if (this.didHideInDocument) { this.didHideInDocument(); }
  },

  /** @private Routes according to parent will hide. */
  _parentWillHideInDocument: function () {
    var state = this.get('viewState');

    switch (state) {
    case SC.CoreView.UNRENDERED: // FAST PATH!
    case SC.CoreView.UNATTACHED: // FAST PATH!
    // case SC.CoreView.UNATTACHED_BY_PARENT:
    case SC.CoreView.ATTACHED_HIDDEN: // FAST PATH!
    // case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
      // There's no need to continue to further child views.
      return false;
    case SC.CoreView.ATTACHED_HIDING: // FAST PATH!
      // Clear out any child views that are transitioning before we hide.
      // Notify *will* (top-down from parent to children).
      // this._callOnChildViews('_parentWillHideInDocument');

      // // Update states after *will* and before *did* notifications!
      // this._gotoAttachedHiddenState();

      // Cancel our hiding transition.
      this._cancelTransition();

      // We didn't quite hide in time so indicate that visibility needs update next time we display.
      // this._visibleStyleNeedsUpdate = true;

      return false;
    case SC.CoreView.ATTACHED_BUILDING_IN: // FAST PATH!
    case SC.CoreView.ATTACHED_SHOWING: // FAST PATH!
      this._cancelTransition();
      break;
    // case SC.CoreView.ATTACHED_BUILDING_OUT:
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
      this._cancelTransition();
      break;
    case SC.CoreView.ATTACHED_SHOWN:
      break;
    default:
      // Attached and not in a transitionary state.
    }

    // Notify *will* (top-down from parent to children).
    if (this.willHideInDocument) { this.willHideInDocument(); }
  },

  /** @private Routes according to parent did show. */
  _parentDidShowInDocument: function () {
    var state = this.get('viewState');

    if (state === SC.CoreView.ATTACHED_HIDDEN_BY_PARENT) {
      // Update states after *will* and before *did* notifications!
      this._gotoAttachedShownState();

      // Notify *did* (bottom-up from children to parent).
      if (this.didShowInDocument) { this.didShowInDocument(); }
    } else {
      // There's no need to continue to further child views.
      return false;
    }
  },

  /** @private Prepares according to parent will show. */
  _parentWillShowInDocument: function () {
    var state = this.get('viewState');

    if (state === SC.CoreView.ATTACHED_HIDDEN_BY_PARENT) {
      this._executeQueuedUpdates();

      // Notify *will* (top-dow`n from parent to children).
      if (this.willShowInDocument) { this.willShowInDocument(); }
    } else {
      // There's no need to continue to further child views.
      return false;
    }
  },

  /** @private */
  _setupTransition: function (transition) {
    // Get a copy of the layout.
    var layout = SC.clone(this.get('layout'));
    // Prepare for a transition.
    this._preTransitionLayout = layout;
    this._preTransitionFrame = this.get('borderFrame');
    // Cache appropriate layout values.
    var layoutProperties = SC.get(transition, 'layoutProperties');
    // If the transition specifies any layouts, cache them.
    if (layoutProperties && layoutProperties.length) {
      this._transitionLayoutCache = {};
      var i, prop, len = layoutProperties.length;
      for (i = 0; i < len; i++) {
        prop = layoutProperties[i];
        this._transitionLayoutCache[prop] = layout[prop] === undefined ? null : layout[prop];
      }
    }
  },

  /** @private */
  _teardownTransition: function () {
    // Make sure this isn't being called twice for the same transition. For example,
    // some transition plugins will send a didTransitionIn/Out event even if the
    // transition was cancelled.

    // If we have a hash of cached layout properties, adjust back to it.
    if (this._transitionLayoutCache) {
      this.adjust(this._transitionLayoutCache);
    }
    // Otherwise, just set the layout back to what it was.
    else if (this._preTransitionLayout) {
      this.set('layout', this._preTransitionLayout);
    }
    // Clean up.
    this._preTransitionLayout = null;
    this._preTransitionFrame = null;
    this._transitionLayoutCache = null;
  },

  /** @private Attempts to run a transition hide, ensuring any incoming transitions are stopped in place. */
  _transitionHide: function () {
    var transitionHide = this.get('transitionHide'),
      options = this.get('transitionHideOptions') || {};

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _transitionHide()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif

    // switch (state) {
    // case SC.CoreView.ATTACHED_SHOWING:
    // case SC.CoreView.ATTACHED_BUILDING_IN:
    //   this.cancelAnimation(SC.LayoutState.CURRENT);
    //   inPlace = true;
    //   break;
    // default:
    this._setupTransition(transitionHide);
    // }

    // Set up the hiding transition.
    if (transitionHide.setup) {
      transitionHide.setup(this, options);
    }

    // Execute the hiding transition.
    transitionHide.run(this, options, this._preTransitionLayout, this._preTransitionFrame);
  },

  /** @private Attempts to run a transition in, ensuring any outgoing transitions are stopped in place. */
  _transitionIn: function () {
    var state = this.get('viewState'),
      transitionIn = this.get('transitionIn'),
      options = this.get('transitionInOptions') || {},
      inPlace = false;

    switch (state) {
    case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
    case SC.CoreView.ATTACHED_BUILDING_OUT:
      this.cancelAnimation(SC.LayoutState.CURRENT);
      inPlace = true;
      break;
    default:
      this._setupTransition(transitionIn);
    }

    // Set up the incoming transition.
    if (transitionIn.setup) {
      transitionIn.setup(this, options, inPlace);
    }

    // Execute the incoming transition.
    transitionIn.run(this, options, this._preTransitionLayout, this._preTransitionFrame);
  },

  /** @private Attempts to run a transition out, ensuring any incoming transitions are stopped in place. */
  _transitionOut: function (inPlace, owningView) {
    var transitionOut = this.get('transitionOut'),
      options = this.get('transitionOutOptions') || {};

    if (!inPlace) {
      this._setupTransition(transitionOut);
    }

    // Increment the shared building out count.
    owningView._buildingOutCount++;

    // Set up the outgoing transition.
    if (transitionOut.setup) {
      transitionOut.setup(this, options, inPlace);
    }

    // Execute the outgoing transition.
    transitionOut.run(this, options, this._preTransitionLayout, this._preTransitionFrame);
  },

  /** @private Attempts to run a transition show, ensuring any hiding transitions are stopped in place. */
  _transitionShow: function () {
    var transitionShow = this.get('transitionShow'),
      options = this.get('transitionShowOptions') || {},
      inPlace = false;

    //@if (debug)
    if (SC.LOG_VIEW_STATES) {
      SC.Logger.log('%c%@ — _transitionShow()'.fmt(this), SC.LOG_VIEW_STATES_STYLE[this.get('viewState')]);
    }
    //@endif
    // if (state === SC.CoreView.ATTACHED_HIDING) {
    //   this.cancelAnimation(SC.LayoutState.CURRENT);
    //   inPlace = true;
    // } else {
    this._setupTransition(transitionShow);
    // }

    // Set up the showing transition.
    if (transitionShow.setup) {
      transitionShow.setup(this, options, inPlace);
    }

    // Execute the showing transition.
    transitionShow.run(this, options, this._preTransitionLayout, this._preTransitionFrame);
  },

  /** @private */
  _routeOnAttached: function () {
    var parentView = this.get('parentView'),
      // Views without a parent are not limited by a parent's current state.
      isParentShown = parentView ? parentView.get('viewState') & SC.CoreView.IS_SHOWN : true;

    // Update states after *will* and before *did* notifications!
    if (this.get('isVisible')) {
      if (isParentShown) {
        // Route.
        var transitionIn = this.get('transitionIn');
        if (transitionIn) {
          this._gotoAttachedBuildingInState();

          // this.invokeNext(function () {
            this._transitionIn();
          // });

        } else {
          this._gotoAttachedShownState();
        }
      } else {
        this._gotoAttachedHiddenByParentState();
      }
    } else {
      this._gotoAttachedHiddenState();
    }
  }

});

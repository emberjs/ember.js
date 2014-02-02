sc_require("views/view");
sc_require('views/view/layout_style');

/** Select a horizontal layout for various views.*/
SC.LAYOUT_HORIZONTAL = 'sc-layout-horizontal';

/** Select a vertical layout for various views.*/
SC.LAYOUT_VERTICAL = 'sc-layout-vertical';

/** @private */
SC._VIEW_DEFAULT_DIMS = ['marginTop', 'marginLeft'];

/**
  Layout properties to take up the full width of a parent view.
*/
SC.FULL_WIDTH = { left: 0, right: 0 };

/**
  Layout properties to take up the full height of a parent view.
*/
SC.FULL_HEIGHT = { top: 0, bottom: 0 };

/**
  Layout properties to center.  Note that you must also specify a width and
  height for this to work.
*/
SC.ANCHOR_CENTER = { centerX: 0, centerY: 0 };

/**
  Layout property for width, height
*/

SC.LAYOUT_AUTO = 'auto';


SC.View.reopen(
  /** @scope SC.View.prototype */ {

  /**
    Set to YES to indicate the view has layout support added.
  */
  hasLayout: YES,

  /**
    Optional background color.  Will be applied to the view's element if
    set.  This property is intended for one-off views that need a background
    element.  If you plan to create many view instances it is probably better
    to use CSS.

    @type String
  */
  backgroundColor: null,

  /* @private Internal variable used to check for layout changes that resize. */
  _previousLayout: null,

  /**
    Activates use of brower's static layout. To activate, set this
    property to YES.

    @type Boolean
  */
  useStaticLayout: NO,

  // ...........................................
  // LAYOUT
  //

  /** @private */
  init: function (original) {
    original();

    this._previousLayout = this.get('layout');

    // Apply the automatic child view layout if it is defined.
    var childViewLayout = this.childViewLayout;
    if (childViewLayout) {
      // Layout the child views once.
      this.set('childViewsNeedLayout', true);
      this.layoutChildViewsIfNeeded();

      // If the child view layout is live, start observing affecting properties.
      if (this.get('isChildViewLayoutLive')) {
        this.addObserver('childViews.[]', this, this._cvl_childViewsDidChange);
        // DISABLED. this.addObserver('childViewLayout', this, this._cvl_childViewLayoutDidChange);
        this.addObserver('childViewLayoutOptions', this, this._cvl_childViewLayoutDidChange);

        // Initialize the child views.
        this._cvl_setupChildViewsLiveLayout();
      }
    }

  }.enhance(),

  /** @private */
  destroy: function (original) {
    // Clean up.
    this._previousLayout = null;

    return original();
  }.enhance(),

  /**
    The 'frame' property depends on the 'layout' property as well as the
    parent view's frame.  In order to properly invalidate any cached values,
    we need to invalidate the cache whenever 'layout' changes.  However,
    observing 'layout' does not guarantee that; the observer might not be run
    immediately.

    In order to avoid any window of opportunity where the cached frame could
    be invalid, we need to force layoutDidChange() to always immediately run
    whenever 'layout' is set.
  */
  propertyDidChange: function (key, value, _keepCache) {
    // If the key is 'layout', we need to call layoutDidChange() immediately
    // so that if the frame has changed any cached values (for both this view
    // and any child views) can be appropriately invalidated.

    // To allow layout to be a computed property, we check if any property has
    // changed and if layout is dependent on the property.
    // If it is we call layoutDidChange.
    var layoutChange = false;
    if (typeof this.layout === "function" && this._kvo_dependents) {
      var dependents = this._kvo_dependents[key];
      if (dependents && dependents.indexOf('layout') != -1) { layoutChange = true; }
    }
    if (key === 'layout' || layoutChange) { this.layoutDidChange(); }
    // Resume notification as usual.
    sc_super();
  },


  /**
    This convenience method will take the current layout, apply any changes
    you pass and set it again.  It is more convenient than having to do this
    yourself sometimes.

    You can pass just a key/value pair or a hash with several pairs.  You can
    also pass a null value to delete a property.

    This method will avoid actually setting the layout if the value you pass
    does not edit the layout.

    @param {String|Hash} key
    @param {Object} value
    @returns {SC.View} receiver
  */
  adjust: function (key, value) {
    if (key === undefined) { return this; } // nothing to do.

    var layout = this.get('layout'),
        didChange = NO,
        animateLayout = this._animateLayout,
        cur, hash;

    // Normalize arguments.
    if (SC.typeOf(key) === SC.T_STRING) {
      hash = {};
      hash[key] = value;
    } else {
      hash = key;
    }

    for (key in hash) {
      if (!hash.hasOwnProperty(key)) { continue; }

      value = hash[key];
      cur = layout[key];

      // If a call to animate occurs in the same run loop, the animation layout
      // would still be applied in the next run loop, potentially overriding this
      // adjustment. So we need to fix up the animation layout.
      if (animateLayout) {
        if (value === null) {
          delete animateLayout[key];
        } else {
          animateLayout[key] = value;
        }

        if (this._pendingAnimations[key]) {
          // Adjusting a value that was previously about to be animated cancels the animation.
          delete this._pendingAnimations[key];
        }
      }

      if (value === undefined || cur == value) { continue; }

      // only clone the layout the first time we see a change
      if (!didChange) layout = SC.clone(layout);

      if (value === null) {
        delete layout[key];
      } else {
        layout[key] = value;
      }

      didChange = YES;
    }

    // now set adjusted layout
    if (didChange) {
      var transitionAdjust = this.get('transitionAdjust');

      if (this.get('viewState') & SC.CoreView.IS_SHOWN && transitionAdjust) {
        // Run the adjust transition.
        this._transitionAdjust(layout);
      } else {
        this.set('layout', layout);
      }
    }

    return this;
  },

  /** @private Attempts to run a transition adjust, ensuring any showing transitions are stopped in place. */
  _transitionAdjust: function (layout) {
    var transitionAdjust = this.get('transitionAdjust'),
      options = this.get('transitionAdjustOptions') || {};

    // Execute the adjusting transition.
    transitionAdjust.run(this, options, layout);
  },

  /** @private */
  didTransitionAdjust: function () {
  },

  /**
    The layout describes how you want your view to be positioned on the
    screen.  You can define the following properties:

     - left: the left edge
     - top: the top edge
     - right: the right edge
     - bottom: the bottom edge
     - height: the height
     - width: the width
     - centerX: an offset from center X
     - centerY: an offset from center Y
     - minWidth: a minimum width
     - minHeight: a minimum height
     - maxWidth: a maximum width
     - maxHeight: a maximum height
     - border: border on all sides
     - borderTop: top border
     - borderRight: right border
     - borderBottom: bottom border
     - borderLeft: bottom left
     - opacity: the opacity of the view
     - zIndex: position above or below other views

    Note that you can only use certain combinations to set layout.  For
    example, you may set left/right or left/width, but not left/width/right,
    since that combination doesn't make sense.

    Likewise, you may set a minWidth/minHeight, or maxWidth/maxHeight, but
    if you also set the width/height explicitly, then those constraints won't
    matter as much.

    Layout is designed to maximize reliance on the browser's rendering
    engine to keep your app up to date.

    @test in layoutStyle
  */
  layout: { top: 0, left: 0, bottom: 0, right: 0 },

  /**
    Returns whether the layout is 'fixed' or not.  A fixed layout means a
    fixed left & top position and fixed width & height.  Fixed layouts are
    therefore unaffected by changes to their parent view's layout.

    @returns {Boolean} YES if fixed, NO otherwise
    @test in layoutStyle
  */
  isFixedLayout: function () {
    return this.get('isFixedPosition') && this.get('isFixedSize');
  }.property('isFixedPosition', 'isFixedSize').cacheable(),

  /**
    Returns whether the position is 'fixed' or not.  A fixed position means a
    fixed left & top position within its parent's frame.  Fixed positions are
    therefore unaffected by changes to their parent view's size.

    @returns {Boolean} YES if fixed, NO otherwise
    @test in layoutStyle
  */
  isFixedPosition: function () {
    var layout = this.get('layout'),
      hasLeft,
      hasTop,
      ret;

    // Position is fixed if it has left + top !== SC.LAYOUT_AUTO
    hasLeft = layout.left !== undefined;
    if (!hasLeft) {
      // Check for implied left. If there is a width, then there can't be a right or centerX.
      hasLeft =  layout.width === undefined || (layout.width !== undefined && layout.right === undefined && layout.centerX === undefined);
    }

    hasTop = layout.top !== undefined;
    if (!hasTop) {
      // Check for implied top. If there is a height, then there can't be a bottom or centerY.
      hasTop = layout.height === undefined || (layout.height !== undefined && layout.bottom === undefined && layout.centerY === undefined);
    }

    ret = (hasLeft && hasTop && layout.left !== SC.LAYOUT_AUTO && layout.top !== SC.LAYOUT_AUTO);

    // The position may appear fixed, but only if none of the values are percentages.
    if (ret) {
      ret = (!SC.isPercentage(layout.top) && !SC.isPercentage(layout.left));
    }

    return ret;
  }.property('layout').cacheable(),

  /**
    Returns whether the size is 'fixed' or not.  A fixed size means a fixed
    width and height.  Fixed sizes are therefore unaffected by changes to their
    parent view's size.

    @returns {Boolean} YES if fixed, NO otherwise
    @test in layoutStyle
  */
  isFixedSize: function () {
    var layout = this.get('layout'),
        ret;

    // Size is fixed if it has width + height !== SC.LAYOUT_AUTO
    ret = (
      ((layout.width !== undefined) && (layout.height !== undefined)) &&
      ((layout.width !== SC.LAYOUT_AUTO) && (layout.height !== SC.LAYOUT_AUTO))
    );

    // The size may appear fixed, but only if none of the values are percentages.
    if (ret) {
      ret = (!SC.isPercentage(layout.width) && !SC.isPercentage(layout.height));
    }

    return ret;
  }.property('layout').cacheable(),

  /**
    Converts a frame from the receiver's offset to the target offset.  Both
    the receiver and the target must belong to the same pane.  If you pass
    null, the conversion will be to the pane level.

    Note that the context of a view's frame is the view's parent frame.  In
    other words, if you want to convert the frame of your view to the global
    frame, then you should do:

        var pv = this.get('parentView'), frame = this.get('frame');
        var newFrame = pv ? pv.convertFrameToView(frame, null) : frame;

    @param {Rect} frame the source frame
    @param {SC.View} targetView the target view to convert to
    @returns {Rect} converted frame
    @test in convertFrames
  */
  convertFrameToView: function (frame, targetView) {
    var myX = 0, myY = 0, targetX = 0, targetY = 0, view = this, f;

    // walk up this side
    while (view) {
      f = view.get('frame');
      myX += f.x;
      myY += f.y;
      view = view.get('layoutView');
    }

    // walk up other size
    if (targetView) {
      view = targetView;
      while (view) {
        f = view.get('frame');
        targetX += f.x;
        targetY += f.y;
        view = view.get('layoutView');
      }
    }

    // now we can figure how to translate the origin.
    myX = frame.x + myX - targetX;
    myY = frame.y + myY - targetY;
    return { x: myX, y: myY, width: frame.width, height: frame.height };
  },

  /**
    Converts a frame offset in the coordinates of another view system to the
    receiver's view.

    Note that the convext of a view's frame is relative to the view's
    parentFrame.  For example, if you want to convert the frame of view that
    belongs to another view to the receiver's frame you would do:

        var frame = view.get('frame');
        var newFrame = this.convertFrameFromView(frame, view.get('parentView'));

    @param {Rect} frame the source frame
    @param {SC.View} targetView the target view to convert to
    @returns {Rect} converted frame
    @test in converFrames
  */
  convertFrameFromView: function (frame, targetView) {
    var myX = 0, myY = 0, targetX = 0, targetY = 0, view = this, f;

    // walk up this side
    //Note: Intentional assignment of variable f
    while (view && (f = view.get('frame'))) {
      myX += f.x;
      myY += f.y;
      view = view.get('parentView');
    }

    // walk up other size
    if (targetView) {
      view = targetView;
      while (view) {
        f = view.get('frame');
        targetX += f.x;
        targetY += f.y;
        view = view.get('parentView');
      }
    }

    // now we can figure how to translate the origin.
    myX = frame.x - myX + targetX;
    myY = frame.y - myY + targetY;
    return { x: myX, y: myY, width: frame.width, height: frame.height };
  },

  /**
    Attempt to scroll the view to visible.  This will walk up the parent
    view hierarchy looking looking for a scrollable view.  It will then
    call scrollToVisible() on it.

    Returns YES if an actual scroll took place, no otherwise.

    @returns {Boolean}
  */
  scrollToVisible: function () {
    var pv = this.get('parentView');
    while (pv && !pv.get('isScrollable')) { pv = pv.get('parentView'); }

    // found view, first make it scroll itself visible then scroll this.
    if (pv) {
      pv.scrollToVisible();
      return pv.scrollToVisible(this);
    } else {
      return NO;
    }
  },

  /** @private */
  _effectiveBorderFor: function (layoutName, layout) {
    return ((layout[layoutName] !== undefined) ? layout[layoutName] : layout.border) || 0;
  },

  /** @private */
  _adjustForBorder: function (frame, layout) {
    var borderTop = this._effectiveBorderFor('borderTop', layout),
        borderLeft = this._effectiveBorderFor('borderLeft', layout),
        borderBottom = this._effectiveBorderFor('borderBottom', layout),
        borderRight = this._effectiveBorderFor('borderRight', layout);

    frame.x += borderLeft; // The border on the left pushes the frame to the right
    frame.y += borderTop; // The border on the top pushes the frame down
    frame.width -= (borderLeft + borderRight); // Border takes up space
    frame.height -= (borderTop + borderBottom); // Border takes up space

    return frame;
  },

  /**
    Computes what the frame of this view would be if the parent were resized
    to the passed dimensions.  You can use this method to project the size of
    a frame based on the resize behavior of the parent.

    This method is used especially by the scroll view to automatically
    calculate when scrollviews should be visible.

    Passing null for the parent dimensions will use the actual current
    parent dimensions.  This is the same method used to calculate the current
    frame when it changes.

    @param {Rect} pdim the projected parent dimensions
    @returns {Rect} the computed frame
  */
  computeFrameWithParentFrame: function (original, pdim) {
    var f, layout = this.get('layout');

    // We can't predict the frame for static layout, so just return the view's
    // current frame (see original computeFrameWithParentFrame in views/view.js)
    if (this.get('useStaticLayout')) {
      f = original();
      return f ? this._adjustForBorder(f, layout) : null;
    } else {
      f = {};
    }

    var error, layer, AUTO = SC.LAYOUT_AUTO,
        pv = this.get('parentView'),
        dH, dW, //shortHand for parentDimensions
        lR = layout.right,
        lL = layout.left,
        lT = layout.top,
        lB = layout.bottom,
        lW = layout.width,
        lH = layout.height,
        lcX = layout.centerX,
        lcY = layout.centerY;

    if (lW === AUTO) {
      error = SC.Error.desc(("%@.layout() cannot use width:auto if " +
        "staticLayout is disabled").fmt(this), "%@".fmt(this), -1);
      SC.Logger.error(error.toString());
      throw error;
    }

    if (lH === AUTO) {
      error = SC.Error.desc(("%@.layout() cannot use height:auto if " +
        "staticLayout is disabled").fmt(this), "%@".fmt(this), -1);
      SC.Logger.error(error.toString());
      throw error;
    }

    if (!pdim) { pdim = this.computeParentDimensions(layout); }
    dH = pdim.height;
    dW = pdim.width;

    // handle left aligned and left/right
    if (!SC.none(lL)) {
      if (SC.isPercentage(lL)) {
        f.x = dW * lL;
      } else {
        f.x = lL;
      }
      if (lW !== undefined) {
        if (lW === AUTO) { f.width = AUTO; }
        else if (SC.isPercentage(lW)) { f.width = dW * lW; }
        else { f.width = lW; }
      } else { // better have lR!
        f.width = dW - f.x;
        if (lR && SC.isPercentage(lR)) { f.width = f.width - (lR * dW); }
        else { f.width = f.width - (lR || 0); }
      }
    // handle right aligned
    } else if (!SC.none(lR)) {
      if (SC.none(lW)) {
        if (SC.isPercentage(lR)) {
          f.width = dW - (dW * lR);
        }
        else f.width = dW - lR;
        f.x = 0;
      } else {
        if (lW === AUTO) f.width = AUTO;
        else if (SC.isPercentage(lW)) f.width = dW * lW;
        else f.width = (lW || 0);
        if (SC.isPercentage(lW)) f.x = dW - (lR * dW) - f.width;
        else f.x = dW - lR - f.width;
      }

    // handle centered
    } else if (!SC.none(lcX)) {
      if (lW === AUTO) f.width = AUTO;
      else if (SC.isPercentage(lW)) f.width = lW * dW;
      else f.width = (lW || 0);
      if (SC.isPercentage(lcX)) f.x = (dW - f.width) / 2 + (lcX * dW);
      else f.x = (dW - f.width) / 2 + lcX;
    } else {
      f.x = 0; // fallback
      if (SC.none(lW)) {
        f.width = dW;
      } else {
        if (lW === AUTO) f.width = AUTO;
        if (SC.isPercentage(lW)) f.width = lW * dW;
        else f.width = (lW || 0);
      }
    }

    // handle top aligned and top/bottom
    if (!SC.none(lT)) {
      if (SC.isPercentage(lT)) f.y = lT * dH;
      else f.y = lT;
      if (lH !== undefined) {
        if (lH === AUTO) f.height = AUTO;
        else if (SC.isPercentage(lH)) f.height = lH * dH;
        else f.height = lH;
      } else { // better have lB!
        if (lB && SC.isPercentage(lB)) f.height = dH - f.y - (lB * dH);
        else f.height = dH - f.y - (lB || 0);
      }

    // handle bottom aligned
    } else if (!SC.none(lB)) {
      if (SC.none(lH)) {
        if (SC.isPercentage(lB)) f.height = dH - (lB * dH);
        else f.height = dH - lB;
        f.y = 0;
      } else {
        if (lH === AUTO) f.height = AUTO;
        if (lH && SC.isPercentage(lH)) f.height = lH * dH;
        else f.height = (lH || 0);
        if (SC.isPercentage(lB)) f.y = dH - (lB * dH) - f.height;
        else f.y = dH - lB - f.height;
      }

    // handle centered
    } else if (!SC.none(lcY)) {
      if (lH === AUTO) f.height = AUTO;
      if (lH && SC.isPercentage(lH)) f.height = lH * dH;
      else f.height = (lH || 0);
      if (SC.isPercentage(lcY)) f.y = (dH - f.height) / 2 + (lcY * dH);
      else f.y = (dH - f.height) / 2 + lcY;

    // fallback
    } else {
      f.y = 0; // fallback
      if (SC.none(lH)) {
        f.height = dH;
      } else {
        if (lH === AUTO) f.height = AUTO;
        if (SC.isPercentage(lH)) f.height = lH * dH;
        else f.height = lH || 0;
      }
    }

    f.x = Math.floor(f.x);
    f.y = Math.floor(f.y);
    if (f.height !== AUTO) f.height = Math.floor(f.height);
    if (f.width !== AUTO) f.width = Math.floor(f.width);

    // if width or height were set to auto and we have a layer, try lookup
    if (f.height === AUTO || f.width === AUTO) {
      layer = this.get('layer');
      if (f.height === AUTO) f.height = layer ? layer.clientHeight : 0;
      if (f.width === AUTO) f.width = layer ? layer.clientWidth : 0;
    }

    f = this._adjustForBorder(f, layout);

    // Account for special cases inside ScrollView, where we adjust the
    // element's scrollTop/scrollLeft property for performance reasons.
    if (pv && pv.isScrollContainer) {
      pv = pv.get('parentView');
      f.x -= pv.get('horizontalScrollOffset');
      f.y -= pv.get('verticalScrollOffset');
    }

    // make sure the width/height fix min/max...
    if (!SC.none(layout.maxHeight) && (f.height > layout.maxHeight)) {
      f.height = layout.maxHeight;
    }

    if (!SC.none(layout.minHeight) && (f.height < layout.minHeight)) {
      f.height = layout.minHeight;
    }

    if (!SC.none(layout.maxWidth) && (f.width > layout.maxWidth)) {
      f.width = layout.maxWidth;
    }

    if (!SC.none(layout.minWidth) && (f.width < layout.minWidth)) {
      f.width = layout.minWidth;
    }

    // make sure width/height are never < 0
    if (f.height < 0) f.height = 0;
    if (f.width < 0) f.width = 0;

    return f;
  }.enhance(),

  computeParentDimensions: function (frame) {
    var ret, pv = this.get('parentView'), pf = (pv) ? pv.get('frame') : null;

    if (pf) {
      ret = { width: pf.width, height: pf.height };
    } else {
      var f = frame || {};
      ret = {
        width: (f.left || 0) + (f.width || 0) + (f.right || 0),
        height: (f.top || 0) + (f.height || 0) + (f.bottom || 0)
      };
    }
    return ret;
  },

  /**
    The frame of the view including the borders
  */
  borderFrame: function () {
    var layout = this.get('layout'),
        frame = this.get('frame'),
        borderTop = this._effectiveBorderFor('borderTop', layout),
        borderRight = this._effectiveBorderFor('borderRight', layout),
        borderBottom = this._effectiveBorderFor('borderBottom', layout),
        borderLeft = this._effectiveBorderFor('borderLeft', layout);

    return frame ? {
      x: frame.x - borderLeft,
      y: frame.y - borderTop,
      width: frame.width + borderLeft + borderRight,
      height: frame.height + borderTop + borderBottom
    } : null;
  }.property('frame').cacheable(),

  /**
    This method may be called on your view whenever the parent view resizes.

    The default version of this method will reset the frame and then call
    viewDidResize() if its size may have changed.  You will not usually override
    this method, but you may override the viewDidResize() method.

    @returns {void}
    @test in viewDidResize
  */
  parentViewDidResize: function () {
    var positionMayHaveChanged,
      sizeMayHaveChanged;

    // If this view uses static layout, our "do we think the frame changed?"
    // result of isFixedLayout is not applicable and we simply have to assume
    // that the frame may have changed.
    sizeMayHaveChanged = this.get('useStaticLayout') || !this.get('isFixedSize');
    positionMayHaveChanged = !this.get('isFixedPosition');

    if (sizeMayHaveChanged) {
      // If our size isn't fixed, our frame may have changed and it will effect our child views.
      this.viewDidResize();
    } else if (positionMayHaveChanged) {
      // If our size is fixed but our position isn't, our frame may have changed, but it won't effect our child views.
      this._viewFrameDidChange();
    }
  },

  /**
    This method is invoked on your view when the view resizes due to a layout
    change or potentially due to the parent view resizing (if your view’s size
    depends on the size of your parent view).  You can override this method
    to implement your own layout if you like, such as performing a grid
    layout.

    The default implementation simply notifies about the change to 'frame' and
    then calls parentViewDidResize on all of your children.

    @returns {void}
  */
  viewDidResize: function () {
    this._viewFrameDidChange();

    // Also notify our children.
    var cv = this.childViews, len, idx, view;
    for (idx = 0; idx < (len = cv.length); ++idx) {
      view = cv[idx];
      view.tryToPerform('parentViewDidResize');
    }
  },

  /** @private
    Invoked by other views to notify this view that its frame has changed.

    This notifies the view that its frame property has changed,
    then propagates those changes to its child views.
  */
  _viewFrameDidChange: function () {
    this.notifyPropertyChange('frame');
    this._callOnChildViews('_sc_view_clippingFrameDidChange');
  },

  // Implementation note: As a general rule, paired method calls, such as
  // beginLiveResize/endLiveResize that are called recursively on the tree
  // should reverse the order when doing the final half of the call. This
  // ensures that the calls are propertly nested for any cleanup routines.
  //
  // -> View A.beginXXX()
  //   -> View B.beginXXX()
  //     -> View C.beginXXX()
  //   -> View D.beginXXX()
  //
  // ...later on, endXXX methods are called in reverse order of beginXXX...
  //
  //   <- View D.endXXX()
  //     <- View C.endXXX()
  //   <- View B.endXXX()
  // <- View A.endXXX()
  //
  // See the two methods below for an example implementation.

  /**
    Call this method when you plan to begin a live resize.  This will
    notify the receiver view and any of its children that are interested
    that the resize is about to begin.

    @returns {SC.View} receiver
    @test in viewDidResize
  */
  beginLiveResize: function () {
    // call before children have been notified...
    if (this.willBeginLiveResize) this.willBeginLiveResize();

    // notify children in order
    var ary = this.get('childViews'), len = ary.length, idx, view;
    for (idx = 0; idx < len; ++idx) {
      view = ary[idx];
      if (view.beginLiveResize) view.beginLiveResize();
    }
    return this;
  },

  /**
    Call this method when you are finished with a live resize.  This will
    notify the receiver view and any of its children that are interested
    that the live resize has ended.

    @returns {SC.View} receiver
    @test in viewDidResize
  */
  endLiveResize: function () {
    // notify children in *reverse* order
    var ary = this.get('childViews'), len = ary.length, idx, view;
    for (idx = len - 1; idx >= 0; --idx) { // loop backwards
      view = ary[idx];
      if (view.endLiveResize) view.endLiveResize();
    }

    // call *after* all children have been notified...
    if (this.didEndLiveResize) this.didEndLiveResize();
    return this;
  },

  /**
    The view responsible for laying out this view.  The default version
    returns the current parent view.
  */
  layoutView: function () {
    return this.get('parentView');
  }.property('parentView').cacheable(),

  /**
    This method is called whenever a property changes that invalidates the
    layout of the view.  Changing the layout will do this automatically, but
    you can add others if you want.

    Implementation Note:  In a traditional setup, we would simply observe
    'layout' here, but as described above in the documentation for our custom
    implementation of propertyDidChange(), this method must always run
    immediately after 'layout' is updated to avoid the potential for stale
    (incorrect) cached 'frame' values.

    @returns {SC.View} receiver
  */
  layoutDidChange: function () {
    var currentLayout = this.get('layout');

    // Handle old style rotation.
    if (!SC.none(currentLayout.rotate)) {
      //@if (debug)
      SC.Logger.warn('Developer Warning: Please set rotateX instead of rotate.');
      //@endif
      if (SC.none(currentLayout.rotateX)) {
        currentLayout.rotateX = currentLayout.rotate;
      }
      delete currentLayout.rotate;
    }

    // Optimize notifications depending on if we resized or just moved.
    this._checkForResize();

    // Notify layoutView/parentView, unless we are transitioning.
    var layoutView = this.get('layoutView');
    if (layoutView) {
      layoutView.set('childViewsNeedLayout', YES);
      layoutView.layoutDidChangeFor(this);

      // Check if childViewsNeedLayout is still true.
      if (layoutView.get('childViewsNeedLayout')) {
        layoutView.invokeOnce(layoutView.layoutChildViewsIfNeeded);
      }
    } else {
      this.invokeOnce(this.updateLayout);
    }

    return this;
  },

  /** @private */
  _checkForResize: function () {
    // Did our layout change in a way that could cause us to be resized?  If
    // not, then there's no need to invalidate the frames of our child views.
    var previousLayout = this._previousLayout,
        currentLayout  = this.get('layout'),
        didResize = true;

    // We test the new layout to see if we believe it will affect the view's frame.
    // Since all the child view frames may depend on the parent's frame, it's
    // best only to notify a frame change when it actually happens.
    if (previousLayout && !SC.none(previousLayout.width) && !SC.none(previousLayout.height) && previousLayout !== currentLayout) {
      var currentTest,
        previousTest;

      // This code already exists in _adjustForBorder, so we use it to test the effective width/height.
      // TODO: consider checking min/max sizes
      previousTest = this._adjustForBorder({ x: 0, y: 0, width: previousLayout.width, height: previousLayout.height },
        previousLayout);
      currentTest = this._adjustForBorder({ x: 0, y: 0, width: currentLayout.width || 0, height: currentLayout.height || 0 },
        currentLayout);

      if (previousTest.width === currentTest.width && previousTest.height === currentTest.height) {
        didResize = false;
      }
    }

    if (didResize) {
      this.viewDidResize();
    } else {
      // Even if we didn't resize, our frame may have changed
      // TODO: consider checking for position changes by testing the resulting frame against the cached frame.  This is difficult to do.
      this._viewFrameDidChange();
    }

    // Cache the last layout to fine-tune notifications when the layout changes.
    this._previousLayout = currentLayout;
  },

  /**
    This this property to YES whenever the view needs to layout its child
    views.  Normally this property is set automatically whenever the layout
    property for a child view changes.

    @type Boolean
  */
  childViewsNeedLayout: NO,

  /**
    One of two methods that are invoked whenever one of your childViews
    layout changes.  This method is invoked every time a child view's layout
    changes to give you a chance to record the information about the view.

    Since this method may be called many times during a single run loop, you
    should keep this method pretty short.  The other method called when layout
    changes, layoutChildViews(), is invoked only once at the end of
    the run loop.  You should do any expensive operations (including changing
    a childView's actual layer) in this other method.

    Note that if as a result of running this method you decide that you do not
    need your layoutChildViews() method run later, you can set the
    childViewsNeedsLayout property to NO from this method and the layout
    method will not be called layer.

    @param {SC.View} childView the view whose layout has changed.
    @returns {void}
  */
  layoutDidChangeFor: function (childView) {
    var set = this._needLayoutViews;

    // Track this view.
    if (!set) set = this._needLayoutViews = SC.CoreSet.create();
    set.add(childView);
  },

  /**
    Called your layout method if the view currently needs to layout some
    child views.

    @param {Boolean} force if true assume view is visible even if it is not.
    @returns {SC.View} receiver
    @test in layoutChildViews
  */
  layoutChildViewsIfNeeded: function (force) {
    if (this.get('childViewsNeedLayout')) {
      this.layoutChildViews(force);

      this.set('childViewsNeedLayout', NO);
    }

    return this;
  },

  /**
    Applies the current layout to the layer.  This method is usually only
    called once per runloop.  You can override this method to provide your
    own layout updating method if you want, though usually the better option
    is to override the layout method from the parent view.

    The default implementation of this method simply calls the updateLayout()
    method on the views that need layout.

    @param {Boolean} force Force the update to the layer's layout style immediately even if the view is not in a shown state.  Otherwise the style will be updated when the view returns to a shown state.
    @returns {void}
  */
  layoutChildViews: function (force) {
    var childViewLayout = this.childViewLayout,
      set, len, i;

    // Allow the child view layout plugin to layout all child views.
    if (childViewLayout) {
      // Adjust all other child views right now.
      // Note: this will add the affected child views to the set so they will be updated only once in this run loop
      childViewLayout.layoutChildViews(this);
    }

    // Retreive these values after they may have been updated by adjustments by
    // the childViewLayout plugin.
    set = this._needLayoutViews;
    if (set) {
      for (i = 0, len = set.length; i < len; ++i) {
        set[i].updateLayout(force);
      }

      set.clear(); // reset & reuse
    }
  },

  /** @private Called when the child view layout plugin or options change. */
  _cvl_childViewLayoutDidChange: function () {
    this.set('childViewsNeedLayout', true);

    // Filter the input channel.
    this.invokeOnce(this.layoutChildViewsIfNeeded);
  },

  /** @private Called when the child views change. */
  _cvl_childViewsDidChange: function () {
    this._cvl_teardownChildViewsLiveLayout();
    this._cvl_setupChildViewsLiveLayout();

    this.set('childViewsNeedLayout', true);

    // Filter the input channel.
    this.invokeOnce(this.layoutChildViewsIfNeeded);
  },

  /** @private Add observers to the child views for automatic child view layout. */
  _cvl_setupChildViewsLiveLayout: function () {
    var childViewLayout = this.childViewLayout,
      childViews,
      childLayoutProperties = childViewLayout.childLayoutProperties || [];

    // Create a reference to the current child views so that we can clean them if they change.
    childViews = this._cvl_childViews = this.get('childViews');
    for (var i = 0, len = childLayoutProperties.length; i < len; i++) {
      var observedProperty = childLayoutProperties[i];

      for (var j = 0, jlen = childViews.get('length'); j < jlen; j++) {
        var childView = childViews.objectAt(j);
        if (!childView.get('useAbsoluteLayout') && !childView.get('useStaticLayout')) {
          childView.addObserver(observedProperty, this, this._cvl_childViewLayoutDidChange);
        }
      }
    }
  },

  /** @private Remove observers from the child views for automatic child view layout. */
  _cvl_teardownChildViewsLiveLayout: function () {
    var childViewLayout = this.childViewLayout,
      childViews = this._cvl_childViews || [],
      childLayoutProperties = childViewLayout.childLayoutProperties || [];

    for (var i = 0, len = childLayoutProperties.length; i < len; i++) {
      var observedProperty = childLayoutProperties[i];

      for (var j = 0, jlen = childViews.get('length'); j < jlen; j++) {
        var childView = childViews.objectAt(j);
        if (!childView.get('useAbsoluteLayout') && !childView.get('useStaticLayout')) {
          childView.removeObserver(observedProperty, this, this._cvl_childViewLayoutDidChange);
        }
      }
    }
  },

  /**
    Invoked by the layoutChildViews method to update the layout on a
    particular view.  This method creates a render context and calls the
    renderLayout() method, which is probably what you want to override instead
    of this.

    You will not usually override this method, but you may call it if you
    implement layoutChildViews() in a view yourself.

    @param {Boolean} force Force the update to the layer's layout style immediately even if the view is not in a shown state.  Otherwise the style will be updated when the view returns to a shown state.
    @returns {SC.View} receiver
    @test in layoutChildViews
  */
  updateLayout: function (force) {
    this._doUpdateLayout(force);

    return this;
  },

  /**
    Default method called by the layout view to actually apply the current
    layout to the layer.  The default implementation simply assigns the
    current layoutStyle to the layer.  This method is also called whenever
    the layer is first created.

    @param {SC.RenderContext} the render context
    @returns {void}
    @test in layoutChildViews
  */
  renderLayout: function (context) {
    context.setStyle(this.get('layoutStyle'));
  },

  applyAttributesToContext: function (original, context) {
    original(context);

    // Have to pass 'true' for second argument for legacy.
    this.renderLayout(context, true);

    if (this.get('useStaticLayout')) { context.addClass('sc-static-layout'); }

    var backgroundColor = this.get('backgroundColor');
    if (backgroundColor) {
      context.setStyle('backgroundColor', backgroundColor);
    }
  }.enhance(),

  // ------------------------------------------------------------------------
  // Child View Layouts
  //

  /**
    The child view layout plugin to use when laying out child views.

    You can set this property to a child layout plugin object to
    automatically set and adjust the layouts of this view's child views
    according to some specific layout style.  For instance, SproutCore includes
    two such plugins, SC.View.VERTICAL_STACK and SC.View.HORIZONTAL_STACK.

    SC.View.VERTICAL_STACK will arrange child views in order in a vertical
    stack, which only requires that the height of each child view be specified.
    Likewise, SC.View.HORIZONTAL_STACK does the same in the horizontal
    direction, which requires that the width of each child view be specified.

    Where child layout plugins are extremely useful, besides simplifying
    the amount of layout code you need to write, is that they can update the
    layouts automatically as things change.  For more details and examples,
    please see the documentation for SC.View.VERTICAL_STACK and
    SC.View.HORIZONTAL_STACK.

    To define your own child view layout plugin, simply create an object that
    conforms to the SC.ChildViewLayoutProtocol protocol.

    **Note** This should only be set once and is not bindable.

    @type Object
    @default null
   */
  childViewLayout: null,

  /**
    The options for the given child view layout plugin.

    These options are specific to the current child layout plugin being used and
    are used to modify the applied layouts.  For example, SC.View.VERTICAL_STACK
    accepts options like:

        childViewLayoutOptions: {
          paddingAfter: 20,
          paddingBefore: 20,
          spacing: 10
        }

    To determine what options may be used for a given plugin and to see what the
    default options are, please refer to the documentation for the child layout
    plugin being used.

    @type Object
    @default null
  */
  childViewLayoutOptions: null,

  /**
    Whether the view and its child views should be monitored for changes that
    affect the current child view layout.

    When `true` and using a childViewLayout plugin, the view and its child views
    will be observed for any changes that would affect the layout of all the
    child views.  For example, if `isChildViewLayout` is true and using
    SC.View.VERTICAL_STACK, if any child view's height or visibility changes
    all of the child views will be re-adjusted.

    If you only want to automatically layout the child views once, you can
    set this to `false` to improve performance.

    @type Boolean
    @default true
  */
  isChildViewLayoutLive: true,

  // ------------------------------------------------------------------------
  // Statechart
  //

  /** @private Update this view's layout action. */
  _doUpdateLayout: function (force) {
    var isRendered = this.get('_isRendered'),
      isVisibleInWindow = this.get('isVisibleInWindow'),
      handled = true;

    if (isRendered) {
      if (isVisibleInWindow || force) {
        // Only in the visible states do we allow updates without being forced.
        this._doUpdateLayoutStyle();
      } else {
        // Otherwise mark the view as needing an update when we enter a shown state again.
        this._layoutStyleNeedsUpdate = true;
      }
    } else {
      handled = false;
    }

    return handled;
  },

  /** @private */
  _doUpdateLayoutStyle: function () {
    var context;

    context = this.renderContext(this.get('layer'));
    context.setStyle(this.get('layoutStyle'));
    context.update();

    // Reset that an update is required.
    this._layoutStyleNeedsUpdate = false;

    // Notify updated.
    this._updatedLayout();
  },

  /** @private Enhance. */
  _executeQueuedUpdates: function (original) {
    original();

    // Update the layout style of the layer if necessary.
    if (this._layoutStyleNeedsUpdate) {
      this._doUpdateLayoutStyle();
    }
  }.enhance(),

  /** @private Override: Notify on attached (avoids notify of frame changed). */
  _notifyDidAttach: function () {
    // If we are using static layout then we don't know the frame until appended to the document.
    if (this.get('useStaticLayout')) {
      // We call viewDidResize so that it calls parentViewDidResize on all child views.
      this.viewDidResize();
    }

    // Notify.
    if (this.didAppendToDocument) { this.didAppendToDocument(); }
  },

  /** @private Override: The 'adopted' event (uses _checkForResize so our childViews are notified if our frame changes). */
  _adopted: function (beforeView) {
    // Our frame may change once we've been adopted to a parent.
    this._checkForResize();
  },

  /** @private Extension: The 'orphaned' event. */
  _orphaned: function (oldParentView) {
    sc_super();

    // Our frame may change once we've been removed from a parent.
    if (!this.isDestroyed) { this._checkForResize(); }
  },

  /** @private Extension: The 'updatedContent' event. */
  _updatedContent: function () {
    sc_super();

    // If this view uses static layout, then notify that the frame (likely)
    // changed.
    if (this.get('useStaticLayout')) { this.viewDidResize(); }
  },

  /** @private The 'updatedLayout' event. */
  _updatedLayout: function () {
    // Notify.
    this.didRenderAnimations();
  },

  // ------------------------------------------------------------------------
  // Transitions
  //

  /**
    The transition plugin to use when this view is moved or resized by adjusting
    its layout.

    SC.CoreView uses a pluggable transition architecture where the transition
    setup, execution and cleanup can be handled by a plugin.  This allows you
    to create complex transition animations and share them across all your views
    with only a single line of code.

    There are a number of pre-built transition adjust plugins available in
    the SproutCore foundation framework:

      SC.View.SMOOTH_ADJUST
      SC.View.BOUNCE_ADJUST
      SC.View.SPRING_ADJUST

    To create a custom transition plugin simply create a regular JavaScript
    object that conforms to the SC.ViewTransitionProtocol protocol.

    NOTE: When creating custom transition adjust plugins, be aware that SC.View
    will not call the `setup` method of the plugin, only the `run` method.

    @type Object (SC.ViewTransitionProtocol)
    @default null
    @since Version 1.10
  */
  transitionAdjust: null,

  /**
    The options for the given `transitionAdjust` plugin.

    These options are specific to the current transition plugin used and are
    used to modify the transition animation.  To determine what options
    may be used for a given plugin and to see what the default options are,
    see the documentation for the transition plugin being used.

    Most transitions will accept a duration and timing option, but may
    also use other options.  For example, SC.View.BOUNCE_ADJUST accepts options
    like:

        transitionAdjustOptions: {
          bounciness: 0.5, // how much the adjustment should bounce back each time
          bounces: 4, // the number of bounces
          duration: 0.25,
          delay: 1
        }

    @type Object
    @default null
    @since Version 1.10
  */
  transitionAdjustOptions: null

});

SC.View.mixin(
  /** @scope SC.View */ {

  /**
    Convert any layout to a Top, Left, Width, Height layout
  */
  convertLayoutToAnchoredLayout: function (layout, parentFrame) {
    var ret = {top: 0, left: 0, width: parentFrame.width, height: parentFrame.height},
        pFW = parentFrame.width, pFH = parentFrame.height, //shortHand for parentDimensions
        lR = layout.right,
        lL = layout.left,
        lT = layout.top,
        lB = layout.bottom,
        lW = layout.width,
        lH = layout.height,
        lcX = layout.centerX,
        lcY = layout.centerY;

    // X Conversion
    // handle left aligned and left/right
    if (!SC.none(lL)) {
      if (SC.isPercentage(lL)) ret.left = lL * pFW;
      else ret.left = lL;
      if (lW !== undefined) {
        if (lW === SC.LAYOUT_AUTO) ret.width = SC.LAYOUT_AUTO;
        else if (SC.isPercentage(lW)) ret.width = lW * pFW;
        else ret.width = lW;
      } else {
        if (lR && SC.isPercentage(lR)) ret.width = pFW - ret.left - (lR * pFW);
        else ret.width = pFW - ret.left - (lR || 0);
      }

    // handle right aligned
    } else if (!SC.none(lR)) {

      // if no width, calculate it from the parent frame
      if (SC.none(lW)) {
        ret.left = 0;
        if (lR && SC.isPercentage(lR)) ret.width = pFW - (lR * pFW);
        else ret.width = pFW - (lR || 0);

      // If has width, calculate the left anchor from the width and right and parent frame
      } else {
        if (lW === SC.LAYOUT_AUTO) ret.width = SC.LAYOUT_AUTO;
        else {
          if (SC.isPercentage(lW)) ret.width = lW * pFW;
          else ret.width = lW;
          if (SC.isPercentage(lR)) ret.left = pFW - (ret.width + lR);
          else ret.left = pFW - (ret.width + lR);
        }
      }

    // handle centered
    } else if (!SC.none(lcX)) {
      if (lW && SC.isPercentage(lW)) ret.width = (lW * pFW);
      else ret.width = (lW || 0);
      ret.left = ((pFW - ret.width) / 2);
      if (SC.isPercentage(lcX)) ret.left = ret.left + lcX * pFW;
      else ret.left = ret.left + lcX;

    // if width defined, assume left of zero
    } else if (!SC.none(lW)) {
      ret.left =  0;
      if (lW === SC.LAYOUT_AUTO) ret.width = SC.LAYOUT_AUTO;
      else {
        if (SC.isPercentage(lW)) ret.width = lW * pFW;
        else ret.width = lW;
      }

    // fallback, full width.
    } else {
      ret.left = 0;
      ret.width = 0;
    }

    // handle min/max
    if (layout.minWidth !== undefined) ret.minWidth = layout.minWidth;
    if (layout.maxWidth !== undefined) ret.maxWidth = layout.maxWidth;

    // Y Conversion
    // handle left aligned and top/bottom
    if (!SC.none(lT)) {
      if (SC.isPercentage(lT)) ret.top = lT * pFH;
      else ret.top = lT;
      if (lH !== undefined) {
        if (lH === SC.LAYOUT_AUTO) ret.height = SC.LAYOUT_AUTO;
        else if (SC.isPercentage(lH)) ret.height = lH * pFH;
        else ret.height = lH;
      } else {
        ret.height = pFH - ret.top;
        if (lB && SC.isPercentage(lB)) ret.height = ret.height - (lB * pFH);
        else ret.height = ret.height - (lB || 0);
      }

    // handle bottom aligned
    } else if (!SC.none(lB)) {

      // if no height, calculate it from the parent frame
      if (SC.none(lH)) {
        ret.top = 0;
        if (lB && SC.isPercentage(lB)) ret.height = pFH - (lB * pFH);
        else ret.height = pFH - (lB || 0);

      // If has height, calculate the top anchor from the height and bottom and parent frame
      } else {
        if (lH === SC.LAYOUT_AUTO) ret.height = SC.LAYOUT_AUTO;
        else {
          if (SC.isPercentage(lH)) ret.height = lH * pFH;
          else ret.height = lH;
          ret.top = pFH - ret.height;
          if (SC.isPercentage(lB)) ret.top = ret.top - (lB * pFH);
          else ret.top = ret.top - lB;
        }
      }

    // handle centered
    } else if (!SC.none(lcY)) {
      if (lH && SC.isPercentage(lH)) ret.height = (lH * pFH);
      else ret.height = (lH || 0);
      ret.top = ((pFH - ret.height) / 2);
      if (SC.isPercentage(lcY)) ret.top = ret.top + lcY * pFH;
      else ret.top = ret.top + lcY;

    // if height defined, assume top of zero
    } else if (!SC.none(lH)) {
      ret.top =  0;
      if (lH === SC.LAYOUT_AUTO) ret.height = SC.LAYOUT_AUTO;
      else if (SC.isPercentage(lH)) ret.height = lH * pFH;
      else ret.height = lH;

    // fallback, full height.
    } else {
      ret.top = 0;
      ret.height = 0;
    }

    if (ret.top) ret.top = Math.floor(ret.top);
    if (ret.bottom) ret.bottom = Math.floor(ret.bottom);
    if (ret.left) ret.left = Math.floor(ret.left);
    if (ret.right) ret.right = Math.floor(ret.right);
    if (ret.width !== SC.LAYOUT_AUTO) ret.width = Math.floor(ret.width);
    if (ret.height !== SC.LAYOUT_AUTO) ret.height = Math.floor(ret.height);

    // handle min/max
    if (layout.minHeight !== undefined) ret.minHeight = layout.minHeight;
    if (layout.maxHeight !== undefined) ret.maxHeight = layout.maxHeight;

    return ret;
  },

  /**
    For now can only convert Top/Left/Width/Height to a Custom Layout
  */
  convertLayoutToCustomLayout: function (layout, layoutParams, parentFrame) {
    // TODO: [EG] Create Top/Left/Width/Height to a Custom Layout conversion
  }
});

sc_require("views/view");

SC.View.reopen(
  /** @scope SC.View.prototype */ {

  // ..........................................................
  // MULTITOUCH SUPPORT
  //
  /**
    Set to YES if you want to receive touch events for each distinct touch
    (rather than only the first touch start and last touch end).
  */
  acceptsMultitouch: NO,

  /**
    Is YES if the view is currently being touched. NO otherwise.
  */
  hasTouch: NO,

  /**
    A boundary set of distances outside which the touch will no longer be
    considered "inside" the view anymore.  This is useful when we want to allow
    a bit of touch drag outside of the view before we consider that the User's
    finger has completely left the view.  For example, a User might touch down
    on a button, but because of the wide surface of a finger, the touch might
    slip outside of the button's frame as the person lifts up.  If the button
    uses touchIsInBoundary it can make it easier for the User to hit it.

    By default, up to 25px on each side.
  */
  touchBoundary: { left: 25, right: 25, top: 25, bottom: 25 },

  /** @private
    A computed property based on frame.
  */
  _touchBoundaryFrame: function () {
    var boundary = this.get("touchBoundary"),
      ret;

    // Determine the frame of the View in screen coordinates
    ret = this.get("parentView").convertFrameToView(this.get('frame'), null);

    // Expand the frame to the acceptable boundary.
    ret.x -= boundary.left;
    ret.y -= boundary.top;
    ret.width += boundary.left + boundary.right;
    ret.height += boundary.top + boundary.bottom;

    return ret;
  }.property('touchBoundary', 'clippingFrame').cacheable(),

  /**
    Returns YES if the provided touch is within the boundary set by
    touchBoundary.
  */
  touchIsInBoundary: function(touch) {
    return SC.pointInRect({x: touch.pageX, y: touch.pageY},
      this.get("_touchBoundaryFrame"));
  }
});

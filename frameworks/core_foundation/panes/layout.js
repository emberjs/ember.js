// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("panes/pane");
SC.Pane.reopen(
  /** @scope SC.Pane.prototype */ {

  /**
    Last known window size.

    @type Rect
  */
  currentWindowSize: null,

  /**
    The parent dimensions are always the last known window size.

    @returns {Rect} current window size
  */
  computeParentDimensions: function (frame) {
    if (this.get('designer') && SC.suppressMain) { return sc_super(); }

    var wDim = {x: 0, y: 0, width: 1000, height: 1000},
        layout = this.get('layout');

    // There used to be a whole bunch of code right here to calculate
    // based first on a stored window size, then on root responder, then
    // from document... but a) it is incorrect because we don't care about
    // the window size, but instead, the clientWidth/Height of the body, and
    // b) the performance benefits are not worth complicating the code that much.
    if (document && document.body) {
      wDim.width = document.body.clientWidth;
      wDim.height = document.body.clientHeight;

      // IE7 is the only browser which reports clientHeight _including_ scrollbar.
      if (SC.browser.name === SC.BROWSER.ie &&
          SC.browser.compare(SC.browser.version, "7") === 0) {

        var scrollbarSize = SC.platform.get('scrollbarSize');
        if (document.body.scrollWidth > wDim.width) {
          wDim.width -= scrollbarSize;
        }
        if (document.body.scrollHeight > wDim.height) {
          wDim.height -= scrollbarSize;
        }
      }
    }

    // If there is a minWidth or minHeight set on the pane, take that
    // into account when calculating dimensions.

    if (layout.minHeight || layout.minWidth) {
      if (layout.minHeight) {
        wDim.height = Math.max(wDim.height, layout.minHeight);
      }
      if (layout.minWidth) {
        wDim.width = Math.max(wDim.width, layout.minWidth);
      }
    }
    return wDim;
  },

  /** @private Disable caching due to an known bug in SC. */
  frame: function () {
    if (this.get('designer') && SC.suppressMain) { return sc_super(); }
    return this.computeFrameWithParentFrame(null);
  }.property(),

  /**
    Invoked by the root responder whenever the window resizes.  This should
    simply begin the process of notifying children that the view size has
    changed, if needed.

    @param {Rect} oldSize the old window size
    @param {Rect} newSize the new window size
    @returns {SC.Pane} receiver
  */
  windowSizeDidChange: function (oldSize, newSize) {
    this.set('currentWindowSize', newSize);
    this.setBodyOverflowIfNeeded();
    this.parentViewDidResize(); // start notifications.
    return this;
  },

  /**
    Changes the body overflow according to whether minWidth or minHeight
    are present in the layout hash. If there are no minimums, nothing
    is done unless true is passed as the first argument. If so, then
    overflow:hidden; will be used.

    It's possible to call this manually and pass YES to remove overflow
    if setting layout to a hash without minWidth and minHeight, but it's
    probably not a good idea to do so unless you're doing it from the main
    pane. There's only one body tag, after all, and if this is called from
    multiple different panes, the panes could fight over whether it gets
    an overflow if care isn't taken!

    @param {Boolean} [force=false] force a style to be set even if there are no minimums.
    @returns {void}
  */
  setBodyOverflowIfNeeded: function (force) {
    //Code to get rid of Lion rubberbanding.
    var layout = this.get('layout'),
        size = this.get('currentWindowSize');

    if (!layout || !size || !size.width || !size.height) return;

    var minW = layout.minWidth,
      minH = layout.minHeight;

    if (force === true || minW || minH) {
      if ((minH && size.height < minH) || (minW && size.width < minW)) {
        SC.bodyOverflowArbitrator.requestVisible(this);
      } else {
        SC.bodyOverflowArbitrator.requestHidden(this);
      }
    }
  },

  /**
    Stops controlling the body overflow according to the needs of this pane.

    @returns {void}
  */
  unsetBodyOverflowIfNeeded: function () {
    SC.bodyOverflowArbitrator.withdrawRequest(this);
  },

  recomputeDependentProperties: function (original) {
    this.set('currentWindowSize', this.rootResponder.computeWindowSize());
    original();
  }.enhance()
});

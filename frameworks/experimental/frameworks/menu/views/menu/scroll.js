// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/menu/scroller');

/** @class

  Implements a scroll view for menus.  This class extends SC.ScrollView for
  menus.

  The main difference with SC.ScrollView is that there is only vertical
  scrolling. Value Syncing between SC.MenuScrollView and SC.MenuScrollerView
  is done using valueBinding.

  @extends SC.ScrollView
  @since SproutCore 1.6
 */
SC.MenuScrollView = SC.ScrollView.extend(
  /** @scope SC.MenuScrollView.prototype */{

  /**
    @type Array
    @default ['sc-menu-scroll-view']
    @see SC.View#classNames
   */
  classNames: ['sc-menu-scroll-view'],

  // ..........................................................
  // PROPERTIES
  //

  /**
    The maximum horizontal scroll offset allowed given the current
    contentView size and the size of the scroll view.

    @type Number
    @default 0
   */
  maximumHorizontalScrollOffset: 0,


  // ..........................................................
  // SCROLLERS
  //

  /**
    @type Boolean
    @default NO
   */
  hasHorizontalScroller: NO,

  /**
    @type Boolean
    @default NO
   */
  isHorizontalScrollerVisible: NO,

  /**
    @type Boolean
    @default NO
   */
  canScrollHorizontal: NO,

  /**
    @type Boolean
    @default NO
   */
  autohidesHorizontalScroller: NO,

  /**
    YES if the view should maintain a vertical scroller.
    This property must be set when the view is created.

    @type Boolean
    @default YES
   */
  hasVerticalScroller: YES,

  /**
    The vertical scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasVerticalScroller is NO.

    @type SC.View
    @default SC.MenuScrollerView
   */
  verticalScrollerView: SC.MenuScrollerView,
  verticalScrollerView2: SC.MenuScrollerView,

  /**
    YES if the vertical scroller should be visible.  For SC.MenuScroll the
    vertical scroller is always there we just hide the arrows to scroll.

    @type Boolean
    @default YES
   */
  isVerticalScrollerVisible: YES,

  /**
    @type Boolean
    @default YES
   */
  canScrollVertical: YES,

  /**
    If YES, the vertical scroller will autohide if the contentView is
    smaller than the visible area.  You must set `autohidesVerticalScroller`
    or `hasVerticalScroller` to YES for this property to have any effect.

    @type Boolean
    @default YES
   */
  autohidesVerticalScrollers: YES,

  /**
    If YES, the vertical scroller will autohide (and show) both scrollers if the
    contentView is smaller than the visible area.

    @type Boolean
    @default YES
   */
  autohidesVerticalScroller: YES,

  /**
    Use this property to set the 'bottom' offset of your vertical scroller,
    to make room for a thumb view or other accessory view. Default is 0.

    @type Number
    @default 0
   */
  verticalScrollerBottom: 0,

  /**
    Control Size for Menu content: change verticalLineScroll

    @type String
    @default SC.REGULAR_CONTROL_SIZE
   */
  controlSize: SC.REGULAR_CONTROL_SIZE,

  /**
    Wants scroll notifications all the time.
    @type Number
    @default 0
   */
  incrementalRenderingDelta: 0,

  // ..........................................................
  // METHODS
  //

  _scmsv_lastVerticalScrollOffset: 0,

  /** @private
    Does internal adjustments to the scroll offset to account for the
    scrollers appearing / disappearing.
   */
  _scmsv_verticalScrollOffsetDidChange: function () {
    var vOffset = this._scmsv_lastVerticalScrollOffset,
        offset = this.get('verticalScrollOffset'),
        topThickness = this.getPath('verticalScrollerView.scrollerThickness');

    if (vOffset !== offset && this.get('autohidesVerticalScrollers')) {
      // When the top scroller appears...
      if (vOffset === 0 && offset > 0) {
        offset += topThickness;

      // When the top scroller disappears...
      } else if (vOffset > 0 && offset - topThickness <= 0) {
        offset = 0;
      }

      this.set('verticalScrollOffset', offset);
      this._scmsv_lastVerticalScrollOffset = offset;
    }
  }.observes('verticalScrollOffset'),

  /** @private
    Adjusts the layout for the various internal views.  This method is called
    once when the scroll view is first configured and then anytime a scroller
    is shown or hidden.  You can call this method yourself as well to retile.

    You may also want to override this method to handle layout for any
    additional controls you have added to the view.
   */
  tile: function () {
    var vScroller, layout = { left: 0, top: 0, bottom: 0 },
        hasScroller = this.get('hasVerticalScroller'),
        isVisible = this.get('isVerticalScrollerVisible'),
        vOffset = this.get('verticalScrollOffset'),
        maxOffset = this.get('maximumVerticalScrollOffset'),
        scrollerThickness, vScrollerIsVisible,
        cView = this.get('contentView'),
        cFrame = cView.get('frame'),
        view = this.get('containerView'),
        frame = view.get('frame');

    this.set('canScrollVertical',
             (cView.get('calculatedHeight') || cFrame.height || 0) * this._scale > this.get('frame').height);

    // Fast path when the scrollers shouldn't be automatically hidden.
    if (hasScroller && !this.get('autohidesVerticalScrollers')) {
      vScroller = this.get('verticalScrollerView');
      vScrollerIsVisible = vScroller && isVisible;
      vScroller.set('isVisible', vScrollerIsVisible);
      if (vScrollerIsVisible) {
        layout.top = vScroller.get('scrollerThickness');
        vScroller.set('layout', { height: layout.top, top: 0, right: 0, left: 0 });
      }

      vScroller = this.get('verticalScrollerView2');
      vScrollerIsVisible = vScroller && isVisible;
      vScroller.set('isVisible', vScrollerIsVisible);
      if (vScrollerIsVisible) {
        layout.bottom = vScroller.get('scrollerThickness');
        vScroller.set('layout', { height: layout.bottom, bottom: 0, right: 0, left: 0 });
      }

    // Automatically hide scrollers.
    } else {

      // Top scrollbar calculations.
      vScroller = hasScroller ? this.get('verticalScrollerView') : null;
      vScrollerIsVisible = vScroller && isVisible;
      if (vScrollerIsVisible) {
        scrollerThickness = vScroller.get('scrollerThickness');
        layout.top = (vOffset === 0) ? 0 : scrollerThickness; // Scrolled; show the scrollbar.
        vScroller.set('layout', { height: layout.top, top: 0, right: 0, left: 0 });
      }
      vScroller.set('isVisible', vScrollerIsVisible && layout.top !== 0);

      // Bottom scrollbar calculations
      vScroller = hasScroller ? this.get('verticalScrollerView2') : null;
      vScrollerIsVisible = vScroller && isVisible;
      if (vScroller && isVisible) {
        scrollerThickness = vScroller.get('scrollerThickness');

        // Adjust for visible scrollers.
        var padding = 0;
        if (layout.top === 0 || view.getPath('layout.top') > 0) {
          padding = view.getPath('layout.bottom') || 0;
          padding = SC.none(padding) ? scrollerThickness : padding;
        }

        layout.bottom = cFrame && (vOffset < (cFrame.height - frame.height - padding)) ?
          scrollerThickness : 0;
        vScroller.set('layout', { height: layout.bottom, bottom: 0, right: 0, left: 0 });
      }
      vScroller.set('isVisible', vScrollerIsVisible && layout.bottom !== 0);
    }

    view.adjust(layout);
  },

  /** @private
    Called whenever a scroller visibility changes.  Calls the tile() method.
   */
  scrollerVisibilityDidChange: function () {
    this.tile();
  }.observes('isVerticalScrollerVisible', 'verticalScrollOffset'),


  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Instantiate scrollers & container views as needed.
    Replace their classes in the regular properties.
   */
  createChildViews: function () {
    var childViews = [], view, view2, controlSize = this.get('controlSize');

    // create the containerView.  We must always have a container view.
    // also, setup the contentView as the child of the containerView...
    if (SC.none(view = this.containerView)) view = SC.ContainerView;

    childViews.push(this.containerView = this.createChildView(view, {
      contentView: this.contentView,
      isScrollContainer: YES
    }));

    // and replace our own contentView...
    this.contentView = this.containerView.get('contentView');

    // create a vertical scroller
    if ((view=this.verticalScrollerView) && (view2=this.verticalScrollerView2)) {
      if (this.get('hasVerticalScroller')) {
        view = this.verticalScrollerView = this.createChildView(view, {
          layout: { top: 0, left: 0, right: 0 },
          controlSize: controlSize,
          valueBinding: '*owner.verticalScrollOffset'
        });
        childViews.push(view);
        view2 = this.verticalScrollerView2 = this.createChildView(view2, {
          scrollDown: YES,
          layout: { bottom: 0, left: 0, right: 0 },
          controlSize: controlSize,
          valueBinding: '*owner.verticalScrollOffset'
        });
        childViews.push(view2);
      } else {
        this.verticalScrollerView = null;
        this.verticalScrollerView2 = null;
      }
    }

    // set childViews array.
    this.childViews = childViews;

    this.contentViewFrameDidChange(); // setup initial display...
    this.tile(); // set up initial tiling
  },

  /** @private
    Invoked whenever the contentView's frame changes.  This will update the
    scroller maximum and optionally update the scroller visibility if the
    size of the contentView changes.  We don't care about the origin since
    that is tracked separately from the offset values.
   */
  contentViewFrameDidChange: function (force) {
    var view   = this.get('contentView'), view2,
        f      = (view) ? view.get('frame') : null,
        scale  = this._scale, height,
        dim    = this.get('frame'),
        viewportHeight, elem;

    // If no view has been set yet, or it doesn't have a frame,
    // we can avoid doing any work.
    if (!view || !f) { return; }

    height = view.get('calculatedHeight') || f.height || 0;
    height *= scale;

    // cache out scroll settings...
    if (!force && height === this._scroll_contentHeight) return;
    this._scroll_contentHeight = height;


    if (this.get('hasVerticalScroller') && (view = this.get('verticalScrollerView')) && (view2 = this.get('verticalScrollerView2'))) {
      // decide if it should be visible or not
      if (this.get('autohidesVerticalScroller')) {
        this.set('isVerticalScrollerVisible', height > dim.height);
      }
      height -= this.get('verticalScrollerBottom');
      viewportHeight = 0;
      elem = this.containerView.$()[0];
      if (elem) viewportHeight = elem.offsetHeight;
      height = height - viewportHeight;
      view.setIfChanged('maximum', height);
      view2.setIfChanged('maximum', height);

      this.tile(); // Retile to make sure scrollers become invisible / visible
    }
  },

  /** @private */
  _scroll_horizontalScrollOffsetDidChange: function () {}

});

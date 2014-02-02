// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/scroller');

/** @class
  The core scroll view component.

  This class is an input-agnostic scroll view implementation.

  Important Events:

    - contentView frame size changes (to autoshow/hide scrollbar - adjust scrollbar size)
    - horizontalScrollOffset change
    - verticalScrollOffsetChanges

  @extends SC.View
  @since SproutCore 1.6
 */
SC.CoreScrollView = SC.View.extend(
  /** @scope SC.ScrollView.prototype  */{

  /**
    @type Array
    @default ['sc-scroll-view']
    @see SC.View#classNames
   */
  classNames: ['sc-scroll-view'],

  // ..........................................................
  // PROPERTIES
  //

  /**
    Walk like a duck

    @type Boolean
    @default YES
    @readOnly
   */
  isScrollable: YES,

  /**
    The content view you want the scroll view to manage.
    This will be assigned to the `contentView` of the `clipView` also.

    @type SC.View
    @default null
   */
  contentView: null,

  /**
    The horizontal alignment for non-filling content inside of the `ScrollView`.
    Possible values are:

      - `SC.ALIGN_LEFT`
      - `SC.ALIGN_RIGHT`
      - `SC.ALIGN_CENTER`

    @type String
    @default SC.ALIGN_LEFT
   */
  horizontalAlign: SC.ALIGN_LEFT,

  /**
    The vertical alignment for non-filling content inside of the `ScrollView`.
    Possible values are:

      - `SC.ALIGN_TOP`
      - `SC.ALIGN_BOTTOM`
      - `SC.ALIGN_MIDDLE`

    @type String
    @default SC.ALIGN_TOP
   */
  verticalAlign: SC.ALIGN_TOP,

  /**
    The current horizontal scroll offset. Changing this value will update both
    the `contentView` and the horizontal scroller, if there is one.

    @field
    @type Number
    @default 0
   */
  horizontalScrollOffset: function (key, value) {
    if (typeof value !== "undefined") {
      var minOffset = this.minimumHorizontalScrollOffset(),
          maxOffset = this.get('maximumHorizontalScrollOffset');
      this._scroll_horizontalScrollOffset = Math.max(minOffset, Math.min(maxOffset, value));
    }

    return this._scroll_horizontalScrollOffset || 0;
  }.property().cacheable(),

  /**
    The current vertical scroll offset. Changing this value will update both
    the `contentView` and the vertical scroller, if there is one.

    @field
    @type Number
    @default 0
   */
  verticalScrollOffset: function (key, value) {
    if (typeof value !== "undefined") {
      var minOffset = this.get('minimumVerticalScrollOffset'),
          maxOffset = this.get('maximumVerticalScrollOffset');
      this._scroll_verticalScrollOffset = Math.max(minOffset, Math.min(maxOffset, value));
    }

    return this._scroll_verticalScrollOffset || 0;
  }.property().cacheable(),

  /** @private
    Calculates the maximum offset given content and container sizes, and the
    alignment.
   */
  maximumScrollOffset: function (contentSize, containerSize, align) {
    // If the content is larger than the container, the maximum offset is
    // the location of the `contentView` when scrolled all the way down.
    var delta = contentSize - containerSize;
    if (contentSize >= containerSize) return delta;

    return (align === SC.ALIGN_LEFT || align === SC.ALIGN_TOP) ? 0 : // top-left aligned
           (align === SC.ALIGN_MIDDLE || align === SC.ALIGN_CENTER) ?
             Math.round(delta / 2) : // center aligned
             delta;                  // right aligned
  },

  /** @private
    Calculates the minimum offset given content and container sizes, and the
    alignment.
   */
  minimumScrollOffset: function (contentSize, containerSize, align) {
    var delta = contentSize - containerSize;

    return (contentSize > containerSize || align === SC.ALIGN_LEFT || align === SC.ALIGN_TOP) ?
             0 : // top-left aligned or larger than the container.
           (align === SC.ALIGN_MIDDLE || align === SC.ALIGN_CENTER) ?
             Math.round(delta / 2) : // center aligned
             delta;                  // right aligned
  },

  /**
    The maximum horizontal scroll offset allowed given the current contentView
    size and the size of the scroll view.  If horizontal scrolling is
    disabled, this will always return 0.

    @field
    @type Number
    @default 0
   */
  maximumHorizontalScrollOffset: function () {
    var view = this.get('contentView'),
        contentWidth = view ? view.get('frame').width : 0,
        calculatedWidth = view ? view.get('calculatedWidth') : 0,
        containerWidth = this.get('containerView').get('frame').width;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedWidth) {
      contentWidth = view.calculatedWidth;
    }
    contentWidth *= this._scale;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollHorizontal')) contentWidth = Math.min(contentWidth, containerWidth);
    return this.maximumScrollOffset(contentWidth, containerWidth, this.get("horizontalAlign"));
  }.property(),

  /**
    The maximum vertical scroll offset allowed given the current contentView
    size and the size of the scroll view.  If vertical scrolling is disabled,
    this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
   */
  maximumVerticalScrollOffset: function () {
    var view = this.get('contentView'),
        contentHeight = (view && view.get('frame')) ? view.get('frame').height : 0,
        calculatedHeight = view ? view.get('calculatedHeight') : 0,
        containerHeight = this.get('containerView').get('frame').height;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedHeight) {
      contentHeight = calculatedHeight;
    }
    contentHeight *= this._scale;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollVertical')) contentHeight = Math.min(contentHeight, containerHeight);
    return this.maximumScrollOffset(contentHeight, containerHeight, this.get("verticalAlign"));
  }.property(),


  /**
    The minimum horizontal scroll offset allowed given the current contentView
    size and the size of the scroll view.  If horizontal scrolling is
    disabled, this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
   */
  minimumHorizontalScrollOffset: function () {
    var view = this.get('contentView'),
        contentWidth = view ? view.get('frame').width : 0,
        calculatedWidth = view ? view.get('calculatedWidth') : 0,
        containerWidth = this.get('containerView').get('frame').width;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedWidth) {
      contentWidth = calculatedWidth;
    }
    contentWidth *= this._scale;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollHorizontal')) contentWidth = Math.min(contentWidth, containerWidth);
    return this.minimumScrollOffset(contentWidth, containerWidth, this.get("horizontalAlign"));
  }.property(),

  /**
    The minimum vertical scroll offset allowed given the current contentView
    size and the size of the scroll view.  If vertical scrolling is disabled,
    this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
   */
  minimumVerticalScrollOffset: function () {
    var view = this.get('contentView'),
        contentHeight = (view && view.get('frame')) ? view.get('frame').height : 0,
        calculatedHeight = view ? view.get('calculatedHeight') : 0,
        containerHeight = this.get('containerView').get('frame').height;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedHeight) {
      contentHeight = view.calculatedHeight;
    }
    contentHeight *= this._scale;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollVertical')) contentHeight = Math.min(contentHeight, containerHeight);
    return this.minimumScrollOffset(contentHeight, containerHeight, this.get("verticalAlign"));
  }.property(),


  /**
    Amount to scroll one vertical line.

    Used by the default implementation of scrollDownLine() and scrollUpLine().

    @type Number
    @default 20
   */
  verticalLineScroll: 20,

  /**
    Amount to scroll one horizontal line.

    Used by the default implementation of scrollLeftLine() and
    scrollRightLine().

    @type Number
    @default 20
   */
  horizontalLineScroll: 20,

  /**
    Amount to scroll one vertical page.

    Used by the default implementation of scrollUpPage() and scrollDownPage().

    @field
    @type Number
    @default value of frame.height
    @observes frame
   */
  verticalPageScroll: function () {
    return this.get('frame').height;
  }.property('frame'),

  /**
    Amount to scroll one horizontal page.

    Used by the default implementation of scrollLeftPage() and
    scrollRightPage().

    @field
    @type Number
    @default value of frame.width
    @observes frame
   */
  horizontalPageScroll: function () {
    return this.get('frame').width;
  }.property('frame'),

  /**
    Whether or not native scrollbars are wanted.

    @type Boolean
    @default NO
   */
  wantsNativeScrollbars: NO,

  // ..........................................................
  // SCROLLERS
  //

  /**
    YES if the view should maintain a horizontal scroller.
    This property must be set when the view is created.

    @type Boolean
    @default YES
   */
  hasHorizontalScroller: YES,

  /**
    The horizontal scroller view class.

    This will be replaced with a view instance when the
    ScrollView is created unless hasHorizontalScroller is NO.

    @type SC.View
    @default null
   */
  horizontalScrollerView: null,

  /**
    YES if the horizontal scroller should be visible.  You can change this
    property value anytime to show or hide the horizontal scroller.  If you
    do not want to use a horizontal scroller at all, you should instead set
    hasHorizontalScroller to NO to avoid creating a scroller view in the
    first place.

    @type Boolean
    @default YES
   */
  isHorizontalScrollerVisible: YES,

  /**
    Returns YES if the view both has a horizontal scroller, the scroller is
    visible.

    @field
    @type Boolean
    @default YES
   */
  canScrollHorizontal: function () {
    return !!(this.get('hasHorizontalScroller') &&
              this.get('horizontalScrollerView') &&
              this.get('isHorizontalScrollerVisible'));
  }.property('isHorizontalScrollerVisible', 'horizontalScrollerView').cacheable(),

  /**
    If YES, the horizontal scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasHorizontalScroller to YES
    for this property to have any effect.

    @type Boolean
    @default YES
   */
  autohidesHorizontalScroller: YES,

  /**
    YES if the view should maintain a vertical scroller.   This property must
    be set when the view is created.

    @type Boolean
    @default YES
   */
  hasVerticalScroller: YES,

  /**
    The vertical scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasVerticalScroller is NO.

    @type SC.View
    @default null
   */
  verticalScrollerView: null,

  /**
    YES if the vertical scroller should be visible.  You can change this
    property value anytime to show or hide the vertical scroller.  If you do
    not want to use a vertical scroller at all, you should instead set
    hasVerticalScroller to NO to avoid creating a scroller view in the first
    place.

    @type Boolean
    @default YES
   */
  isVerticalScrollerVisible: YES,

  /**
    Returns YES if the view both has a horizontal scroller, the scroller is
    visible.

    @field
    @type Boolean
    @default YES
   */
  canScrollVertical: function () {
    return !!(this.get('hasVerticalScroller') &&
              this.get('verticalScrollerView') &&
              this.get('isVerticalScrollerVisible'));
  }.property('isVerticalScrollerVisible', 'verticalScrollerView').cacheable(),

  /**
    If YES, the vertical scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasVerticalScroller to YES
    for this property to have any effect.

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
    Use this to overlay the vertical scroller.

    This ensures that the container frame will not resize to accommodate the
    vertical scroller, hence overlaying the scroller on top of
    the container.

    @type Boolean
    @default NO
   */
  verticalOverlay: NO,

  /**
    Use this to overlay the horizontal scroller.

    This ensures that the container frame will not resize to accommodate the
    horizontal scroller, hence overlaying the scroller on top of
    the container

    @type Boolean
    @default NO
   */
  horizontalOverlay: NO,

  /**
    Use to control the positioning of the vertical scroller.  If you do not
    set 'verticalOverlay' to YES, then the content view will be automatically
    sized to meet the left edge of the vertical scroller, wherever it may be.
    This allows you to easily, for example, have “one pixel higher and one
    pixel lower” scroll bars that blend into their parent views.

    If you do set 'verticalOverlay' to YES, then the scroller view will
    “float on top” of the content view.

    Example: { top: -1, bottom: -1, right: 0 }

    @type Hash
    @default null
   */
  verticalScrollerLayout: null,

  /**
    Use to control the positioning of the horizontal scroller.  If you do not
    set 'horizontalOverlay' to YES, then the content view will be
    automatically sized to meet the top edge of the horizontal scroller,
    wherever it may be.

    If you do set 'horizontalOverlay' to YES, then the scroller view will
    “float on top” of the content view.

    Example: { left: 0, bottom: 0, right: 0 }

    @type Hash
    @default null
   */
  horizontalScrollerLayout: null,

  // ..........................................................
  // CUSTOM VIEWS
  //

  /**
    The container view that will contain your main content view.  You can
    replace this property with your own custom subclass if you prefer.

    @type SC.ContainerView
    @default SC.ConainerView
   */
  containerView: SC.ContainerView.extend({}),


  // ..........................................................
  // METHODS
  //

  /**
    Scrolls the receiver to the specified x,y coordinate.  This should be the
    offset into the contentView you want to appear at the top-left corner of
    the scroll view.

    This method will contain the actual scroll based on whether the view
    can scroll in the named direction and the maximum distance it can
    scroll.

    If you only want to scroll in one direction, pass null for the other
    direction.  You can also optionally pass a Hash for the first parameter
    with x and y coordinates.

    @param {Number} x the x scroll location
    @param {Number} y the y scroll location
    @returns {SC.ScrollView} receiver
   */
  scrollTo: function (x, y) {
    // normalize params
    if (typeof y === "undefined" && SC.typeOf(x) === SC.T_HASH) {
      y = x.y; x = x.x;
    }

    if (!SC.none(x)) {
      this.set('horizontalScrollOffset', x);
    }

    if (!SC.none(y)) {
      this.set('verticalScrollOffset', y);
    }

    return this;
  },

  /**
    Scrolls the receiver in the horizontal and vertical directions by the
    amount specified, if allowed.  The actual scroll amount will be
    constrained by the current scroll view settings.

    If you only want to scroll in one direction, pass null or 0 for the other
    direction.  You can also optionally pass a Hash for the first parameter
    with x and y coordinates.

    @param {Number} x change in the x direction (or hash)
    @param {Number} y change in the y direction
    @returns {SC.ScrollView} receiver
   */
  scrollBy: function (x, y) {
    // normalize params
    if (typeof y === "undefined" && SC.typeOf(x) === SC.T_HASH) {
      y = x.y;
      x = x.x;
    }

    // if null, undefined, or 0, pass null; otherwise just add current offset
    x = (x) ? this.get('horizontalScrollOffset') + x : null;
    y = (y) ? this.get('verticalScrollOffset') + y : null;
    return this.scrollTo(x, y);
  },

  /**
    Scroll the view to make the view's frame visible.  For this to make sense,
    the view should be a subview of the contentView.  Otherwise the results
    will be undefined.

    @param {SC.View} view view to scroll or null to scroll receiver visible
    @returns {Boolean} YES if scroll position was changed
   */
  scrollToVisible: function (view) {
    // if no view is passed, do default
    if (typeof view === "undefined") return sc_super();

    var contentView = this.get('contentView');
    if (!contentView) return NO; // nothing to do if no contentView.

    // get the frame for the view - should work even for views with static
    // layout, assuming it has been added to the screen.
    var vf = view.get('frame');
    if (!vf) return NO; // nothing to do

    // convert view's frame to an offset from the contentView origin.  This
    // will become the new scroll offset after some adjustment.
    vf = contentView.convertFrameFromView(vf, view.get('parentView'));

    return this.scrollToRect(vf);
  },

  /**
    Scroll to the supplied rectangle.
    @param {Rect} rect Rectangle to scroll to.
    @returns {Boolean} YES if scroll position was changed.
   */
  scrollToRect: function (rect) {
    // find current visible frame.
    var vo = SC.cloneRect(this.get('containerView').get('frame')),
        origX = this.get('horizontalScrollOffset'),
        origY = this.get('verticalScrollOffset');

    vo.x = origX;
    vo.y = origY;

    // if top edge is not visible, shift origin
    vo.y -= Math.max(0, SC.minY(vo) - SC.minY(rect));
    vo.x -= Math.max(0, SC.minX(vo) - SC.minX(rect));

    // if bottom edge is not visible, shift origin
    vo.y += Math.max(0, SC.maxY(rect) - SC.maxY(vo));
    vo.x += Math.max(0, SC.maxX(rect) - SC.maxX(vo));

    // scroll to that origin.
    if ((origX !== vo.x) || (origY !== vo.y)) {
      this.scrollTo(vo.x, vo.y);
      return YES;
    } else return NO;
  },


  /**
    Scrolls the receiver down one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollDownLine: function (lines) {
    if (typeof lines === "undefined") lines = 1;
    return this.scrollBy(null, this.get('verticalLineScroll') * lines);
  },

  /**
    Scrolls the receiver up one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollUpLine: function (lines) {
    if (typeof lines === "undefined") lines = 1;
    return this.scrollBy(null, -1 * this.get('verticalLineScroll') * lines);
  },

  /**
    Scrolls the receiver right one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollRightLine: function (lines) {
    if (typeof lines === "undefined") lines = 1;
    return this.scrollTo(this.get('horizontalLineScroll') * lines, null);
  },

  /**
    Scrolls the receiver left one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollLeftLine: function (lines) {
    if (typeof lines === "undefined") lines = 1;
    return this.scrollTo(-1 * this.get('horizontalLineScroll') * lines, null);
  },

  /**
    Scrolls the receiver down one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollDownPage: function (pages) {
    if (typeof pages === "undefined") pages = 1;
    return this.scrollBy(null, this.get('verticalPageScroll') * pages);
  },

  /**
    Scrolls the receiver up one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollUpPage: function (pages) {
    if (typeof pages === "undefined") pages = 1;
    return this.scrollBy(null, -1 * this.get('verticalPageScroll') * pages);
  },

  /**
    Scrolls the receiver right one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollRightPage: function (pages) {
    if (typeof pages === "undefined") pages = 1;
    return this.scrollBy(this.get('horizontalPageScroll') * pages, null);
  },

  /**
    Scrolls the receiver left one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
   */
  scrollLeftPage: function (pages) {
    if (typeof pages === "undefined") pages = 1;
    return this.scrollBy(-1 * this.get('horizontalPageScroll') * pages, null);
  },

  /** @private
    Adjusts the layout for the various internal views.  This method is called
    once when the scroll view is first configured and then anytime a scroller
    is shown or hidden.  You can call this method yourself as well to retile.

    You may also want to override this method to handle layout for any
    additional controls you have added to the view.
   */
  tile: function () {
    if (this.get('wantsNativeScrollbars')) return; // Let the browser retile

    var hasHorizontal = this.get('canScrollHorizontal'),
        hasVertical = this.get('canScrollVertical'),
        hScroll = this.get('hasHorizontalScroller') ? this.get('horizontalScrollerView') : null,
        vScroll = this.get('hasVerticalScroller') ? this.get('verticalScrollerView') : null,
        clipView = this.get('containerView'),
        clipLayout = { left: 0, top: 0 }, layout;

    var ht = hasHorizontal ? hScroll.get('scrollbarThickness') : 0;
    var vt = hasVertical ? vScroll.get('scrollbarThickness') : 0;

    if (hasHorizontal) {
      layout = this.get('horizontalScrollerLayout');
      layout = {
        left:   layout ? layout.left : 0,
        bottom: layout ? layout.bottom : 0,
        right:  layout ? layout.right + vt-1 : vt-1,
        height: ht
      };
      hScroll.set('layout', layout);
      clipLayout.bottom = layout.bottom + (hScroll.get('isTranslucent') ? 0 : layout.height);
    }

    if ((hasHorizontal && this.get('horizontalOverlay')) || !hasHorizontal) {
      clipLayout.bottom = 0;
    }

    if (hScroll) hScroll.set('isVisible', hasHorizontal);

    if (hasVertical) {
      ht     = ht + this.get('verticalScrollerBottom');
      layout = this.get('verticalScrollerLayout');
      layout = {
        top:    layout ? layout.top : 0,
        bottom: layout ? layout.bottom + ht : ht,
        right:  layout ? layout.right : 0,
        width:  vt
      };
      vScroll.set('layout', layout);
      clipLayout.right = layout.right + (vScroll.get('isTranslucent') ? 0 : layout.width);
    }

    if ((hasVertical && this.get('verticalOverlay')) || !hasVertical) {
      clipLayout.right = 0;
    }

    if (vScroll) vScroll.set('isVisible', hasVertical);

    clipView.adjust(clipLayout);
  },

  /** @private
    Called whenever a scroller visibility changes.
    Calls the tile() method.
   */
  scrollerVisibilityDidChange: function () {
    this.tile();
  }.observes('isVerticalScrollerVisible', 'isHorizontalScrollerVisible'),

  // ..............................................
  // SCALING SUPPORT
  //

  /**
    Determines whether scaling is allowed.

    @type Boolean
    @default NO
   */
  canScale: NO,

  /** @private
    The current scale.
   */
  _scale: 1.0,

  /**
    @field
    @type Number
    @default 1.0
   */
  scale: function (key, value) {
    if (typeof value !== "undefined") {
      this._scale = Math.min(Math.max(this.get("minimumScale"), value), this.get("maximumScale"));
    }
    return this._scale;
  }.property().cacheable(),

  /**
    The minimum scale.

    @type Number
    @default 0.25
   */
  minimumScale: 0.25,

  /**
    The maximum scale.

    @type Number
    @default 2.0
   */
  maximumScale: 2.0,

  /**
    Whether to automatically determine the scale range based on the size of the content.

    @type Boolean
    @default NO
   */
  autoScaleRange: NO,

  /** @private */
  _scale_css: "",

  /** @private */
  updateScale: function (scale) {
    var contentView = this.get("contentView");
    if (!contentView) return;

    if (contentView.isScalable) {
      this.get("contentView").applyScale(scale);
      this._scale_css = "";
    } else {
      this._scale_css = "scale3d(" + scale + ", " + scale + ", 1)";
    }
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Instantiate scrollers & container views as needed.  Replace their classes
    in the regular properties.
   */
  createChildViews: function () {
    var childViews = [], view;

    // create the containerView.  We must always have a container view.
    // also, setup the contentView as the child of the containerView...
    if (SC.none(view = this.containerView)) view = SC.ContainerView;

    childViews.push(this.containerView = this.createChildView(view, {
      contentView: this.contentView,
      isScrollContainer: YES
    }));

    // and replace our own contentView...
    this.contentView = this.containerView.get('contentView');

    if (!this.get('wantsNativeScrollbars')) {
      // create a horizontal scroller view if needed...
      view = this.get("horizontalScrollerView");
      if (view) {
        if (this.get('hasHorizontalScroller')) {
          view = this.createChildView(view, {
            layoutDirection: SC.LAYOUT_HORIZONTAL,
            valueBinding: '*owner.horizontalScrollOffset'
          });
          this.set('horizontalScrollerView', view);
          childViews.push(view);
        } else this.horizontalScrollerView = null;
      }

      // create a vertical scroller view if needed...
      view = this.get("verticalScrollerView");
      if (view) {
        if (this.get('hasVerticalScroller')) {
          view = this.createChildView(view, {
            layoutDirection: SC.LAYOUT_VERTICAL,
            valueBinding: '*owner.verticalScrollOffset'
          });
          this.set('verticalScrollerView', view);
          childViews.push(view);
        } else this.verticalScrollerView = null;
      }
    }

    // set childViews array.
    this.childViews = childViews;

    this.contentViewDidChange(); // setup initial display...
    this.tile(); // set up initial tiling
  },

  /** @private */
  init: function () {
    sc_super();

    // start observing initial content view.  The content view's frame has
    // already been setup in prepareDisplay so we don't need to call
    // viewFrameDidChange...
    this._scroll_contentView = this.get('contentView');
    var contentView = this._scroll_contentView;

    if (contentView) {
      contentView.addObserver('frame', this, this.contentViewFrameDidChange);
      contentView.addObserver('calculatedWidth', this, this.contentViewFrameDidChange);
      contentView.addObserver('calculatedHeight', this, this.contentViewFrameDidChange);
    }

    if (this.get('isVisibleInWindow')) this._scsv_registerAutoscroll();
  },

  /** @private
    Registers/deregisters view with SC.Drag for autoscrolling
   */
  _scsv_registerAutoscroll: function () {
    this.get('isVisibleInWindow') ? SC.Drag.addScrollableView(this) :
                                    SC.Drag.removeScrollableView(this);
  }.observes('isVisibleInWindow'),

  /** @private
    Whenever the contentView is changed, we need to observe the content view's
    frame to be notified whenever it's size changes.
   */
  contentViewDidChange: function () {
    var newView = this.get('contentView'),
        oldView = this._scroll_contentView,
        frameObserver = this.contentViewFrameDidChange,
        layerObserver = this.contentViewLayerDidChange;

    if (newView !== oldView) {

      // stop observing old content view
      if (oldView) {
        oldView.removeObserver('calculatedWidth', this, this.contentViewFrameDidChange);
        oldView.removeObserver('calculatedHeight', this, this.contentViewFrameDidChange);
        oldView.removeObserver('frame', this, frameObserver);
        oldView.removeObserver('layer', this, layerObserver);
      }

      // update cache
      this._scroll_contentView = newView;
      if (newView) {
        newView.addObserver('frame', this, frameObserver);
        newView.addObserver('calculatedWidth', this, this.contentViewFrameDidChange);
        newView.addObserver('calculatedHeight', this, this.contentViewFrameDidChange);
        newView.addObserver('layer', this, layerObserver);
      }

      // replace container
      this.containerView.set('contentView', newView);

      this.contentViewFrameDidChange();
    }
  }.observes('contentView'),

  /** @private */
  oldMaxHOffset: 0,

  /** @private */
  oldMaxVOffset: 0,

  /** @private
    Invoked whenever the contentView's frame changes.  This will update the
    scroller maximum and optionally update the scroller visibility if the
    size of the contentView changes.  We don't care about the origin since
    that is tracked separately from the offset values.

    @param {Boolean} [force] Re-calculate everything even if the contentView’s frame didn’t change size
   */
  contentViewFrameDidChange: function (force) {
    var view   = this.get('contentView'),
        f      = (view) ? view.get('frame') : null,
        scale  = this._scale,
        width  = 0,
        height = 0,
        dim, dimWidth, dimHeight, calculatedWidth, calculatedHeight;

    // If no view has been set yet, or it doesn't have a frame,
    // we can avoid doing any work.
    if (!view || !f) { return; }

    width = view.get('calculatedWidth') || f.width || 0;
    height = view.get('calculatedHeight') || f.height || 0;

    width *= scale;
    height *= scale;

    // cache out scroll settings...
    if (!force && (width === this._scroll_contentWidth) && (height === this._scroll_contentHeight)) return;
    this._scroll_contentWidth  = width;
    this._scroll_contentHeight = height;

    dim       = this.getPath('containerView.frame');
    dimWidth  = dim.width;
    dimHeight = dim.height;

    if (this.get('hasHorizontalScroller') && (view = this.get('horizontalScrollerView'))) {
      // decide if it should be visible or not
      if (this.get('autohidesHorizontalScroller')) {
        this.set('isHorizontalScrollerVisible', width > dimWidth);
      }
      if (!this.get('wantsNativeScrollbars')) {
        view.setIfChanged('maximum', width-dimWidth);
        view.setIfChanged('proportion', dimWidth/width);
      }
    }

    if (this.get('hasVerticalScroller') && (view = this.get('verticalScrollerView'))) {
      // decide if it should be visible or not
      if (this.get('autohidesVerticalScroller')) {
        this.set('isVerticalScrollerVisible', height > dimHeight);
      }
      if (!this.get('wantsNativeScrollbars')) {
        view.setIfChanged('maximum', height - dimHeight);
        view.setIfChanged('proportion', dimHeight / height);
      }
    }

    // If there is no vertical scroller and auto hiding is on, make
    // sure we are at the top if not already there
    if (!this.get('isVerticalScrollerVisible') && (this.get('verticalScrollOffset') !== 0) &&
        this.get('autohidesVerticalScroller')) {
      this.set('verticalScrollOffset', 0);
    }

    // Same thing for horizontal scrolling.
    if (!this.get('isHorizontalScrollerVisible') && (this.get('horizontalScrollOffset') !== 0) &&
       this.get('autohidesHorizontalScroller')) {
      this.set('horizontalScrollOffset', 0);
    }

    // This forces to recalculate the height of the frame when is at the bottom
    // of the scroll and the content dimension are smaller that the previous one
    var mxVOffSet   = this.get('maximumVerticalScrollOffset'),
        vOffSet     = this.get('verticalScrollOffset'),
        mxHOffSet   = this.get('maximumHorizontalScrollOffset'),
        hOffSet     = this.get('horizontalScrollOffset'),
        forceHeight = mxVOffSet < vOffSet,
        forceWidth  = mxHOffSet < hOffSet;

    if (forceHeight || forceWidth) {
      this.forceDimensionsRecalculation(forceWidth, forceHeight, vOffSet, hOffSet);
    }
  },

  /** @private
    If our frame changes, then we need to re-calculate the visibility of our
    scrollers, etc.
   */
  frameDidChange: function () {
    this.contentViewFrameDidChange(YES);
  }.observes('frame'),

  /** @private
    If the layer of the content view changes, we need to readjust the
    scrollTop and scrollLeft properties on the new DOM element.
   */
  contentViewLayerDidChange: function () {
    // Invalidate these cached values, as they're no longer valid
    if (this._verticalScrollOffset !== 0) this._verticalScrollOffset = -1;
    if (this._horizontalScrollOffset !== 0) this._horizontalScrollOffset = -1;
    this.invokeLast(this.adjustElementScroll);
  },

  willScroll: function () {
    var content = this.get('contentView');
    content && content.willScroll && content.willScroll(this);
  },

  didScroll: function () {
    var content = this.get('contentView');
    content && content.didScroll && content.didScroll(this);
  },

  /** @private
    Whenever the horizontal scroll offset changes, update the scrollers and
    edit the location of the contentView.
   */
  _scsv_offsetDidChange: function () {
    this.invokeLast(this.adjustElementScroll);
  }.observes('horizontalScrollOffset', 'verticalScrollOffset'),

  /** @private
    Called at the end of the run loop to actually adjust the scrollTop
    and scrollLeft properties of the container view.
   */
  adjustElementScroll: function () {
    var content = this.get('contentView');

    // We notify the content view that its frame property has changed
    // before we actually update the scrollTop/scrollLeft properties.
    // This gives views that use incremental rendering a chance to render
    // newly-appearing elements before they come into view.
    if (content && content._viewFrameDidChange) {
      content._viewFrameDidChange();
    }
  },

  /** @private */
  forceDimensionsRecalculation: function (forceWidth, forceHeight, vOffSet, hOffSet) {
    var oldScrollHOffset = hOffSet;
    var oldScrollVOffset = vOffSet;
    this.scrollTo(0, 0);
    if (forceWidth && forceHeight) {
      this.scrollTo(this.get('maximumHorizontalScrollOffset'),
                    this.get('maximumVerticalScrollOffset'));
    }
    if (forceWidth && !forceHeight) {
      this.scrollTo(this.get('maximumHorizontalScrollOffset'), oldScrollVOffset);
    }
    if (!forceWidth && forceHeight) {
      this.scrollTo(oldScrollHOffset, this.get('maximumVerticalScrollOffset'));
    }
  },

  /** @private */
  _scroll_verticalScrollOffset: 0,

  /** @private */
  _scroll_horizontalScrollOffset: 0

});

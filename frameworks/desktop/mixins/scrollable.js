// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @namespace
  @deprecated Use SC.ScrollView instead.

  Any views you implement that are scrollable should include this mixin to
  provide basic support for scrolling actions.  You can also override any
  of these methods as needed for your own specific behaviors.

  Often times instead of adding `SC.Scrollable` to your view, you should
  place your view inside of an `SC.ScrollView`.  See that class for more
  info.

  Note that isScrollable must always be true.
*/
SC.Scrollable = {

//@if(debug)
  initMixin: function() {
    SC.Logger.warn("SC.Scrollable is deprecated and will be removed in a future version of SproutCore.  Consider pulling the mixin into your own app if you want to keep using it.");
  },
//@endif

  /** Informs the view system that the receiver is scrollable.

    Must always be `true.

    @type Boolean
    @default YES
    @constant
  */
  isScrollable: true,

  /**
    Amount to scroll one vertical line.

    Used by the default implementation of `scrollDownLine()` and `scrollUpLine()`.

    @type Number
    @default 20
  */
  verticalLineScroll: 20,

  /**
    Amount to scroll one horizontal line.

    Used by the default implementation of `scrollLeftLine()` and `scrollRightLine()`.

    @type Number
    @default 20
  */
  horizontalLineScroll: 20,

  /**
    Amount to scroll one vertical page.

    Used by the default implementation of `scrollUpPage()` and `scrollDownPage()`. Defaults to
    current `innerFrame` height.
  */
  verticalPageScroll: function() {
    return this.get('innerFrame').height;
  }.property('innerFrame'),

  /**
    Amount to scroll one horizontal page.

    Used by the default implementation of `scrollLeftPage()` and `scrollRightPage()`.  Defaults
    to current `innerFrame` width.
  */
  horizontalPageScroll: function() {
    return this.get('innerFrame').width ;
  }.property('innerFrame'),

  /**
    Returns true if the receiver has enough vertical content to require
    scrolling.

    If you do not want to allow vertical scrolling, override this to be false
    and set the appropriate CSS.

    @field {Boolean}
  */
  hasVerticalScroller: function() {
    return this.get('scrollFrame').height > this.get('innerFrame').height;
  }.property('scrollFrame'),

  /**
    Returns true if the receiver has enough horizontal content to require
    scrolling.

    If you do not want to allow horizontal scrolling, override this to be
    false and set the appropriate CSS.

    @field {Boolean}
  */
  hasHorizontalScroller: function() {
    return this.get('scrollFrame').width > this.get('innerFrame').width;
  }.property('scrollFrame'),

  /**
    Scrolls the receiver in the horizontal and vertical directions by the
    amount specified, if allowed.

    @param {Point} amount the amount to scroll.  Must include x, y or both
    @returns {Point} the actual amount scrolled.
  */
  scrollBy: function(amount) {
    var sf = this.get('scrollFrame') ;
    var f = this.get('innerFrame') ;

    if (!this.get('hasVerticalScroller')) amount.y = 0 ;
    if (sf.height <= f.height) amount.y = 0 ;

    if (!this.get('hasHorizontalScroller')) amount.x = 0 ;
    if (sf.width <= f.width) amount.x = 0 ;

    // compute new sf
    var newSf = { x: sf.x - (amount.x || 0), y: sf.y - (amount.y || 0) } ;
    this.set('scrollFrame', newSf) ;
    newSf = this.get('scrollFrame') ;

    return { x: newSf.x - sf.x, y: newSf.y - sf.y };
  },

  /**
    Scrolls the receiver to the specified x,y coordinate

    @param {Number} x
    @param {Number} y
  */
  scrollTo: function(x,y) {
    this.set('scrollFrame', { x: 0-x, y: 0-y });
  },

  /**
    Scroll the view to make the passed frame visible.

    Frame must be relative to the receiver's `offsetParent`.

    @param {SC.View} view the view you want to make visible
  */
  scrollToVisible: function(view) {
    // get frames and convert them to proper offsets
    var f = this.get('innerFrame') ;
    var sf = this.get('scrollFrame') ;

    // frame of the view, relative to the top of the scroll frame
    var vf = this.convertFrameFromView(view.get('frame'), view) ;
    vf.x -= (f.x + sf.x); vf.y -= (f.y + sf.y);

    // first visible origin
    var vo = {
      x: 0-sf.x,
      y: 0-sf.y,
      width: f.width,
      height: f.height
    };

    // if top edge is not visible, shift origin
    vo.y -= Math.max(0, SC.minY(vo) - SC.minY(vf)) ;
    vo.x -= Math.max(0, SC.minX(vo) - SC.minX(vf)) ;

    // if bottom edge is not visible, shift origin
    vo.y += Math.max(0, SC.maxY(vf) - SC.maxY(vo)) ;
    vo.x += Math.max(0, SC.maxX(vf) - SC.maxX(vo)) ;

    // scroll to that origin.
    this.scrollTo(vo.x, vo.y) ;
  },

  /**
    Scrolls the receiver down one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollDownLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return this.scrollBy({ y: this.get('verticalLineScroll')*lines }).y ;
  },

  /**
    Scrolls the receiver down up line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollUpLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return 0-this.scrollBy({ y: 0-this.get('verticalLineScroll')*lines }).y ;
  },

  /**
    Scrolls the receiver right one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollRightLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return this.scrollTo({ y: this.get('horizontalLineScroll')*lines }).x ;
  },

  /**
    Scrolls the receiver left one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollLeftLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return 0-this.scrollTo({ y: 0-this.get('horizontalLineScroll')*lines }).x ;
  },

  /**
    Scrolls the receiver down one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollDownPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return this.scrollBy({ y: this.get('verticalPageScroll')*pages }).y ;
  },

  /**
    Scrolls the receiver down up page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollUpPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return 0-this.scrollBy({ y: 0-this.get('verticalPageScroll')*pages }).y ;
  },

  /**
    Scrolls the receiver right one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollRightPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return this.scrollTo({ y: this.get('horizontalPageScroll')*pages }).x ;
  },

  /**
    Scrolls the receiver left one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollLeftPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return 0-this.scrollTo({ y: 0-this.get('horizontalPageScroll')*pages }).x ;
  }

} ;


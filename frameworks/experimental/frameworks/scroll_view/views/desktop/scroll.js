// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/core_scroll');
sc_require('views/desktop/scroller');

/** @class
  Implements a desktop scroll view using mouse events.

  This class uses native scroll events, inverting the control
  of `horizontalScrollOffset` and `verticalScrollOffset` to
  properly proxy the scroll offset values to and from SC.

  When you set these, SC gets notified _after_ the scroll
  offset gets set in the DOM.

  Important Events:

    - contentView frame size changes (to autoshow/hide scrollbar- adjust scrollbar size)
    - horizontalScrollOffset change
    - verticalScrollOffsetChanges

  @extends SC.View
  @since SproutCore 1.6
*/
SC.DesktopScrollView = SC.CoreScrollView.extend(
  /** @scope SC.DesktopScrollView.prototype */{

  /** @private
    Adjust scrollers immediately.
   */
  init: function () {
    SC.platform.propertyDidChange('scrollbarSize'); // invalidate the cache.
    this.set('nativeScrollbarThickness', SC.platform.get('scrollbarSize'));
    return sc_super();
  },

  /**
    @type SC.CoreScrollerView
    @default SC.DesktopScrollerView
   */
  horizontalScrollerView: SC.DesktopScrollerView,

  /**
    @type SC.CoreScrollerView
    @default SC.DesktopScrollerView
   */
  verticalScrollerView: SC.DesktopScrollerView,

  /**
    Dynamically compute the renderDelegate name off of
    the property `wantsNativeScrollbars`, which will flip
    the render delegate between custom scrollbars and
    native ones.
    @field
    @type String
    @default scrollRenderDelegate
   */
  renderDelegateName: function () {
    return this.get('wantsNativeScrollbars') ? 'nativeScrollRenderDelegate' : 'scrollRenderDelegate';
  }.property('wantsNativeScrollbars').cacheable(),

  /**
    @type Array
    @default ['canScrollVertical', 'canScrollHorizontal', 'nativeScrollbarThickness']
   */
  displayProperties: ['canScrollVertical', 'canScrollHorizontal', 'nativeScrollbarThickness'],

  /**
    The current horizontal scroll offset.
    Changing this value will update both the `contentView`
    and the horizontal scroller, if there is one.

    @field
    @type Number
    @default 0
   */
  horizontalScrollOffset: function (key, value) {
    if (arguments.length === 2) {
      var minOffset = this.minimumHorizontalScrollOffset(),
          maxOffset = this.get('maximumHorizontalScrollOffset'),
          layer = this.getPath('containerView.layer'),
          offset = Math.max(minOffset, Math.min(maxOffset, value));

      this._scroll_horizontalScrollOffset = offset;
      if (layer && layer.scrollLeft !== offset) {
        layer.scrollLeft = offset;
      }
    }

    return this._scroll_horizontalScrollOffset || 0;
  }.property().cacheable(),

  /**
    The current vertical scroll offset.
    Changing this value will update both the `contentView`
    and the vertical scroller, if there is one.

    @field
    @type Number
    @default 0
   */
  verticalScrollOffset: function (key, value) {
    if (arguments.length === 2) {
      var minOffset = this.get('minimumVerticalScrollOffset'),
          maxOffset = this.get('maximumVerticalScrollOffset'),
          layer = this.getPath('containerView.layer'),
          offset = Math.max(minOffset, Math.min(maxOffset, value));

      this._scroll_verticalScrollOffset = offset;
      if (layer && layer.scrollTop !== offset) {
        layer.scrollTop = offset;
      }
    }

    return this._scroll_verticalScrollOffset || 0;
  }.property().cacheable(),

   /**
    The minimum interval between scroll event before
    it signals that scrolling is "done".

    @type Number
    @default 100
    */
  debounceInterval: 100,

  // ..........................................................
  // SCROLL WHEEL SUPPORT
  //

  containerView: SC.ContainerView.extend({

    classNames: ['sc-scroll-container-view'],

    wheelEvent: function () {
      // Firefox emits different mousewheel events than other browsers
      return SC.browser.isMozilla ? 'DOMMouseScroll' : 'mousewheel';
    }.property().cacheable(),

    /** @private
      Remove the "scroll" event handler for the layer.
     */
    willDestroyLayer: function () {
      SC.Event.remove(this.get('layer'), 'scroll', this, this.scroll);
      SC.Event.remove(this.get('layer'), this.get('wheelEvent'), this, this._scdsv_scrollDebounce);
    },

    /** @private
      Attach the "scroll" event handler for the layer.
     */
    didCreateLayer: function () {
      SC.Event.add(this.get('layer'), 'scroll', this, this.scroll);
      SC.Event.add(this.get('layer'), this.get('wheelEvent'), this, this._scdsv_scrollDebounce);
      this.get('parentView').displayDidChange();
    },

    _scdsv_scrollDebounce: function (evt) {
      var self = this;

      if (this._debounce != null) {
        this._debounce.invalidate();
        this._debounce = null;
      } else {
        var layer = this.get('layer'),
            scrollTop = layer.scrollTop,
            scrollLeft = layer.scrollLeft;
        this.get('parentView').willScroll(this.get('parentView'));
      }

      this._debounce = this.invokeLater(function() {
        self._scdsv_scrollDidFinish();
      }, this.getPath('parentView.debounceInterval'));
    },

    _scdsv_scrollDidFinish: function () {
      var layer = this.get('layer'),
          scrollTop = layer.scrollTop,
          scrollLeft = layer.scrollLeft;
      this.get('parentView').didScroll(this.get('parentView'));
      this._debounce = null;
    },

    /** @private
      Notify the container that the scroll offsets have changed.
     */
    scroll: function (evt) {
      var layer = this.get('layer'),
          scrollTop = layer.scrollTop,
          scrollLeft = layer.scrollLeft,
          parentView = this.get('parentView');

      // I'm using `verticalScrollOffset` and `horizontalScrollOffset`
      // as proxies for the the actual scroll offsets.

      // Since we know what the offsets are (we got the event), this
      // needs to set the cached value, and let properties know that
      // the offset changed.
      if (parentView._scroll_verticalScrollOffset !== scrollTop) {
        parentView.propertyWillChange('verticalScrollOffset');
        parentView._scroll_verticalScrollOffset = scrollTop;
        parentView.propertyDidChange('verticalScrollOffset');
      }

      if (parentView._scroll_horizontalScrollOffset !== scrollLeft) {
        parentView.propertyWillChange('horizontalScrollOffset');
        parentView._scroll_horizontalScrollOffset = scrollLeft;
        parentView.propertyDidChange('horizontalScrollOffset');
      }

      return parentView.get('canScrollHorizontal') || parentView.get('canScrollVertical');
    }
  }),

  /**
    The native scrollbar thickness.
    @type Number
    @default 15
   */
  nativeScrollbarThickness: 15,

  /** @private
    Check to see if the native scrollbarSize changed due to scaling on the part
    of the browser.
   */
  viewDidResize: function () {
    SC.platform.propertyDidChange('scrollbarSize'); // invalidate the cache.
    this.set('nativeScrollbarThickness', SC.platform.get('scrollbarSize'));
    return sc_super();
  }

});

// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Implements a complete scroller view for menus.
  This class implements the arrows displayed in a menu to scroll.

  The main difference with `SC.ScrollerView` is that there is only vertical
  scrollers. Value Syncing between `SC.MenuScrollView` and `SC.MenuScrollerView`
  is done using valueBinding.

  @extends SC.CoreScrollerView
  @since SproutCore 1.6
 */
SC.MenuScrollerView = SC.CoreScrollerView.extend(
  /** @scope SC.MenuScrollerView.prototype */{

  /**
    @type Array
    @default ['sc-menu-scroller-view']
    @see SC.View#classNames
  */
  classNames: ['sc-menu-scroller-view'],

  /**
    @type Array
    @default ['scrollDown']
    @see SC.View#displayProperties
   */
  displayProperties: ['scrollDown'],

  /**
    @type String
    @default 'menuScrollerRenderDelegate'
   */
  renderDelegateName: 'menuScrollerRenderDelegate',

  // ..........................................................
  // PROPERTIES
  //

  /**
    Used to set the scrolling direction of the scroller.

    @type Boolean
    @default NO
   */
  scrollDown: NO,

  /**
    The maximum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself. It is not necessarily
    the same as the height of a scroll view's content view.

    When set less than the height of the scroller, the scroller is disabled.

    @type Number
    @default 0
   */
  maximum: 0,

  /**
    YES if enable scrollbar, NO to disable it.  Scrollbars will automatically
    disable if the maximum scroll width does not exceed their capacity.

    @type Boolean
    @default YES
   */
  isEnabled: YES,

  /**
    This function overrides the default function in SC.Scroller as
    menus only have vertical scrolling.

    @field
    @type String
    @default 'verticalScrollOffset'
   */
  ownerScrollValueKey: function() {
    return 'verticalScrollOffset';
  }.property('layoutDirection').cacheable(),


  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private */
  init: function() {
    // Set the scrollerThickness based on controlSize
    switch (this.get('controlSize')) {
    case SC.TINY_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.TINY_SCROLLER_THICKNESS);
      break;
    case SC.SMALL_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.SMALL_SCROLLER_THICKNESS);
      break;
    case SC.REGULAR_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.REGULAR_SCROLLER_THICKNESS);
      break;
    case SC.LARGE_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.LARGE_SCROLLER_THICKNESS);
      break;
    case SC.HUGE_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.HUGE_SCROLLER_THICKNESS);
      break;
    }

    return sc_super();
  },

  /** @private */
  mouseEntered: function(evt) {
    this.set('isMouseOver', YES);
    this._invokeScrollOnMouseOver();
  },

  /** @private */
  mouseExited: function(evt) {
    this.set('isMouseOver', NO);
  },

  mouseWheel: function (evt) {
    var el = this.getPath('parentView.containerView.layer'),
        rawEvent = evt.originalEvent;

    if (el && rawEvent) {
      try {
        if (SC.typeOf(el.fireEvent) === SC.T_FUNCTION) { // IE
          el.fireEvent(rawEvent.type, rawEvent);
        } else { // W3C
          el.dispatchEvent(rawEvent);
        }
      } catch (x) {
        // Can't dispatch the event; give up.
      }
    }
  },

  /** @private */
  _sc_scroller_armScrollTimer: function() {
    if (!this._sc_scrollTimer) {
      SC.RunLoop.begin();
      var method = this._sc_scroller_scrollDidChange;
      this._sc_scrollTimer = this.invokeLater(method, 50);
      SC.RunLoop.end();
    }
  },

  /** @private */
  _sc_scroller_scrollDidChange: function() {
    var now = (new Date()).getTime(),
        last = this._sc_lastScroll,
        layer = this.get('layer'),
        scroll = 0;

    if (last && (now - last) < 50) {
      this._sc_scroller_armScrollTimer();

    } else {
      this._sc_scrollTimer = null;
      this._sc_lastScroll = now;

      SC.RunLoop.begin();
      if (!this.get('isEnabled')) {
        this._sc_scrollValue = scroll = layer.scrollTop;
        this.set('value', scroll); // will now enforce minimum and maximum
      }
      SC.RunLoop.end();
    }
  },

  /** @private
    Scroll the menu if it is is an up or down arrow. This is called by
    the function that simulates mouseOver.
   */
  _scrollMenu: function(){
    var val = this.get('value'),
        lineScroll = this.getPath('parentView.verticalLineScroll'),
        newval;

    if (this.get('scrollDown')) {
      newval = val + lineScroll;
      if (newval <= this.get('maximum')) {
        this.set('value', newval);
      }
    } else {
      newval = val - lineScroll;
      if (newval >= 0) {
        this.set('value', newval);
      } else if (val <= this.verticalLineScroll && val > 0) {
        this.set('value', 0);
      }
    }
    return YES;
  },

  /** @private

    We use this function to simulate mouseOver. It checks for the flag
    isMouseOver which is turned on when mouseEntered is called and turned off
    when mouseExited is called.
  */
  _invokeScrollOnMouseOver: function(){
    this._scrollMenu();
    if (this.get('isMouseOver')) {
      this.invokeLater(this._invokeScrollOnMouseOver, 100);
    }
  }
});

/**
  @static
  @type Number
  @default 18
*/
SC.MenuScrollerView.REGULAR_SCROLLER_THICKNESS = 18;

/**
  @static
  @type Number
  @default 10
*/
SC.MenuScrollerView.TINY_SCROLLER_THICKNESS = 10;

/**
  @static
  @type Number
  @default 14
*/
SC.MenuScrollerView.SMALL_SCROLLER_THICKNESS = 14;

/**
  @static
  @type Number
  @default 23
*/
SC.MenuScrollerView.LARGE_SCROLLER_THICKNESS = 23;

/**
  @static
  @type Number
  @default 26
*/
SC.MenuScrollerView.HUGE_SCROLLER_THICKNESS = 26;

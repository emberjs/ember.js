// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/core_scroller');

/** @class
  Implements a custom desktop-like scroller view that handles
  your basic scrollbar events:

   - Arrow buttons for incremental scrolling in either direction.
   - Clicking in the track to incrementally jump to a location.
   - CTL+Click to jump immediately to a location.
   - A draggable scroll thumb.

  @extends SC.CoreScrollerView
  @since SproutCore 1.6
*/
SC.DesktopScrollerView = SC.CoreScrollerView.extend(
  /** @scope SC.DesktopScrollerView.prototype */{

  /**
    @type String
    @default 'desktopScrollerRenderDelegate'
  */
  renderDelegateName: 'desktopScrollerRenderDelegate',

  // ..........................................................
  // MOUSE EVENTS
  //

  /** @private
    Returns the value for a position within the scroller's frame.
   */
  valueForPosition: function (pos) {
    return ((pos - (this.get('capLength') - this.get('capOverlap'))) /
            (this.get('trackLength') - this.get('thumbLength'))) * this.get('maximum');
  },

  /** @private
    Handles mouse down events and adjusts the value property depending where
    the user clicked.

    If the control is disabled, we ignore all mouse input.

    If the user clicks the thumb, we note the position of the mouse event but
    do not take further action until they begin to drag.

    If the user clicks the track, we adjust the value a page at a time, unless
    alt is pressed, in which case we scroll to that position.

    If the user clicks the buttons, we adjust the value by a fixed amount, unless
    alt is pressed, in which case we adjust by a page.

    If the user clicks and holds on either the track or buttons, those actions
    are repeated until they release the mouse button.

    @param evt {SC.Event} the mousedown event
   */
  mouseDown: function (evt) {
    if (!this.get('isEnabled')) return NO;

    var target = evt.target,
        thumbPosition = this.get('thumbPosition'),
        value, clickLocation, clickOffset,
        scrollerLength = this.get('scrollerLength');

    // Determine the subcontrol that was clicked
    if (target.className.indexOf('thumb') >= 0) {
      // Convert the mouseDown coordinates to the view's coordinates
      clickLocation = this.convertFrameFromView({ x: evt.pageX,
                                                  y: evt.pageY });

      clickLocation.x -= thumbPosition;
      clickLocation.y -= thumbPosition;

      // Store the starting state so we know how much to adjust the
      // thumb when the user drags
      this._thumbDragging = YES;
      this._thumbOffset = clickLocation;
      this._mouseDownLocation = { x: evt.pageX,
                                  y: evt.pageY };
      this._thumbPositionAtDragStart = this.get('thumbPosition');
      this._valueAtDragStart = this.get("value");

    // User clicked the up/left button; decrement the value by a fixed amount or page size
    } else if (target.className.indexOf('button-top') >= 0) {
      this.decrementProperty('value', 30);
      this.makeButtonActive('.button-top');

      // start a timer that will continue to fire until mouseUp is called
      this.startMouseDownTimer('scrollUp');
      this._isScrollingUp = YES;

    // User clicked the down/right button; increment the value by a fixed amount
    } else if (target.className.indexOf('button-bottom') >= 0) {
      this.incrementProperty('value', 30);
      this.makeButtonActive('.button-bottom');

      // start a timer that will continue to fire until mouseUp is called
      this.startMouseDownTimer('scrollDown');
      this._isScrollingDown = YES;

    // User clicked in the track
    } else {
      var scrollToClick = this.get("shouldScrollToClick"),
          trackLength = this.get('trackLength'),
          thumbLength = this.get('thumbLength'),
          frame = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY }),
          mousePosition;

      if (evt.altKey) scrollToClick = !scrollToClick;

      switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        this._mouseDownLocation = mousePosition = frame.y;
        break;
      case SC.LAYOUT_HORIZONTAL:
        this._mouseDownLocation = mousePosition = frame.x;
        break;
      }

      if (scrollToClick) {
        this.set('value', this.valueForPosition(mousePosition - (thumbLength / 2)));

        // and start a normal mouse down
        thumbPosition = this.get('thumbPosition');

        this._thumbDragging = YES;
        this._thumbOffset = { x: frame.x - thumbPosition,
                              y: frame.y - thumbPosition };
        this._mouseDownLocation = { x: evt.pageX,
                                    y: evt.pageY };
        this._thumbPositionAtDragStart = thumbPosition;
        this._valueAtDragStart = this.get("value");

      // Move the thumb up or down a page depending on whether the click
      // was above or below the thumb
      } else if (mousePosition < thumbPosition) {
        this.decrementProperty('value', scrollerLength);
        this.startMouseDownTimer('page');

      } else {
        this.incrementProperty('value', scrollerLength);
        this.startMouseDownTimer('page');
      }
    }

    return YES;
  },

  /** @private
    When the user releases the mouse button, remove any active
    state from the button controls, and cancel any outstanding
    timers.

    @param evt {SC.Event} the mousedown event
   */
  mouseUp: function (evt) {
    var active = this._scs_buttonActive,
        ret = NO, timer;

    // If we have an element that was set as active in mouseDown,
    // remove its active state
    if (active) {
      active.removeClass('active');
      ret = YES;
    }

    // Stop firing repeating events after mouseup
    timer = this._mouseDownTimer;
    if (timer) {
      timer.invalidate();
      this._mouseDownTimer = null;
    }

    this._thumbDragging = NO;
    this._isScrollingDown = NO;
    this._isScrollingUp = NO;

    return ret;
  },

  /** @private
    If the user began the drag on the thumb, we calculate the difference
    between the mouse position at click and where it is now.  We then
    offset the thumb by that amount, within the bounds of the track.

    If the user began scrolling up/down using the buttons, this will track
    what component they are currently over, changing the scroll direction.

    @param evt {SC.Event} the mousedragged event
   */
  mouseDragged: function (evt) {
    var value, length, delta, thumbPosition,
        target = evt.target,
        thumbPositionAtDragStart = this._thumbPositionAtDragStart,
        isScrollingUp = this._isScrollingUp,
        isScrollingDown = this._isScrollingDown,
        active = this._scs_buttonActive,
        timer;

    // Only move the thumb if the user clicked on the thumb during mouseDown
    if (this._thumbDragging) {
      switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        delta = (evt.pageY - this._mouseDownLocation.y);
        break;
      case SC.LAYOUT_HORIZONTAL:
        delta = (evt.pageX - this._mouseDownLocation.x);
        break;
      }

      thumbPosition = thumbPositionAtDragStart + delta;
      length = this.get('trackLength') - this.get('thumbLength');
      this.set('value', Math.round( (thumbPosition/length) * this.get('maximum')));

    } else if (isScrollingUp || isScrollingDown) {
      var nowScrollingUp = NO, nowScrollingDown = NO;

      var topButtonRect = this.$('.button-top')[0].getBoundingClientRect();
      var bottomButtonRect = this.$('.button-bottom')[0].getBoundingClientRect();

      switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        nowScrollingUp = (evt.clientY < topButtonRect.bottom);
        break;
      case SC.LAYOUT_HORIZONTAL:
        nowScrollingUp = (evt.clientX < topButtonRect.right);
        break;
      }
      nowScrollingDown = !nowScrollingUp;

      if ((nowScrollingUp || nowScrollingDown) && nowScrollingUp !== isScrollingUp) {
        // If we have an element that was set as active in mouseDown,
        // remove its active state
        if (active) active.removeClass('active');

        // Stop firing repeating events after mouseup
        this._mouseDownTimerAction = nowScrollingUp ? "scrollUp" : "scrollDown";

        if (nowScrollingUp) {
          this.makeButtonActive('.button-top');
        } else if (nowScrollingDown) {
          this.makeButtonActive('.button-bottom');
        }

        this._isScrollingUp = nowScrollingUp;
        this._isScrollingDown = nowScrollingDown;
      }
    }

    return YES;
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

  /** @private
    Starts a timer that fires after 300ms.  This is called when the user
    clicks a button or inside the track to move a page at a time. If they
    continue holding the mouse button down, we want to repeat that action
    after a small delay.  This timer will be invalidated in mouseUp.

    Specify "immediate" as YES if it should not wait.
   */
  startMouseDownTimer: function (action, immediate) {
    this._mouseDownTimerAction = action;
    this._mouseDownTimer = SC.Timer.schedule({
      target: this,
      action: this.mouseDownTimerDidFire,
      interval: immediate ? 0 : 300
    });
  },

  /** @private
    Called by the mousedown timer.  This method determines the initial
    user action and repeats it until the timer is invalidated in mouseUp.
   */
  mouseDownTimerDidFire: function () {
    var scrollerLength = this.get('scrollerLength'),
        mouseLocation = SC.device.get('mouseLocation'),
        thumbPosition = this.get('thumbPosition'),
        thumbLength = this.get('thumbLength'),
        timerInterval = 50;

    switch (this.get('layoutDirection')) {
    case SC.LAYOUT_VERTICAL:
      mouseLocation = this.convertFrameFromView(mouseLocation).y;
      break;
    case SC.LAYOUT_HORIZONTAL:
      mouseLocation = this.convertFrameFromView(mouseLocation).x;
      break;
    }

    switch (this._mouseDownTimerAction) {
    case 'scrollDown':
      this.incrementProperty('value', 30);
      break;
    case 'scrollUp':
      this.decrementProperty('value', 30);
      break;
    case 'page':
      timerInterval = 150;
      if (mouseLocation < thumbPosition) {
        this.decrementProperty('value', scrollerLength);
      } else if (mouseLocation > thumbPosition+thumbLength) {
        this.incrementProperty('value', scrollerLength);
      }
    }

    this._mouseDownTimer = SC.Timer.schedule({
      target: this,
      action: this.mouseDownTimerDidFire,
      interval: timerInterval
    });
  },

  /** @private
    Given a selector, finds the corresponding DOM element and adds
    the 'active' class name.  Also stores the returned element so that
    the 'active' class name can be removed during mouseup.

    @param {String} the selector to find
   */
  makeButtonActive: function (selector) {
    this._scs_buttonActive = this.$(selector).addClass('active');
  }

});

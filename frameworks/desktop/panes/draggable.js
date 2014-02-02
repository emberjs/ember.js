// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  Provides drag functionality to a pane. If you need to disable dragging at certain times set the
  property isAnchored to YES and the pane will no longer move.

  See SC.PalettePane, a simple panel pane with SC.DraggablePaneSupport mixed in.
*/
SC.DraggablePaneSupport = /** @scope SC.DraggablePaneSupport.prototype */{

  /**
    Walk like a duck.

    @type Boolean
  */
  isDraggablePane: YES,

  /**
   @type Boolean
   @default NO
  */
  isAnchored: NO,

  /** @private */
  _drag_cachedMouseX: null,

  /** @private */
  _drag_cachedMouseY: null,

  /**
   To provide drag functionality enhance mouseDown, mouseDragged, touchStart, and touchesDragged if they exist.
   */
  initMixin: function() {
    if (this.mouseDown) {
      this.mouseDown = SC._enhance(this.mouseDown, function(original, evt) {
        var ret = this._drag_mouseDown(evt);
        return original(evt) || ret;
      });
    } else {
      this.mouseDown = this._drag_mouseDown;
    }

    if (this.mouseDragged) {
      this.mouseDragged = SC._enhance(this.mouseDragged, function(original, evt) {
        var ret = this._drag_mouseDragged(evt);
        return original(evt) || ret;
      });
    } else {
      this.mouseDragged = this._drag_mouseDragged;
    }

    if (this.touchStart) {
      this.touchStart = SC._enhance(this.touchStart, function(original, evt) {
        var ret = this._drag_touchStart(evt);
        return original(evt) || ret;
      });
    } else {
      this.touchStart = this._drag_touchStart;
    }

    if (this.touchesDragged) {
      this.touchesDragged = SC._enhance(this.touchesDragged, function(original, evt) {
        var ret = this._drag_touchesDragged(evt);
        return original(evt) || ret;
      });
    } else {
      this.touchesDragged = this._drag_touchesDragged;
    }
  },

  /**
    Returns true if the target view of the event exists and has a truthy isTextSelectable

    @param evt The event
    @return {Boolean}
  */
  _drag_targetHasSelectableText: function(evt) {
    var targetView = SC.RootResponder.responder.targetViewForEvent(evt);

    return !!(targetView && targetView.isTextSelectable);
  },

  /**
    Returns true if we should handle a drag.

    @param evt The event
    @return {Boolean}
  */
  _drag_shouldHandleDrag: function(evt) {
    return !this.get('isAnchored') && !this._drag_targetHasSelectableText(evt);
  },

  /**
    The drag code will modify the existing layout by the difference between each drag event so for the first one store
    the original mouse down position.

    @param evt The mouseDown event
    @return {Boolean} YES
  */
  _drag_mouseDown: function(evt) {
    this._drag_cachedMouseX = evt.pageX;
    this._drag_cachedMouseY = evt.pageY;
    return this._drag_shouldHandleDrag(evt);
  },

  /**
    Modify the current layout by the movement since the last drag event.

    @param evt The mouseDrag event
    @return {Boolean} YES if we moved the view, NO if we didn't due to isAnchored being YES
  */
  _drag_mouseDragged: function(evt) {
    var xOffset = this._drag_cachedMouseX - evt.pageX,
        yOffset = this._drag_cachedMouseY - evt.pageY,
        frame = this.get('frame'),
        // NOTE: wFrame will be incorrect if this pane is not attached to document.body (e.g. via appendTo).
        wFrame = SC.RootResponder.responder.computeWindowSize(),
        oldLayout = SC.clone(this.get('layout')),
        layout = {},
        isPercent = function(num) {
          return (num < 1 && num > 0);
        };

    //Update the cached coordinates so we can track the change between each drag event
    this._drag_cachedMouseX = evt.pageX;
    this._drag_cachedMouseY = evt.pageY;

    if (!this._drag_shouldHandleDrag(evt)) {
      return NO;
    }

    // If a layout property is in the layout no matter what other layout properties are used we need to modify it the
    // same way. For the 4 offsets we check if they've been specified as percentages and if so convert them to regular
    // offsets based on our current frame and the current window. For simplicity's sake, it is assumed that the frame
    // frame coordinates are in the browser window's coordinates (see above note on wFrame).

    if (oldLayout.hasOwnProperty('left')) {
      if (isPercent(oldLayout.left)) {
        oldLayout.left = frame.x;
      }

      layout.left = oldLayout.left - xOffset;
    }

    if (oldLayout.hasOwnProperty('right')) {
      if (isPercent(oldLayout.right)) {
        oldLayout.right = wFrame.width - (frame.x + frame.width);
      }

      layout.right = oldLayout.right + xOffset;
    }

    if (oldLayout.hasOwnProperty('centerX')) {
      layout.centerX = oldLayout.centerX - xOffset;
    }

    if (oldLayout.hasOwnProperty('top')) {
      if (isPercent(oldLayout.top)) {
        oldLayout.top = frame.y;
      }

      layout.top = oldLayout.top - yOffset;
    }

    if (oldLayout.hasOwnProperty('bottom')) {
      if (isPercent(oldLayout.bottom)) {
        oldLayout.bottom = wFrame.height - (frame.y + frame.height);
      }

      layout.bottom = oldLayout.bottom + yOffset;
    }

    if (oldLayout.hasOwnProperty('centerY')) {
      layout.centerY = oldLayout.centerY - yOffset;
    }

    this.adjust(layout);

    return YES;
  },

  /**
    Forward to our mouseDown handler.
  */
  _drag_touchStart: function(evt) {
    return this._drag_mouseDown(evt);
  },

  /**
    Forward to our mouseDragged handler.
  */
  _drag_touchesDragged: function(evt) {
    return this._drag_mouseDragged(evt);
  }
};

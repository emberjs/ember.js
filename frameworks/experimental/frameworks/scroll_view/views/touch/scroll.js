// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/core_scroll');
sc_require('views/touch/scroller');

/**
  @static
  @type Number
  @default 0.95
*/
SC.NORMAL_SCROLL_DECELERATION = 0.95;

/**
  @static
  @type Number
  @default 0.85
*/
SC.FAST_SCROLL_DECELERATION = 0.85;


/** @class
  Implements touch events for a scroll view

  Since the iPad doesn't allow native one-finger scrolling,
  this has to do all of the work of implementing the solution
  over again.

  In addition to the one-finger scrolling, this view implements
  edge-resistance.

  Note that incremental rendering is done after the scrolling
  has completely finished, which makes for a wait-and-see
  experience.

  @extends SC.CoreScrollerView
 */
SC.TouchScrollView = SC.CoreScrollView.extend(
  /** @scope SC.TouchScrollView.prototype */{

  /**
    Use this to overlay the vertical scroller.

    This ensures that the container frame will not resize to accommodate the
    vertical scroller, hence overlaying the scroller on top of
    the container.

    @type Boolean
    @default YES
  */
  verticalOverlay: YES,

  /**
    Use this to overlay the horizontal scroller.

    This ensures that the container frame will not resize to accommodate the
    horizontal scroller, hence overlaying the scroller on top of
    the container

    @type Boolean
    @default YES
  */
  horizontalOverlay: YES,

  /**
    @type SC.CoreScrollerView
    @default SC.OverlayScrollerView
   */
  horizontalScrollerView: SC.OverlayScrollerView,

  /**
    @type SC.CoreScrollerView
    @default SC.OverlayScrollerView
   */
  verticalScrollerView: SC.OverlayScrollerView,

  // ..........................................................
  // TOUCH SUPPORT
  //

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    The scroll deceleration rate.

    @type Number
    @default SC.NORMAL_SCROLL_DECELERATION
  */
  decelerationRate: SC.NORMAL_SCROLL_DECELERATION,

  /**
    If YES, bouncing will always be enabled in the horizontal direction, even if the content
    is smaller or the same size as the view.

    @type Boolean
    @default NO
  */
  alwaysBounceHorizontal: NO,

  /**
    If NO, bouncing will not be enabled in the vertical direction when the content is smaller
    or the same size as the scroll view.

    @type Boolean
    @default YES
  */
  alwaysBounceVertical: YES,

  /**
    Whether to delay touches from passing through to the content.

    @type Boolean
    @default YES
  */
  delaysContentTouches: YES,

  /** @private */
  _applyCSSTransforms: function (layer) {
    var transform = "";
    this.updateScale(this._scale);
    transform += 'translate3d('+ -this._scroll_horizontalScrollOffset +'px, '+ -Math.round(this._scroll_verticalScrollOffset)+'px,0) ';
    transform += this._scale_css;
    if (layer) {
      layer.style.webkitTransform = transform;
      layer.style.webkitTransformOrigin = "top left";
    }
  },

  /** @private */
  captureTouch: function (touch) {
    return YES;
  },

  /** @private */
  touchGeneration: 0,

  /** @private */
  touchStart: function (touch) {
    var generation = ++this.touchGeneration;
    if (!this.tracking && this.get("delaysContentTouches")) {
      this.invokeLater(this.beginTouchesInContent, 150, generation);
    } else if (!this.tracking) {
      // NOTE: We still have to delay because we don't want to call touchStart
      // while touchStart is itself being called...
      this.invokeLater(this.beginTouchesInContent, 1, generation);
    }
    this.beginTouchTracking(touch, YES);
    return YES;
  },

  /** @private */
  beginTouchesInContent: function (gen) {
    if (gen !== this.touchGeneration) return;

    var touch = this.touch, itemView;
    if (touch && this.tracking && !this.dragging && !touch.touch.scrollHasEnded) {
      // try to capture the touch
      touch.touch.captureTouch(this, YES);

      if (!touch.touch.touchResponder) {
        // if it DIDN'T WORK!!!!!
        // then we need to take possession again.
        touch.touch.makeTouchResponder(this);
      // Otherwise, it did work, and if we had a pending scroll end, we must do it now
      } else if (touch.needsScrollEnd) {
        this._touchScrollDidEnd();
      }
    }
  },

  /** @private
    This will notify anything that's incrementally rendering while
    scrolling, instead of having unrendered views.
   */
  _sctsv_setOffset: function (x, y) {
    if (!SC.none(x)) {
      this._scroll_horizontalScrollOffset = x;
    }

    if (!SC.none(y)) {
      this._scroll_verticalScrollOffset = y;
    }
  },

  /** @private
    Initializes the start state of the gesture.

    We keep information about the initial location of the touch so we can
    disambiguate between a tap and a drag.

    @param {Event} evt
  */
  beginTouchTracking: function (touch, starting) {
    var avg = touch.averagedTouchesForView(this, starting);

    var verticalScrollOffset = this._scroll_verticalScrollOffset || 0,
        horizontalScrollOffset = this._scroll_horizontalScrollOffset || 0,
        startClipOffsetX = horizontalScrollOffset,
        startClipOffsetY = verticalScrollOffset,
        needsScrollEnd = NO;

    this.willScroll(this);

    if (this.touch && this.touch.timeout) {
      // clear the timeout
      clearTimeout(this.touch.timeout);
      this.touch.timeout = null;

      // get the scroll offsets
      startClipOffsetX = this.touch.startClipOffset.x;
      startClipOffsetY = this.touch.startClipOffset.y;
      needsScrollEnd = YES;
    }

    // calculate container+content width/height
    var view = this.get('contentView') ;
    var contentWidth = view ? view.get('frame').width : 0,
        contentHeight = view ? view.get('frame').height : 0;

    if (view.calculatedWidth && view.calculatedWidth!==0) contentWidth = view.get('calculatedWidth');
    if (view.calculatedHeight && view.calculatedHeight !==0) contentHeight = view.get('calculatedHeight');

    var containerWidth = this.get('containerView').get('frame').width,
        containerHeight = this.get('containerView').get('frame').height;

    // calculate position in content
    var globalFrame = this.convertFrameToView(this.get("frame"), null),
        positionInContentX = (horizontalScrollOffset + (avg.x - globalFrame.x)) / this._scale,
        positionInContentY = (verticalScrollOffset + (avg.y - globalFrame.y)) / this._scale;

    this.touch = {
      startTime: touch.timeStamp,
      notCalculated: YES,

      enableScrolling: {
        x: contentWidth * this._scale > containerWidth || this.get("alwaysBounceHorizontal"),
        y: contentHeight * this._scale > containerHeight || this.get("alwaysBounceVertical")
      },
      scrolling: { x: NO, y: NO },

      enableBouncing: SC.platform.bounceOnScroll,

      // offsets and velocities
      startClipOffset: { x: startClipOffsetX, y: startClipOffsetY },
      lastScrollOffset: { x: horizontalScrollOffset, y: verticalScrollOffset },
      startTouchOffset: { x: avg.x, y: avg.y },
      scrollVelocity: { x: 0, y: 0 },

      startTouchOffsetInContent: { x: positionInContentX, y: positionInContentY },

      containerSize: { width: containerWidth, height: containerHeight },
      contentSize: { width: contentWidth, height: contentHeight },

      startScale: this._scale,
      startDistance: avg.d,
      canScale: this.get("canScale") && SC.platform.pinchToZoom,
      minimumScale: this.get("minimumScale"),
      maximumScale: this.get("maximumScale"),

      globalFrame: globalFrame,

      // cache some things
      layer: this.get("contentView").get('layer'),

      // some constants
      resistanceCoefficient: 0.998,
      resistanceAsymptote: 320,
      decelerationFromEdge: 0.05,
      accelerationToEdge: 0.1,

      // how much percent of the other drag direction you must drag to start dragging that direction too.
      scrollTolerance: { x: 15, y: 15 },
      scaleTolerance: 5,
      secondaryScrollTolerance: 30,
      scrollLock: 500,

      decelerationRate: this.get("decelerationRate"),

      // general status
      lastEventTime: touch.timeStamp,

      // the touch used
      touch: (starting ? touch : (this.touch ? this.touch.touch : null)),

      // needsScrollEnd will cause a scrollDidEnd even if this particular touch does not start a scroll.
      // the reason for this is because we don't want to say we've stopped scrolling just because we got
      // another touch, but simultaneously, we still need to send a touch end eventually.
      // there are two cases in which this will be used:
      //
      //    1. If the touch was sent to content touches (in which case we will not be scrolling)
      //    2. If the touch ends before scrolling starts (no scrolling then, either)
      needsScrollEnd: needsScrollEnd
    };

    if (!this.tracking) {
      this.tracking = YES;
      this.dragging = NO;
    }
  },

  /** @private */
  _adjustForEdgeResistance: function (offset, minOffset, maxOffset, resistanceCoefficient, asymptote) {
    var distanceFromEdge;

    // find distance from edge
    if (offset < minOffset) distanceFromEdge = offset - minOffset;
    else if (offset > maxOffset) distanceFromEdge = maxOffset - offset;
    else return offset;

    // manipulate logarithmically
    distanceFromEdge = Math.pow(resistanceCoefficient, Math.abs(distanceFromEdge)) * asymptote;

    // adjust mathematically
    if (offset < minOffset) distanceFromEdge = distanceFromEdge - asymptote;
    else distanceFromEdge = -distanceFromEdge + asymptote;

    // generate final value
    return Math.min(Math.max(minOffset, offset), maxOffset) + distanceFromEdge;
  },

  /** @private */
  touchesDragged: function (evt, touches) {
    var avg = evt.averagedTouchesForView(this);
    this.updateTouchScroll(avg.x, avg.y, avg.d, evt.timeStamp);
  },

  /** @private */
  updateTouchScroll: function (touchX, touchY, distance, timeStamp) {
    // get some vars
    var touch = this.touch,
        touchXInFrame = touchX - touch.globalFrame.x,
        touchYInFrame = touchY - touch.globalFrame.y,
        offsetY,
        maxOffsetY,
        offsetX,
        maxOffsetX,
        minOffsetX, minOffsetY;

    // calculate new position in content
    var positionInContentX = ((this._scroll_horizontalScrollOffset||0) + touchXInFrame) / this._scale,
        positionInContentY = ((this._scroll_verticalScrollOffset||0) + touchYInFrame) / this._scale;

    // calculate deltas
    var deltaX = positionInContentX - touch.startTouchOffsetInContent.x,
        deltaY = positionInContentY - touch.startTouchOffsetInContent.y;

    var isDragging = touch.dragging;
    if (!touch.scrolling.x && Math.abs(deltaX) > touch.scrollTolerance.x && touch.enableScrolling.x) {
      // say we are scrolling
      isDragging = YES;
      touch.scrolling.x = YES;
      touch.scrollTolerance.y = touch.secondaryScrollTolerance;

      // reset position
      touch.startTouchOffset.x = touchX;
      deltaX = 0;
    }
    if (!touch.scrolling.y && Math.abs(deltaY) > touch.scrollTolerance.y && touch.enableScrolling.y) {
      // say we are scrolling
      isDragging = YES;
      touch.scrolling.y = YES;
      touch.scrollTolerance.x = touch.secondaryScrollTolerance;

      // reset position
      touch.startTouchOffset.y = touchY;
      deltaY = 0;
    }

    // handle scroll start
    if (isDragging && !touch.dragging) {
      touch.dragging = YES;
      this.dragging = YES;
      this._touchScrollDidStart();
    }

    // calculate new offset
    if (!touch.scrolling.x && !touch.scrolling.y && !touch.canScale) return;
    if (touch.scrolling.x && !touch.scrolling.y) {
      if (deltaX > touch.scrollLock && !touch.scrolling.y) touch.enableScrolling.y = NO;
    }
    if (touch.scrolling.y && !touch.scrolling.x) {
      if (deltaY > touch.scrollLock && !touch.scrolling.x) touch.enableScrolling.x = NO;
    }

    // handle scaling through pinch gesture
    if (touch.canScale) {

      var startDistance = touch.startDistance, dd = distance - startDistance;
      if (Math.abs(dd) > touch.scaleTolerance) {
        touch.scrolling.y = YES; // if you scale, you can scroll.
        touch.scrolling.x = YES;

        // we want to say something that was the startDistance away from each other should now be
        // distance away. So, if we are twice as far away as we started...
        var scale = touch.startScale * (distance / Math.max(startDistance, 50));

        var newScale = this._adjustForEdgeResistance(scale, touch.minimumScale, touch.maximumScale, touch.resistanceCoefficient, touch.resistanceAsymptote);
        this.dragging = YES;
        this._scale = newScale;
        var newPositionInContentX = positionInContentX * this._scale,
            newPositionInContentY = positionInContentY * this._scale;
      }
    }

    // these do exactly what they sound like. So, this comment is just to
    // block off the code a bit
    // In english, these calculate the minimum X/Y offsets
    minOffsetX = this.minimumScrollOffset(touch.contentSize.width * this._scale,
                                          touch.containerSize.width, this.get("horizontalAlign"));
    minOffsetY = this.minimumScrollOffset(touch.contentSize.height * this._scale,
                                          touch.containerSize.height, this.get("verticalAlign"));

    // and now, maximum...
    maxOffsetX = this.maximumScrollOffset(touch.contentSize.width * this._scale,
                                          touch.containerSize.width, this.get("horizontalAlign"));
    maxOffsetY = this.maximumScrollOffset(touch.contentSize.height * this._scale,
                                          touch.containerSize.height, this.get("verticalAlign"));

    // So, the following is the completely written out algebra:
    // (offsetY + touchYInFrame) / this._scale = touch.startTouchOffsetInContent.y
    // offsetY + touchYInFrame = touch.startTouchOffsetInContent.y * this._scale;
    // offsetY = touch.startTouchOffset * this._scale - touchYInFrame

    // and the result applied:
    offsetX = touch.startTouchOffsetInContent.x * this._scale - touchXInFrame;
    offsetY = touch.startTouchOffsetInContent.y * this._scale - touchYInFrame;


    // we need to adjust for edge resistance, or, if bouncing is disabled, just stop flat.
    if (touch.enableBouncing) {
      offsetX = this._adjustForEdgeResistance(offsetX, minOffsetX, maxOffsetX, touch.resistanceCoefficient, touch.resistanceAsymptote);
      offsetY = this._adjustForEdgeResistance(offsetY, minOffsetY, maxOffsetY, touch.resistanceCoefficient, touch.resistanceAsymptote);
    } else {
      offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
      offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
    }

    // and now, _if_ scrolling is enabled, set the new coordinates
    if (touch.scrolling.x) this._sctsv_setOffset(offsetX, null);
    if (touch.scrolling.y) this._sctsv_setOffset(null, offsetY);

    // and apply the CSS transforms.
    this._applyCSSTransforms(touch.layer);
    this._touchScrollDidChange();


    // prepare for momentum scrolling by calculating the momentum.
    if ((timeStamp - touch.lastEventTime) >= 1 || touch.notCalculated) {
      touch.notCalculated = NO;
      var horizontalOffset = this._scroll_horizontalScrollOffset;
      var verticalOffset = this._scroll_verticalScrollOffset;

      touch.scrollVelocity.x = (horizontalOffset - touch.lastScrollOffset.x) /
                                Math.max(1, timeStamp - touch.lastEventTime); // in px per ms
      touch.scrollVelocity.y = (verticalOffset - touch.lastScrollOffset.y) /
                                Math.max(1, timeStamp - touch.lastEventTime); // in px per ms
      touch.lastScrollOffset.x = horizontalOffset;
      touch.lastScrollOffset.y = verticalOffset;
      touch.lastEventTime = timeStamp;
    }
  },

  /** @private */
  touchEnd: function (touch) {
    var touchStatus = this.touch,
        avg = touch.averagedTouchesForView(this);

    touch.scrollHasEnded = YES;
    if (avg.touchCount > 0) {
      this.beginTouchTracking(touch, NO);
    } else {
      if (this.dragging) {
        touchStatus.dragging = NO;

        // reset last event time
        touchStatus.lastEventTime = touch.timeStamp;

        this.startDecelerationAnimation();
      } else {
        // well. The scrolling stopped. Let us tell everyone if there was a pending one that this non-drag op interrupted.
        if (touchStatus.needsScrollEnd) this._touchScrollDidEnd();

        // this part looks weird, but it is actually quite simple.
        // First, we send the touch off for capture+starting again, but telling it to return to us
        // if nothing is found or if it is released.
        touch.captureTouch(this, YES);

        // if we went anywhere, did anything, etc., call end()
        if (touch.touchResponder && touch.touchResponder !== this) {
          touch.end();
        } else if (!touch.touchResponder || touch.touchResponder === this) {
          // if it was released to us or stayed with us the whole time, or is for some
          // wacky reason empty (in which case it is ours still). If so, and there is a next responder,
          // relay to that.

          if (touch.nextTouchResponder) touch.makeTouchResponder(touch.nextTouchResponder);
        } else {
          // in this case, the view that captured it and changed responder should have handled
          // everything for us.
        }

        this.touch = null;
      }

      this.tracking = NO;
      this.dragging = NO;
    }
  },

  /** @private */
  touchCancelled: function (touch) {
    var touchStatus = this.touch,
        avg = touch.averagedTouchesForView(this);

    // if we are decelerating, we don't want to stop that. That would be bad. Because there's no point.
    if (!this.touch || !this.touch.timeout) {
      this.beginPropertyChanges();
      this.set("scale", this._scale);
      this.set("verticalScrollOffset", this._scroll_verticalScrollOffset);
      this.set("horizontalScrollOffset", this._scroll_horizontalScrollOffset);
      this.endPropertyChanges();
      this.didScroll(this);
      this.tracking = NO;

      if (this.dragging) {
        this._touchScrollDidEnd();
      }

      this.dragging = NO;
      this.touch = null;
    }
  },

  /** @private */
  startDecelerationAnimation: function (evt) {
    var touch = this.touch;
    touch.decelerationVelocity = {
      x: touch.scrollVelocity.x * 10,
      y: touch.scrollVelocity.y * 10
    };

    this.decelerateAnimation();
  },

  /** @private
    Does bounce calculations, adjusting velocity.

    Bouncing is fun. Functions that handle it should have fun names,
    don'tcha think?

    P.S.: should this be named "bouncityBounce" instead?
  */
  bouncyBounce: function (velocity, value, minValue, maxValue, de, ac, additionalAcceleration) {
    // we have 4 possible paths. On a higher level, we have two leaf paths that can be applied
    // for either of two super-paths.
    //
    // The first path is if we are decelerating past an edge: in this case, this function must
    // must enhance that deceleration. In this case, our math boils down to taking the amount
    // by which we are past the edge, multiplying it by our deceleration factor, and reducing
    // velocity by that amount.
    //
    // The second path is if we are not decelerating, but are still past the edge. In this case,
    // we must start acceleration back _to_ the edge. The math here takes the distance we are from
    // the edge, multiplies by the acceleration factor, and then performs two additional things:
    // First, it speeds up the acceleration artificially  with additionalAcceleration; this will
    // make the stop feel more sudden, as it will still have this additional acceleration when it reaches
    // the edge. Second, it ensures the result does not go past the final value, so we don't end up
    // bouncing back and forth all crazy-like.
    if (value < minValue) {
      if (velocity < 0) velocity = velocity + ((minValue - value) * de);
      else {
        velocity = Math.min((minValue-value) * ac + additionalAcceleration, minValue - value - 0.01);
      }
    } else if (value > maxValue) {
      if (velocity > 0) velocity = velocity - ((value - maxValue) * de);
      else {
        velocity = -Math.min((value - maxValue) * ac + additionalAcceleration, value - maxValue - 0.01);
      }
    }
    return velocity;
  },

  /** @private */
  decelerateAnimation: function () {
    // get a bunch of properties. They are named well, so not much explanation of what they are...
    // However, note maxOffsetX/Y takes into account the scale;
    // also, newX/Y adds in the current deceleration velocity (the deceleration velocity will
    // be changed later in this function).
    var touch = this.touch,
        scale = this._scale,
        minOffsetX = this.minimumScrollOffset(touch.contentSize.width * this._scale,
                                              touch.containerSize.width, this.get("horizontalAlign")),
        minOffsetY = this.minimumScrollOffset(touch.contentSize.height * this._scale,
                                              touch.containerSize.height, this.get("verticalAlign")),
        maxOffsetX = this.maximumScrollOffset(touch.contentSize.width * this._scale,
                                              touch.containerSize.width, this.get("horizontalAlign")),
        maxOffsetY = this.maximumScrollOffset(touch.contentSize.height * this._scale,
                                              touch.containerSize.height, this.get("verticalAlign")),

        now = Date.now(),
        t = Math.max(now - touch.lastEventTime, 1),

        newX = this._scroll_horizontalScrollOffset + touch.decelerationVelocity.x * (t / 10),
        newY = this._scroll_verticalScrollOffset + touch.decelerationVelocity.y * (t / 10);

    var de = touch.decelerationFromEdge, ac = touch.accelerationToEdge;

    // under a few circumstances, we may want to force a valid X/Y position.
    // For instance, if bouncing is disabled, or if position was okay before
    // adjusting scale.
    var forceValidXPosition = !touch.enableBouncing, forceValidYPosition = !touch.enableBouncing;

    // determine if position was okay before adjusting scale (which we do, in
    // a lovely, animated way, for the scaled out/in too far bounce-back).
    // if the position was okay, then we are going to make sure that we keep the
    // position okay when adjusting the scale.
    //
    // Position OKness, here, referring to if the position is valid (within
    // minimum and maximum scroll offsets)
    if (newX >= minOffsetX && newX <= maxOffsetX) forceValidXPosition = YES;
    if (newY >= minOffsetY && newY <= maxOffsetY) forceValidYPosition = YES;

    // We are going to change scale in a moment, but the position should stay the
    // same, if possible (unless it would be more jarring, as described above, in
    // the case of starting with a valid position and ending with an invalid one).
    //
    // Because we are changing the scale, we need to make the position scale-neutral.
    // we'll make it non-scale-neutral after applying scale.
    //
    // Question: might it be better to save the center position instead, so scaling
    // bounces back around the center of the screen?
    newX /= this._scale;
    newY /= this._scale;

    // scale velocity (amount to change) starts out at 0 each time, because
    // it is calculated by how far out of bounds it is, rather than by the
    // previous such velocity.
    var sv = 0;

    // do said calculation; we'll use the same bouncyBounce method used for everything
    // else, but our adjustor that gives a minimum amount to change by and (which, as we'll
    // discuss, is to make the stop feel slightly more like a stop), we'll leave at 0
    // (scale doesn't really need it as much; if you disagree, at least come up with
    // numbers more appropriate for scale than the ones for X/Y)
    sv = this.bouncyBounce(sv, scale, touch.minimumScale, touch.maximumScale, de, ac, 0);

    // add the amount to scale. This is linear, rather than multiplicative. If you think
    // it should be multiplicative (or however you say that), come up with a new formula.
    this._scale = scale = scale + sv;

    // now we can convert newX/Y back to scale-specific coordinates...
    newX *= this._scale;
    newY *= this._scale;

    // It looks very weird if the content started in-bounds, but the scale animation
    // made it not be in bounds; it causes the position to animate snapping back, and,
    // well, it looks very weird. It is more proper to just make sure it stays in a valid
    // position. So, we'll determine the new maximum/minimum offsets, and then, if it was
    // originally a valid position, we'll adjust the new position to a valid position as well.


    // determine new max offset
    minOffsetX = this.minimumScrollOffset(touch.contentSize.width * this._scale,
                                          touch.containerSize.width, this.get("horizontalAlign"));
    minOffsetY = this.minimumScrollOffset(touch.contentSize.height * this._scale,
                                          touch.containerSize.height, this.get("verticalAlign"));
    maxOffsetX = this.maximumScrollOffset(touch.contentSize.width * this._scale,
                                          touch.containerSize.width, this.get("horizontalAlign"));
    maxOffsetY = this.maximumScrollOffset(touch.contentSize.height * this._scale,
                                          touch.containerSize.height, this.get("verticalAlign"));

    // see if scaling messed up the X position (but ignore if 'tweren't right to begin with).
    if (forceValidXPosition && (newX < minOffsetX || newX > maxOffsetX)) {
      // Correct the position
      newX = Math.max(minOffsetX, Math.min(newX, maxOffsetX));

      // also, make the velocity be ZERO; it is obviously not needed...
      touch.decelerationVelocity.x = 0;
    }

    // now the y
    if (forceValidYPosition && (newY < minOffsetY || newY > maxOffsetY)) {
      // again, correct it...
      newY = Math.max(minOffsetY, Math.min(newY, maxOffsetY));

      // also, make the velocity be ZERO; it is obviously not needed...
      touch.decelerationVelocity.y = 0;
    }


    // now that we are done modifying the position, we may update the actual scroll
    this._sctsv_setOffset(newX, newY);

    this._applyCSSTransforms(touch.layer); // <- Does what it sounds like.

    this._touchScrollDidChange();

    // Now we have to adjust the velocities. The velocities are simple x and y numbers that
    // get added to the scroll X/Y positions each frame.
    // The default decay rate is .950 per frame. To achieve some semblance of accuracy, we
    // make it to the power of the elapsed number of frames. This is not fully accurate,
    // as this is applying the elapsed time between this frame and the previous time to
    // modify the velocity for the next frame. My mind goes blank when I try to figure out
    // a way to fix this (given that we don't want to change the velocity on the first frame),
    // and as it seems to work great as-is, I'm just leaving it.
    var decay = touch.decelerationRate;
    touch.decelerationVelocity.y *= Math.pow(decay, (t / 10));
    touch.decelerationVelocity.x *= Math.pow(decay, (t / 10));

    // We have a bouncyBounce method that adjusts the velocity for bounce. That is, if it is
    // out of range and still going, it will slow it down. This step is decelerationFromEdge.
    // If it is not moving (or has come to a stop from decelerating), but is still out of range,
    // it will start it moving back into range (accelerationToEdge)
    // we supply de and ac as these properties.
    // The .3 artificially increases the acceleration by .3; this is actually to make the final
    // stop a bit more abrupt.
    touch.decelerationVelocity.x = this.bouncyBounce(touch.decelerationVelocity.x, newX, minOffsetX, maxOffsetX, de, ac, 0.3);
    touch.decelerationVelocity.y = this.bouncyBounce(touch.decelerationVelocity.y, newY, minOffsetY, maxOffsetY, de, ac, 0.3);

    // if we ain't got no velocity... then we must be finished, as there is no where else to go.
    // to determine our velocity, we take the absolue value, and use that; if it is less than .01, we
    // must be done. Note that we check scale's most recent velocity, calculated above using bouncyBounce,
    // as well.
    var absXVelocity = Math.abs(touch.decelerationVelocity.x);
    var absYVelocity = Math.abs(touch.decelerationVelocity.y);
    if (absYVelocity < 0.05 && absXVelocity < 0.05 && Math.abs(sv) < 0.05) {
      // we can reset the timeout, as it will no longer be required, and we don't want to re-cancel it later.
      touch.timeout = null;
      this.touch = null;

      // trigger scroll end
      this._touchScrollDidEnd();

      // set the scale, vertical, and horizontal offsets to what they technically already are,
      // but don't know they are yet. This will finally update things like, say, the clipping frame.
      this.beginPropertyChanges();
      this.set("scale", this._scale);
      this.set("verticalScrollOffset", this._scroll_verticalScrollOffset);
      this.set("horizontalScrollOffset", this._scroll_horizontalScrollOffset);
      this.endPropertyChanges();
      this.didScroll(this);

      return;
    }

    // We now set up the next round. We are doing this as raw as we possibly can, not touching the
    // run loop at all. This speeds up performance drastically--keep in mind, we're on comparatively
    // slow devices, here. So, we'll just make a closure, saving "this" into "self" and calling
    // 10ms later (or however long it takes). Note also that we save both the last event time
    // (so we may calculate elapsed time) and the timeout we are creating, so we may cancel it in future.
    var self = this;
    touch.lastEventTime = Date.now();
    this.touch.timeout = setTimeout(function () {
      SC.run(self.decelerateAnimation(), self);
    }, 10);
  },

  adjustElementScroll: function () {
    var content = this.get('contentView');

    if (content) {
      this._applyCSSTransforms(content.get('layer'));
    }
    return sc_super();
  },

  /** @private */
  _touchScrollDidChange: function () {
    var contentView = this.get('contentView'),
        horizontalScrollOffset = this._scroll_horizontalScrollOffset,
        verticalScrollOffset = this._scroll_verticalScrollOffset;
    if (contentView.touchScrollDidChange) {
      contentView.touchScrollDidChange(horizontalScrollOffset, verticalScrollOffset);
    }

    // tell scrollers
    if (this.verticalScrollerView && this.verticalScrollerView.touchScrollDidChange) {
      this.verticalScrollerView.touchScrollDidChange(verticalScrollOffset);
    }

    if (this.horizontalScrollerView && this.horizontalScrollerView.touchScrollDidChange) {
      this.horizontalScrollerView.touchScrollDidChange(horizontalScrollOffset);
    }
  }
});

SC.TouchScrollView.prototype.mixin({

  /** @private */
  _touchScrollDidStart: SC.TouchScrollView.prototype._touchScrollDidChange,

  /** @private */
  _touchScrollDidEnd: SC.TouchScrollView.prototype._touchScrollDidChange

});

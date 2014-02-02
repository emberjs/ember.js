// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Strobe Inc. All rights reserved.
// Author:    Peter Wagenet
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/gesture");

/**
  @class
  @extends SC.Gesture
*/
SC.TapGesture = SC.Gesture.extend(
/** @scope SC.TapGesture.prototype */{

  /**
    @type String
    @default "tap"
    @readOnly
  */
  name: "tap",

  /**
    @type Boolean
    @default NO
    @readOnly
  */
  acceptsMultitouch: NO,

  /** @private */
  _tapCount: null,
  
  /** @private */
  _candidateTouch: null,
  
  /** @private */
  _eventTimer: null,

  /**
    @type Number
    @default 20
  */
  tapWiggle: 10,

  /**
    @type Number
    @default 200
  */
  tapDelay: 200,

  /** @private */
  touchIsInGesture: function(touch, status) {
    return !touch.tapFlunked;
  },

  /** @private */
  touchStart: function(touch) {
    // We don't want events triggering during a touch, will be reset when touch is over if it's a candidate
    if (this._eventTimer) this._eventTimer.invalidate();

    // We have an activeTap but another touch has been started
    if (this._candidateTouch && this._candidateTouch.touch.identifier !== touch.identifier) {
      this._cancelTap(touch);
      return NO;
    }

    // This touch is a candidate
    this._candidateTouch = {
      startTime: Date.now(),
      touch: touch
    };

    this.start(touch);

    return YES;
  },

  /** @private */
  touchesDragged: function(evt, touches) {
    var touch = touches[0];

    // Somehow another touch got in
    var tooManyTouches = (
      touches.length > 1 ||
      !this._candidateTouch ||
      touch.identifier !== this._candidateTouch.touch.identifier
    );

    // Touch moved too much
    var touchMoved = this._calculateDragDistance(touch) > this.get('tapWiggle');

    if (tooManyTouches || touchMoved) this._cancelTap(touch);
  },

  /** @private */
  touchEnd: function(touch){
    if (this._calculateDragDistance(touch) > this.get('tapWiggle') || Date.now() - this._candidateTouch.startTime > this.get('tapDelay') ) {
      // Touch moved too much or took too long
      this._cancelTap(touch);
    } else {
      this._addTap(touch);
    }
  },

  /** @private */
  _addTap: function(touch){
    var self = this;

    if (this._eventTimer) this._eventTimer.invalidate();

    this._tapCount = (this._tapCount || 0) + 1;
    this._candidateTouch = null;
    this._eventTimer = SC.Timer.schedule({
      target: self,
      action: function(){ this._triggerTap(touch); },
      interval: this.get('tapDelay')
    });

    this.change(touch, this._tapCount);
    this.trigger(touch, this._tapCount);

  },

  /** @private */
  _cancelTap: function(touch){
    // We don't set this on the touchStatus because the status is
    // linked to an individual view/gesture and we want this to be
    // global. If it's not a tap somewhere, it's not a tap anywhere.
    touch.tapFlunked = YES;

    this.release(touch);
    this.cancel(touch, this._tapCount);

    if (this._eventTimer) this._eventTimer.invalidate();
    this._tapCount = null;
    this._candidateTouch = null;
    this._eventTimer = null;

  },

  /** @private */
  _triggerTap: function(touch){
    this.end(touch, this._tapCount);

    this._tapCount = null;
    this._candidateTouch = null;
    this._eventTimer = null;
  },

  /** @private */
  _calculateDragDistance: function(touch) {
    return Math.sqrt(Math.pow(touch.pageX - touch.startX, 2) + Math.pow(touch.pageY - touch.startY, 2));
  }

});


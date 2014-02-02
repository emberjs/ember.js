// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/gesture");

/*
  TODO Document this class
*/

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_HORIZONTAL = "X";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_VERTICAL = "Y";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_ANY = "XY";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_LEFT = "LEFT";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_RIGHT = "RIGHT";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_UP = "UP";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_DOWN = "DOWN";

/**
  @class
  @extends SC.Gesture
*/
SC.SwipeGesture = SC.Gesture.extend(
/** @scope SC.SwipeGesture.prototype */ {

  /**
    @type String
    @default "swipe"
    @readOnly
  */
  name: "swipe",

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    @type String
    @default SC.SWIPE_HORIZONTAL
  */
  direction: SC.SWIPE_HORIZONTAL,

  /**
    Will be populated with the current direction of the swipe once
    one has been determined.
    
    @type String
    @default null
  */
  currentDirection: null,

  /**
    @type Number
    @default 5
  */
  startDistance: 5,

  /**
    @type Number
    @default 40
  */
  swipeDistance: 40,
  
  /**
    Amount of distance in the other direction to consider it a swipe
    
    @type Number
    @default 0.5
  */
  tolerance: 0.5,
  
  /** @private */
  touchIsInGesture: function(touch, status) {
    // if we have not "flunked" the touch before, and it has moved 
    if (!status.flunked) {
      var d = this.get('direction'),
          cd = this.get('currentDirection'),
          startDistance = this.get('startDistance'),
          deltaX = touch.pageX - touch.startX,
          deltaY = touch.pageY - touch.startY,
          absX = Math.abs(deltaX),
          absY = Math.abs(deltaY);

      if (Math.abs(deltaX) > startDistance || Math.abs(deltaY) > startDistance) {

        if (!cd) {
          if (d == SC.SWIPE_ANY) {
            if      (absX > absY) cd = SC.SWIPE_HORIZONTAL;
            else if (absY > absX) cd = SC.SWIPE_VERTICAL;
            else                      return NO; // We can't determine a direction yet
          } else {
            cd = d;
          }
          this.set('currentDirection', cd);
        }

        var delta  = (cd == SC.SWIPE_HORIZONTAL) ? deltaX : deltaY,
            oDelta = (cd == SC.SWIPE_HORIZONTAL) ? deltaY : deltaX;

        if (Math.abs(delta) * this.get("tolerance") > Math.abs(oDelta)) {
          return YES;
        }

      }
    }
    return NO;
  },
  
  /** @private */
  touchStart: function(touch) {
    var d = this.get("currentDirection"), 
        delta = touch["page" + d] - touch["start" + d],
        swipeDirection;
    
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;
    
    this.start(touch, swipeDirection, delta);
    return YES;
  },
  
  /** @private */
  touchesDragged: function(evt, touches) {
    var touch = touches.firstObject();
    var d = this.get("currentDirection"), 
        o = (d === SC.SWIPE_HORIZONTAL ? "Y" : "X"),
        delta = touch["page" + d] - touch["start" + d],
        oDelta = touch["page" + o] - touch["start" + o],
        swipeDirection;
    
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;
    
    if (
      Math.abs(delta) < this.get("startDistance") ||
      Math.abs(delta) * this.get("tolerance") < Math.abs(oDelta)
    ) {
      // does not qualify anymore
      this.release(touch);

      var allTouches = touch.touchesForResponder(this);
      if (!allTouches || allTouches.length === 0) this.cancel(touch, swipeDirection, delta);
    } else {
      this.change(touch, swipeDirection, delta);
    }
  },
  
  /** @private */
  touchEnd: function(touch) {
    var d = this.get("currentDirection"), 
        o = (d === SC.SWIPE_HORIZONTAL ? "Y" : "X"),
        delta = touch["page" + d] - touch["start" + d],
        oDelta = touch["page" + o] - touch["start" + o],
        swipeDirection;
    
    // determine swipe direction
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;

    // trigger
    if (
      Math.abs(delta) > this.get("swipeDistance") ||
      Math.abs(delta) * this.get("tolerance") < Math.abs(oDelta)
    ) {
      this.trigger(touch, swipeDirection);
    }

    this.end(touch, swipeDirection, delta);

    this.set('currentDirection', null);

    // and release all others
    var touches = touch.touchesForResponder(this);
    if (touches) {
      touches.forEach(function(touch){
        this.release(touch);
      }, this);
    }
  },

  /** @private */
  cancel: function(){
    sc_super();
    this.set('currentDirection', null);
  }

});
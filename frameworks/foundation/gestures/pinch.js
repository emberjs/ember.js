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
  @class
  @extends SC.Gesture
*/
SC.PinchGesture = SC.Gesture.extend(
/** @scope SC.PinchGesture.prototype */{

  /**
    @type String
    @default "pinch"
    @readOnly
  */
  name: "pinch",

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    @type Number
    @default 1
  */
  scale: 1,

  /**
    The default for this method is to loop through each touch one by one to see if it qualifies.
    Here, however, we want to take the touches when there are 2, and only 2 of them. As a result
    we can do the work here, with no need to pass them on.
    
    @param {Event} evt The touch event
    @param {Array} touches All touches
  */
  unassignedTouchesDidChange: function(evt, touches) {
    if (touches.length == 2) {
      this.take(touches[0]);
      this.take(touches[1]);
    }
  },

  /**
    We could probably just return YES here, since unassignedTouchesDidChange shouldn't let more
    than 2 touches through, however, we're double checking here to make sure that we haven't
    already captured 2 touches.
    
    @param {Touch} touch
    @returns {Boolean} YES if there were none or one touches prior to this, NO otherwise
  */
  touchStart: function(touch) {
    var touches = touch.touchesForResponder(this);
    if (!touches || touches.length === 0) {
      return YES;
    } else if (touches.length == 1) {
      this.start([touches[0], touch]);
      return YES;
    } else {
      return NO;
    }
  },

  /**
    Here we're getting the distance between the 2 touches and comparing it to their starting
    distance. It's possible we'll want to implement a more complex algorithm to make things
    a bit smoother. Once we have the relative change, we trigger the pinch action in the view.
    
    @param {Event} evt
    @param {Array} touches
  */
  touchesDragged: function(evt, touches) {
    var touch = touches.firstObject(),
        avg = touch.averagedTouchesForView(this);

    if (avg.touchCount == 2) {
      if (!this._startDistance) {
        this._startDistance = avg.d;
      }

      this.scale = avg.d / this._startDistance;

      this.change(touches, this.scale);
    }
  },

  /**
    Once one touch has ended we don't need to watch the other so we release all touches.
    
    @param {SC.Touch} touch
  */
  touchEnd: function(touch) {
    this._startDistance = null;

    var touches = touch.touchesForResponder(this);

    this.trigger(touches, this.scale);
    this.end(touches, this.scale);

    if (touches) {
      touches.forEach(function(touch){
        this.release(touch);
      }, this);
    }
  }

});

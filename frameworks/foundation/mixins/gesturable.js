// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace
  
  You can mix in SC.Gesturable to your views to add some support for recognizing
  gestures.
  
  SproutCore views have built-in touch events. However, sometimes you may want
  to recognize gestures like tap, pinch, swipe, etc. This becomes tedious if you
  need to do this often, and more so if you need to check for multiple possible
  gestures on the same view.
  
  SC.Gesturable allows you to define a collection of gestures (SC.Gesture objects)
  that your view should recognize. When a gesture is recognized, methods will be
  called on the view:
  
    - [gestureName](gesture, args...): called when the gesture has occurred. This is 
      useful for event-style gestures, where you aren't interested in when it starts or
      ends, but just that it has occurred. SC.SwipeGesture triggers this after the
      swipe has moved a minimum amount—40px by default.
    - [gestureName]Start(gesture, args...): called when the gesture is first recognized. 
      For instance, a swipe gesture may be recognized after the finger has moved a 
      minimum distance in a horizontal.
    - [gestureName]Changed(gesture, args...): called when some property of the gesture 
      has changed. For instance, this may be called continuously as the user swipes as 
      the swipe's distance changes.
    - [gestureName]Cancelled(gesture, args...): called when a gesture, for one reason 
      or another, is no longer recognized. For instance, a horizontal swipe gesture 
      could cancel if the user moves too far in a vertical direction.
    - [gestureName]End(gesture, args...): called when a gesture ends. A swipe would end
      when the user lifts their finger.
  
  Each of these methods is passed the gesture instance, in addition to any arguments
  the gesture sends for your convenience. The default swipe gesture sends an SC.Touch
  instance, the swipe direction, and the distance the swipe has moved in that direction.
  
  Using SC.Gesturable
  -------------------
  
  To make your view recognize gestures, mix in Gesturable and add items to the 'gestures'
  property:
  
      SC.View.extend(SC.Gesturable, {
        gestures: [SC.PinchGesture, 'mySwipeGesture'],
        
        // specifying as a string allows you to configure it:
        mySwipeGesture: SC.SwipeGesture.extend({
          direction: SC.SWIPE_VERTICAL,
          startDistance: 3,
          swipeDistance: 20
        }),
        
        // handle the swipe action
        swipe: function(touch, direction) {
          console.error("Swiped! In direction: " + direction);
        },
        
        swipeStart: function(touch, direction, delta) {
          console.error("Swipe started in direction: " + direction + "; dist: " + delta);
        },
        
        swipeChanged: function(touch, direction, delta) {
          console.error("Swipe continued in direction: " + direction + "; dist: " + delta);
        },
        
        swipeEnd: function(touch, direction, delta) {
          console.error("Completed swipe in direction: " + direction + "; dist: " + delta);
        }
        
      })
  
*/
SC.Gesturable = {

  concatenatedProperties: ["gestures"],
  gestures: [],
  
  /**
    @private
    When SC.Gesturable initializes, any gestures on the view must be instantiated.
  */
  initMixin: function() {
    this.createGestures();
  },
  
  /**
    @private
    Instantiates the gestures.
  */
  createGestures: function() {
    var gestures = this.get("gestures"), idx, len = gestures.length, g, _g = [];

    // loop through all gestures
    for (idx = 0; idx < len; idx++) {
      // get the proper gesture
      if (SC.typeOf(gestures[idx]) === SC.T_STRING) {
        g = this.get(gestures[idx]);
      } else {
        g = gestures[idx];
      }
      
      // if it was not found, well, that's an error.
      if (!g) {
        throw new Error("Could not find gesture named '" + gestures[idx] + "' on view.");
      }
      
      // if it is a class, instantiate (it really ought to be a class...)
      if (g.isClass) {
        g = g.create({
          view: this
        });
      }
      
      // and set the gesture instance and add it to the array.
      if (SC.typeOf(gestures[idx]) === SC.T_STRING) this[gestures[idx]] = g;
      _g.push(g);
    }
    
    this.set("gestures", _g);
  },
  
  /**
    Handles touch start by handing it to the gesture recognizing code.
    
    If you override touchStart, you will need to call gestureTouchStart to
    give the gesture system control of the touch. You will continue to get
    events until if and when a gesture decides to take "possession" of a touch—
    at this point, you will get a [gestureName]Start event.
    
    You do not have to call gestureTouchStart immediately; you can call it
    at any time. This allows you to avoid passing control until _after_ you
    have determined your own touchStart, touchesDragged, and touchEnd methods
    are not going to handle it.
  */
  touchStart: function(touch) {
    this.gestureTouchStart(touch);
  },
  
  /**
    Tells the gesture recognizing code about touches moving.
    
    If you override touchesDragged, you will need to call gestureTouchesDragged
    (at least for any touches you called gestureTouchStart for in touchStart) to 
    allow the gesture system to update.
  */
  touchesDragged: function(evt, touches) {
    this.gestureTouchesDragged(evt, touches);
  },
  
  /**
    Tells the gesture recognizing code about a touch ending.
    
    If you override touchEnd, you will need to call gestureTouchEnd
    for any touches you called touchStart for.
  */
  touchEnd: function(touch) {
    this.gestureTouchEnd(touch);
  },
  
  /**
    Tells the gesture recognizing system about a new touch.
    
    This informs all gestures that a new touch, "unassigned" to any gesture,
    has been located. Later, each gesture has an opportunity to claim the touch.
    
    Once they have claimed the touch, further events will go _directly_ to them—
    this view will cease receiving the touchesDragged and will not receive a touchEnd.
  */
  gestureTouchStart: function(touch) {
    touch.isInteresting = 0;
    
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchDidStart(touch);
    }
  },
  
  /**
    Tells the gesture recognition system that some touches have moved.
    
    This informs all gestures that these touches have changed. All such touches
    are "unassigned" because all "assigned" touches already get sent directly
    to the gesture.
  */
  gestureTouchesDragged: function(evt, touches) {
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchesDidChange(evt, touches);
    }
  },
  
  /**
    Tells the gesture recognition system that a touch have ended.
    
    This informs all of the gestures that the touch ended. The touch is
    an unassigned touch as, if it were assigned to a gesture, it would have
    been sent directly to the gesture, bypassing this view.
  */
  gestureTouchEnd: function(touch) {
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchDidEnd(touch);
    }
  }
};
// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-touch/system/gesture_manager');
require('sproutcore-touch/system/touch_list');

var get = SC.get;
var set = SC.set;

var sigFigs = 100;

SC.TouchList = SC.Object.extend({
  touches: null,

  timestamp: null,

  init: function() {
    this._super();

    set(this, 'touches', []);
  },

  addTouch: function(touch) {
    var touches = get(this, 'touches');
    touches.push(touch);
    this.notifyPropertyChange('touches');
  },

  updateTouch: function(touch) {
    var touches = get(this, 'touches');

    for (var i=0, l=touches.length; i<l; i++) {
      var _t = touches[i];

      if (_t.identifier === touch.identifier) {
        touches[i] = touch;
        this.notifyPropertyChange('touches');
        break;
      }
    }
  },

  removeTouch: function(touch) {
    var touches = get(this, 'touches');

    for (var i=0, l=touches.length; i<l; i++) {
      var _t = touches[i];

      if (_t.identifier === touch.identifier) {
        touches.splice(i,1);
        this.notifyPropertyChange('touches');
        break;
      }
    }
  },

  removeAllTouches: function() {
    set(this, 'touches', []);
  },

  touchWithId: function(id) {
    var ret = null,
        touches = get(this, 'touches');

    for (var i=0, l=touches.length; i<l; i++) {
      var _t = touches[i];

      if (_t.identifier === id) {
        ret = _t;
        break;
      }
    }

    return ret;
  },

  length: function() {
    var touches = get(this, 'touches');
    return touches.length;
  }.property('touches').cacheable()
});

/**
  @class

  Base class for all gesture recognizers. Handles low-level touch and state
  management, and provides some utility methods and some required methods all
  gesture recognizers are expected to implement.

  Overview
  =========

  Gestures coalesce multiple touch events to a single higher-level gesture
  event. For example, a tap gesture recognizer takes information about a
  touchstart event, a few touchmove events, and a touchend event and uses
  some heuristics to decide whether or not that sequence of events qualifies
  as a tap event. If it does, then it will notify the view of the higher-level
  tap events.

  Gesture events follow the format:

    * [GESTURE_NAME]Start - Sent when a gesture has gathered enough information
        to begin tracking the gesture

    * [GESTURE_NAME]Change - Sent when a gesture has already started and has
        received touchmove events that cause its state to change

    * [GESTURE_NAME]End - Sent when a touchend event is received and the gesture
        recognizer decides that the gesture is finished.

    * [GESTURE_NAME]Cancel - Sent when a touchcancel event is received.

  There are two types of gesturess: Discrete and Continuous gestures. In contrast
  to continuous gestures, discrete gestures don't have any change events. Rather,
  the start and end events are the only one that gets sent.

  Usage
  =======

  While you wouldn't use SC.Gesture directly, all its subclasses have the same
  API. For example, to implement pinch on a view, you implement pinchChange and
  optionally pinchStart, pinchEnd and pinchCancel.

      var myView = SC.View.create({
        pinchStart: function(recognizer) {
          this.$().css('background','red');
        },

        pinchChange: function(recognizer) {
          var scale = recognizer.get('scale');
          this.$().css('-webkit-transform','scale3d('+scale+','+scale+',1)');
        },

        pinchEnd: function(recognizer) {
          this.$().css('background','blue');
        },

        pinchCancel: function(recognizer) {
          this.$().css('background','blue');
        }
      });

  pinchStart(), pinchEnd() and pinchCancel() will only get called once per
  gesture, but pinchChange() will get called repeatedly called every time
  one of the touches moves.

  Creating Custom Gesture Recognizers
  ======

  SC.Gesture also defines an API which its subclasses can implement to build
  custom gestures. The methods are:

    * **didBecomePossible** - Called when a gesture enters a possible state. This
        means the gesture recognizer has accepted enough touches to match 
        the number of required touches. You would usually initialize your state
        in this callback.

    * **eventWasRejected** - Called if a view returns false from a gesture event.
        This callback allows you to reset internal state if the user rejects
        an event.

    * **shouldBegin** - Allows a gesture to block itself from entering a began state.
        This callback will continuously be called as touches move until it begins.

    * **shouldEnd** - Allows a gesture to block itself from entering an ended state.
        This callback gets called whenever a tracked touch gets a touchEnd event.

    * **didBegin** - Called when the gesture enters a began state. Called before the
       view receives the Start event.

    * **didChange** - Called when the gesture enters a began state, and when one of the
        touches moves. Called before the view receives the Change event.

    * **didEnd** - Called when the gesture enters an ended state. Called before the
       view receives the End event.

    * **didCancel** - Called when the gesture enters a cancelled state. Called before the
       view receives the Cancel event.

  In all the callbacks, you can use the `touches` protected property to access the
  touches hash. The touches hash is keyed on the identifiers of the touches, and the
  values are the jQuery.Event objects.

  You can also use the numberOfActiveTouches property to inspect how many touches
  are active, this is mostly useful in shouldBegin since every other callback can
  assume that there are as many active touches as specified in the 
  numberOfRequiredTouches property.

  Discrete vs Continuous Gestures
  =======

  There are two main classes of gesture recognizers: Discrete and Continuous 
  gestures. Discrete gestures do not get Change events sent, since they represent
  a single, instantaneous event, rather than a continuous motion. If you are 
  implementing your own discrete gesture recognizer, you must set the 
  isDiscreteGesture property to yes, and SC.Gesture will adapt its behavior.

  Discrete gestures use the shouldEnd callback to either accept or decline the gesture
  event. If it is delined, then the gesture will enter a Cancelled state and trigger
  the Cancel event on the view.

  @extends SC.Object
*/

SC.Gesture = SC.Object.extend(
  /** @scope SC.Gesture.prototype */{

  /**
    The current state of the gesture recognizer. This value can be any one
    of the states defined at the end of this file.

    @type Number
  */
  state: null,

  /**
    A string of the gesture recognizer's name. This value is set automatically
    but SC.Gestures when a gesture is registered.

    @type String
  */
  name: null,

  /** 
    Specifies whether a gesture is discrete or continuous.

    @type Boolean
    @default false
  */
  gestureIsDiscrete: false,

  /** 
    You can use the `touches` protected property to access the touches hash. The touches 
    hash is keyed on the identifiers of the touches, and the values are the jQuery.Event 
    objects.

    @private 
    @type Hash
  */
  touches: null,

  /** 
    You can also use the numberOfActiveTouches property to inspect how many touches
    are active, this is mostly useful in shouldBegin since every other callback can
    assume that there are as many active touches as specified in the 
    numberOfRequiredTouches property.

    @private 
    @type Number
  */
  numberOfActiveTouches: 0,

  /** 
    Used to specify the number of touches required for the gesture to enter a possible 
    state

    @private 
    @type Number
  */
  numberOfRequiredTouches: 1,

  init: function() {
    this._super();
    this.touches = SC.TouchList.create();
  },

  //..............................................
  // Gesture Callbacks

  /** @private */
  didBecomePossible: function() { },

  /** @private */
  shouldBegin: function() {
    return true;
  },

  /** @private */
  didBegin: function() { },

  /** @private */
  didChange: function() { },

  /** @private */
  eventWasRejected: function() { },

  /** @private */
  shouldEnd: function() {
    return true;
  },

  /** @private */
  didEnd: function() { },

  /** @private */
  didCancel: function() { },

  //..............................................
  // Utilities

  /** @private */
  attemptGestureEventDelivery: function(evt, view, eventName) {
    if (this.notifyViewOfGestureEvent(view, eventName) === false) {
      this.eventWasRejected();
    } else {
      evt.preventDefault();
    }
  },

  /**
    Given two Touch objects, this method returns the distance between them.

    @return Number
  */
  distance: function(touches) {

    if (touches.length < 2) {
      return 0;
    }

    var first = touches[0];
    var second = touches[1];

    var x = first.pageX;
    var y = first.pageY;
    var x0 = second.pageX;
    var y0 = second.pageY;

    return Math.sqrt((x -= x0) * x + (y -= y0) * y);
  },

  /**
    Given two Touch objects, this method returns the midpoint between them.

    @return Number
  */
  centerPointForTouches: function(touches) {
    var sumX = 0,
        sumY = 0;

    for (var i=0, l=touches.length; i<l; i++) {
      var touch = touches[i];
      sumX += touch.pageX;
      sumY += touch.pageY;
    }

    var location = {
      x: sumX / touches.length,
      y: sumY / touches.length
    };

    return location;
  },

  /** @private */
  _objectValues: function(object) {
    var ret = [];

    for (var item in object ) {
      if (object.hasOwnProperty(item)) {
        ret.push(object[item]);
      }
    }

    return ret;
  },

  /**
    Allows the gesture to notify the view it's associated with of a gesture
    event.

    @private
  */
  notifyViewOfGestureEvent: function(view, eventName, data) {
    var handler = view[eventName];
    var result = true;

    if (SC.typeOf(handler) === 'function') {
      result = handler.call(view, this, data);
    }

    return result;
  },

  toString: function() {
    return SC.Gesture+'<'+SC.guidFor(this)+'>';
  },

  /** @private */
  _resetState: function() {
    this.touches.removeAllTouches();
  },

  //..............................................
  // Touch event handlers

  /** @private */
  touchStart: function(evt, view, manager) {
    var targetTouches = evt.originalEvent.targetTouches;
    var _touches = this.touches;
    var state = get(this, 'state');

    set(_touches, 'timestamp', Date.now());

    //Collect touches by their identifiers
    for (var i=0, l=targetTouches.length; i<l; i++) {
      var touch = targetTouches[i];

      if(_touches.touchWithId(touch.identifier) === null && _touches.get('length') < get(this, 'numberOfRequiredTouches')) {
        _touches.addTouch(touch);
      }
    }

    if (_touches.get('length') < get(this, 'numberOfRequiredTouches')) {
      set(this ,'state', SC.Gesture.WAITING_FOR_TOUCHES);

    } else {
      // Discrete gestures may skip the possible step if they're ready to begin
      if (get(this, 'gestureIsDiscrete') && this.shouldBegin()) {
        set(this, 'state', SC.Gesture.BEGAN);
        this.didBegin();
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Start');
      } else {
        set(this, 'state', SC.Gesture.POSSIBLE);
        this.didBecomePossible();
      }
    }

    manager.redispatchEventToView(view,'touchstart', evt);
  },

  /** @private */
  touchMove: function(evt, view, manager) {
    var state = get(this, 'state');

    if (state === SC.Gesture.WAITING_FOR_TOUCHES || state === SC.Gesture.ENDED || state === SC.Gesture.CANCELLED) {
      // Nothing to do here
      manager.redispatchEventToView(view,'touchmove', evt);
      return;
    }

    var changedTouches = evt.originalEvent.changedTouches;
    var _touches = this.touches;

    set(_touches, 'timestamp', Date.now());

    // Update touches hash
    for (var i=0, l=changedTouches.length; i<l; i++) {
      var touch = changedTouches[i];
      _touches.updateTouch(touch);
    }

    if (state === SC.Gesture.POSSIBLE) {
      if (this.shouldBegin()) {
        set(this, 'state', SC.Gesture.BEGAN);
        this.didBegin();

        // Give the gesture a chance to update its state so the view can get 
        // updated information in the Start event
        this.didChange();

        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Start');
      }

    // Discrete gestures don't fire changed events
    } else if ((state === SC.Gesture.BEGAN || state === SC.Gesture.CHANGED) && !get(this, 'gestureIsDiscrete')) {
      set(this, 'state', SC.Gesture.CHANGED);
      this.didChange();

      this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Change');

    } else {
      manager.redispatchEventToView(view,'touchmove', evt);
    }
  },

  /** @private */
  touchEnd: function(evt, view, manager) {
    // Discrete gestures need to cancel if they shouldn't end successfully
    if (get(this, 'gestureIsDiscrete')) {

      // Discrete gestures use shouldEnd to either accept or decline the gesture.
      if (this.state === SC.Gesture.BEGAN && this.shouldEnd()) {
        set(this, 'state', SC.Gesture.ENDED);
        this.didEnd();
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'End');
      } else {
        set(this, 'state', SC.Gesture.CANCELLED);
        this.didCancel();
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Cancel');
      } 
    } 
    else {
      if (this.state !== SC.Gesture.ENDED && this.shouldEnd()) {
        set(this, 'state', SC.Gesture.ENDED);
        this.didEnd();

        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'End');
      } 

      manager.redispatchEventToView(view,'touchend', evt);
    }

    this._resetState();
  },

  /** @private */
  touchCancel: function(evt, view, manager) {
    if (this.state !== SC.Gesture.CANCELLED) {
      this._resetState();
      set(this, 'state', SC.Gesture.CANCELLED);
      this.notifyViewOfGestureEvent(view,get(this, 'name')+'Cancel');
    } else {
      manager.redispatchEventToView(view,'touchcancel', evt);
    }
  }
});

SC.Gesture.WAITING_FOR_TOUCHES = 0;
SC.Gesture.POSSIBLE = 1;
SC.Gesture.BEGAN = 2;
SC.Gesture.CHANGED = 3;
SC.Gesture.ENDED = 4;
SC.Gesture.CANCELLED = 4;

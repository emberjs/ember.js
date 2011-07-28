// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

var sigFigs = 100;

/**
  @class

  Base class for all gesture recognizers. Provides some utility methods and
  some required methods all gesture recognizers are expected to implement.

  Overview
  =========

  Gestures coalesce multiple touch events to a single higher-level gesture
  event. For example, a tap gesture recognizer takes information about a
  touchstart event, a few touchmove events, and a touchend event and uses
  some heuristics to decide whether or not that sequence of events qualifies
  as an event. If it does, then it will notify the view of the higher-level
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
  optionally pinchStart and pinchEnd.

    var myView = SC.View.create({
      pinchStart: function(recognizer) {
        this.$().css('background','red');
      },

      pinchChange: function(recognizer, scale) {
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

  name: null,

  gestureIsDiscrete: false,

  _touches: null,
  _numActiveTouches: 0,

  numberOfTouches: 2,

  init: function() {
    this._super();
    this._touches = {};
  },

  attemptGestureEventDelivery: function(evt, view, eventName) {
    if (this.notifyViewOfGestureEvent(view, eventName) === false) {
      this.gestureEventWasRejected();
    } else {
      evt.preventDefault();
    }
  },

  touchStart: function(evt, view, manager) {
    var targetTouches = evt.originalEvent.targetTouches;
    var _touches = this._touches;
    var state = get(this, 'state');

    //Collect touches by their identifiers
    for (var i=0, l=targetTouches.length; i<l; i++) {
      var touch = targetTouches[i];

      if(_touches[touch.identifier] === undefined && this._numActiveTouches < get(this, 'numberOfTouches')) {
        _touches[touch.identifier] = touch;
        this._numActiveTouches++;
      }
    }

    if (this._numActiveTouches < get(this, 'numberOfTouches')) {
      set(this ,'state', SC.Gesture.WAITING_FOR_TOUCHES);

    } else {
      // We have enough touches to switch to a possible state
      if (get(this, 'gestureIsDiscrete')) {
        set(this, 'state', SC.Gesture.BEGAN);
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Start');
      } else {
        set(this, 'state', SC.Gesture.POSSIBLE);
        this.gestureBecamePossible();
      }
    }

    manager.redispatchEventToView(view,'touchstart', evt);
  },

  touchMove: function(evt, view, manager) {
    var state = get(this, 'state');

    if (state === SC.Gesture.WAITING_FOR_TOUCHES || state === SC.Gesture.ENDED || state === SC.Gesture.CANCELLED) {
      manager.redispatchEventToView(view,'touchmove', evt);
      return;
    }

    var changedTouches = evt.originalEvent.changedTouches;
    var _touches = this._touches;

    for (var i=0, l=changedTouches.length; i<l; i++) {
      var touch = changedTouches[i];
      var identifier = changedTouches[i].identifier;

      if (_touches[identifier] !== undefined) {
          _touches[identifier] = touch;
       }
    }

    if (state === SC.Gesture.POSSIBLE && this.gestureShouldBegin()) {
      set(this, 'state', SC.Gesture.BEGAN);
      this.gestureChanged();
      this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Start');

    } else if (state === SC.Gesture.BEGAN || state === SC.Gesture.CHANGED) {
      set(this, 'state', SC.Gesture.CHANGED);
      this.gestureChanged();
      this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Change');

    } else {
      manager.redispatchEventToView(view,'touchmove', evt);
    }
  },

  touchEnd: function(evt, view, manager) {
    if (get(this, 'gestureIsDiscrete')) {

      if (this.state === SC.Gesture.BEGAN && this.gestureShouldEnd()) {
        set(this, 'state', SC.Gesture.ENDED);
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'End');

      } else {
        set(this, 'state', SC.Gesture.CANCELLED);
        this.attemptGestureEventDelivery(evt, view, get(this, 'name')+'Cancel');
      }
    } else {

      if (this.state !== SC.Gesture.ENDED) {
        this._resetState();
        set(this, 'state', SC.Gesture.ENDED);
        this.notifyViewOfGestureEvent(view,get(this, 'name')+'End');
      }

      manager.redispatchEventToView(view,'touchend', evt);
    }
  },

  touchCancel: function(evt, view, manager) {
    if (this.state !== SC.Gesture.CANCELLED) {
      this._resetState();
      set(this, 'state', SC.Gesture.CANCELLED);
      this.notifyViewOfGestureEvent(view,get(this, 'name')+'Cancel');
    } else {
      manager.redispatchEventToView(view,'touchcancel', evt);
    }
  },

  gestureShouldBegin: function() {
    return true;
  },

  gestureBecamePossible: function() {

  },

  gestureChanged: function() {

  },


  gestureShouldEnd: function() {
    return true;
  },

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
    Given two Touch objects, this method returns the distance between them.

    @return Number
  */
  distance: function(touches) {
    if (!(touches instanceof Array)) {
      touches = this._objectValues(touches);
    }

    if (touches.length !== 2) {
      throw new SC.Error('trying to get the distance between more than two points is not defined. Touches length: '+touches.length);
      return;
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
    var touches = this._objectValues(touches),
        sumX = sumY = 0;

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

  convertPointToView: function(location, view) {
    var x = y = 0;
    var element = view.$()[0];

    if (element.offsetParent) {
      do {
        x += element.offsetLeft;
        y += element.offsetTop;
      } while (element = element.offsetParent);
    }

    return {x: location.x - x, y: location.y - y};
  },

  /**
    Allows the gesture to notify the view it's associated with of a gesture
    event.
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

  _resetState: function() {
    this._touches = {};
    this._numActiveTouches = 0;
  }

});

SC.Gesture.WAITING_FOR_TOUCHES = 0;
SC.Gesture.POSSIBLE = 1;
SC.Gesture.BEGAN = 2;
SC.Gesture.CHANGED = 3;
SC.Gesture.ENDED = 4;
SC.Gesture.CANCELLED = 4;

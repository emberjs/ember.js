// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

SC.Gestures = SC.Object.create({
  
  _registeredGestures: null,

  init: function() {
    this._registeredGestures = {};

    return this._super();
  },

  register: function(name, recognizer) {
    var registeredGestures = this._registeredGestures;

    if (registeredGestures[name] !== undefined) {
      throw new SC.Error(name+" already exists as a registered gesture recognizers. Gesture recognizers must have globally unique names.");
    }

    registeredGestures[name] = recognizer;
    
    this._attachListeners(recognizer, name);
  },

  knownGestures: function() {
    var registeredGestures = this._registeredGestures;

    return (registeredGestures)? registeredGestures : {};
  },

  _attachListeners: function(recognizer, name) {
    var events = ['start','move','end','cancel'];

    for (var i=0, l=events.length; i<l; i++) {
      var event = events[i];
      this._setupHandler(recognizer, name, event);
    }
  },

  _setupHandler: function(recognizer, name, event) {
    var that = this;

    console.log('$(document.body).delegate(".'+name+'", "touch'+event+'", function(e){');
    $(document.body).delegate("."+name, "touch"+event, function(e){
      console.log('hever');
      that.eventFired(recognizer,eventName,e);
    })
  },

  eventFired: function(recognizer, eventName, evt) {
    console.log('Event',eventName,'fired on recognizer',recognizer);
  }

});

SC.GestureManager = SC.Object.extend({

  gestures: null

});

SC.Gesture = SC.Object.extend({
  isGesturable: true,
  name: null,
  state: null,

  distance: function(first, second) {

    var x = first.pageX;
    var y = first.pageY;
    var x0 = second.pageX;
    var y0 = second.pageY;

    return Math.sqrt((x -= x0) * x + (y -= y0) * y);
  },

  toString: function() {
    return SC.Gesture+'<'+SC.guidFor(this)+'>';
  }
});

SC.Gestures.POSSIBLE_STATE = 0;
SC.Gestures.BEGAN_STATE = 1;
SC.Gestures.CHANGED_STATE = 2;
SC.Gestures.ENDED_STATE = 3;
SC.Gestures.CANCELLED_STATE = 4;

/**

  If there are two touches
    at start, calculate distance
    when the touches move, recalculate distance
    calculate scale from change in distance
 
 */
SC.PinchGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  _currentDistanceBetweenTouches: null,
  _previousDistanceBetweenTouches: null,
  _scaleThreshold: 0,

  scale: 0,

  start: function(evt) {
    console.group('Pinch');
  },

  move: function(evt) {

  },

  end: function(evt) {
    this._state = SC.Gestures.ENDED_STATE;

    console.groupEnd();
  },

  cancel: function(evt) {
    this._state = SC.Gestures.CANCELLED_STATE;

    console.groupEnd();
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);

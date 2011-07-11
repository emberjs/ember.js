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
    
    this._attachListeners(recognizer);
  },

  knownGestures: function() {
    var registeredGestures = this._registeredGestures;

    return (registeredGestures)? registeredGestures : {};
  },

  _attachListeners: function(recognizer) {
    var events = ['start','move','end','cancel'];
    var name = get(recognizer, 'name');
    var that = this;

    for (var i=0, l=events.length; i<l; i++) {
      var event = events[i];

      (function(eventName){
        $("body").delegate("."+name, "touch"+event, function(e){
          that.eventFired(recognizer,eventName,e);
        })
      })(event);
    }
  },

  eventFired: function(recognizer, eventName, evt) {
    var view = SC.View.views[evt.target.id];
    recognizer[eventName](evt);
    console.log('key');
  }

});

SC.GestureSupport = SC.Mixin.create({
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
    return 'SC.Gesture<'+name+':'+SC.guidFor(this)+'>'
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
SC.PinchGestureRecognizer = SC.Object.extend(SC.GestureSupport, {
  numberOfTouches: 2,

  _currentDistanceBetweenTouches: null,
  _previousDistanceBetweenTouches: null,
  _scaleThreshold: 0,

  scale: 0,

  start: function(evt) {
    console.group('Pinch');

    var touches = evt.originalEvent.touches;

    if(touches.length === get(this, 'numberOfTouches')) {
      this._state = SC.Gestures.POSSIBLE_STATE;
      //set(this, 'state', );
      
      this._currentDistanceBetweenTouches = Math.round(this.distance(touches[0],touches[1])*10)/10
    }
  },

  move: function(evt) {
    var touches = evt.originalEvent.touches;

    if(touches.length !== get(this, 'numberOfTouches')) {
      return;
    }

    var state = this._state;

    this._previousDistanceBetweenTouches = this._currentDistanceBetweenTouches;
    this._currentDistanceBetweenTouches = Math.round(this.distance(touches[0],touches[1])*10)/10 

    this.scale = Math.round((this._currentDistanceBetweenTouches / this._previousDistanceBetweenTouches)*100)/100;

    if (state === SC.Gestures.POSSIBLE_STATE && this.scale >= this._scaleThreshold) {
      this._state = SC.Gestures.BEGAN_STATE;
    }
    else if (state === SC.Gestures.BEGAN_STATE) {
      this._state = SC.Gestures.CHANGED_STATE;
    }
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

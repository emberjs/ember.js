// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;
var application = null;
var view;

function generateTouchEvent(touches) {

}

module("Test Gesture Recognizer",{
  setup: function() {
    application = SC.Application.create();
    application.ready();
  },

  teardown: function() {
    application.destroy();
    if(view) view.destroy();
  }  
});

test("gesturable views that implement pinch methods get a pinch recognizer", function() {
  var view = SC.View.create({
    pinchStart: function(evt) {
      
    },      
    pinchChange: function(evt) {

    },      
    pinchEnd: function(evt) {

    }
  });

  var gestures = get(get(view, 'eventManager'), 'gestures'); 
  
  ok(gestures,'Should have a gestures property');
  equals(gestures.length,1,'Should have one gesture');
  ok(gestures[0] instanceof SC.PinchGestureRecognizer,'gesture should be pinch');
});

test("when finger touches inside, gesture should be in waiting state", function() {
  var numStart = 0;
  view = SC.View.create({
    elementId: 'gestureTest',

    pinchStart: function(evt) {
      console.log('pinchstart in view');
      numStart++;
    },

    touchStart: function(evt) {
      console.log('2: touchStart in view');
      numStart++;
    }
  });

  SC.run(function(){
    view.append();
  });

  var touchEvent = new jQuery.Event();
  
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
        pageX: 0,
        pageY: 0
    }]
  };

  view.$().trigger(touchEvent);

  equals(numStart,1,"touchStart called once")

  var gestures = get(get(view, 'eventManager'), 'gestures'); 

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.WAITING_FOR_TOUCHES, "gesture should be waiting");

  view.$().trigger('touchend')
});

test("when 2 fingers touch inside, gesture should be in possible state", function() {
  var numStart = 0;
  view = SC.View.create({
    elementId: 'gestureTest',

    pinchStart: function(evt) {
      console.log('pinchstart in view');
      numStart++;
    },

    touchStart: function(evt) {
      console.log('2: touchStart in view');
      numStart++;
    }
  });

  SC.run(function(){
    view.append();
  });

  var touchEvent = new jQuery.Event();
  
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 0,
      pageY: 10
    },
    {
      pageX: 10,
      pageY: 10
    }]
  };
  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures'); 
  window.gestures = gestures;

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be possible");

  view.$().trigger('touchend')
});

test("when 2 fingers move closer together, gesture should be in BEGAN state", function() {
  var numStart = 0, startScale, changeScale;
  view = SC.View.create({
    elementId: 'gestureTest',

    pinchStart: function(recognizer, scale) {
      console.log('pinchstart in view');
      numStart++;
      startScale = scale;
    },

    pinchChange: function(recognizer, scale) {
      console.log('pinchchange in view');
      changeScale = scale;
    },

    touchStart: function(evt) {
      console.log('2: touchStart in view');
    }
  });

  SC.run(function(){
    view.append();
  });

  var touchEvent = new jQuery.Event();
  
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 50,
      pageY: 100
    },
    {
      pageX: 100,
      pageY: 100
    }]
  };
  view.$().trigger(touchEvent);


  var gestures = get(get(view, 'eventManager'), 'gestures'); 
  window.gestures = gestures;

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be possible");

  touchEvent = new jQuery.Event();
  
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 0,
      pageY: 100
    },
    {
      pageX: 100,
      pageY: 100
    }]
  };

  console.log('gesture should be in began state after this');
  view.$().trigger(touchEvent);

  equals(get(gestures[0], 'state'),SC.Gesture.BEGAN, "gesture should be began");
  equals(numStart,1,"touchStart called once")
  equals(startScale,2,"scale should be doubled");

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 50,
      pageY: 100
    },
    {
      pageX: 100,
      pageY: 100
    }]
  };

  view.$().trigger(touchEvent);

  equals(changeScale,0.5,"scale should be halved");

  view.$().trigger('touchend')
});

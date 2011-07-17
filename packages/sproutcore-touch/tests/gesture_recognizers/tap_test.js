// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

var view;
var application;
var translation;
var numEnded = 0;
var startCalled = false;
var endCalled = false;

module("Tap Test",{
  setup: function() {
    numEnded = 0;
    startCalled = false;
    endCalled = false;

    application = SC.Application.create();

    view = SC.View.create({
      elementId: 'gestureTest',

      tapStart: function(recognizer) {
        startCalled = true;
      },

      tapEnd: function(recognizer) {
        endCalled = true;
      }
    });

    SC.run(function(){
      view.append();
    });
  },

  teardown: function() {

    var touchEvent = new jQuery.Event();
    touchEvent.type='touchend';
    touchEvent['originalEvent'] = {
      targetTouches: [],
      changedTouches: []
    };
    view.$().trigger(touchEvent)
    view.destroy();
    application.destroy();
  }  
});

test("one start event should put it in possible state", function() {
  var numStart = 0;
  var touchEvent = new jQuery.Event();
  
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 0,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures'); 

  ok(startCalled);
  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be possible");
});

test("when touch ends, tap should fire", function() {
  var numStart = 0;
  var touchEvent = new jQuery.Event();

  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      pageX: 0,
      pageY: 10
    }]
  };
  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures'); 

  ok(startCalled);
  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be possible");

  ok(startCalled);
 
  touchEvent = new jQuery.Event();
  touchEvent.type='touchend';
  touchEvent['originalEvent'] = {
    changedTouches: [{
      pageX: 0,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  gestures = get(get(view, 'eventManager'), 'gestures'); 

  ok(endCalled,'tap should be ended');
  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.ENDED, "gesture should be ended");


});


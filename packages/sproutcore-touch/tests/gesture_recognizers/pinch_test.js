// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

var view;
var application;
var scale;
var numEnded = 0;

module("Pinch Test",{
  setup: function() {
    numEnded = 0;

    application = SC.Application.create();

    view = SC.View.create({
      elementId: 'gestureTest',

      pinchStart: function(recognizer) {
        change = get(recognizer, 'scale')
        if (change < 0.5) return false;
        scale = change;
      },

      pinchChange: function(recognizer) {
        change = get(recognizer, 'scale')
        if (scale < 0.5) return false;
        scale = change;
      },

      pinchEnd: function(recognizer) {
        numEnded++;
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
      changedTouches: []
    };
    view.$().trigger(touchEvent)
    view.destroy();
    application.destroy();
  }
});

test("one start event should put it in waiting state", function() {
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

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.WAITING_FOR_TOUCHES, "gesture should be waiting");
});

test("two start events should put it in possible state", function() {
  var numStart = 0;
  var touchEvent = new jQuery.Event();

  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      identifier: 0,
      pageX: 0,
      pageY: 10
    },
    {
      identifier: 1,
      pageX: 10,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures');

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be possible");
});

test("If the touches move, the scale should reflect the change", function() {
  var touchEvent = new jQuery.Event();
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{
      identifier: 0,
      pageX: 0,
      pageY: 100
    },
    {
      identifier: 1,
      pageX: 100,
      pageY: 100
    }]
  };

  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures');

  ok(gestures);
  equals(gestures.length,1);
  equals(get(gestures[0], 'state'),SC.Gesture.POSSIBLE, "gesture should be ended");

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 50,
      pageY: 100
    }]
  };

  view.$().trigger(touchEvent);

  gestures = get(get(view, 'eventManager'), 'gestures');
  equals(get(gestures[0], 'state'),SC.Gesture.BEGAN, "gesture should be began");

  equals(scale,0.5,'scale should be halved');

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 0,
      pageY: 100
    },
    {
      identifier: 1,
      pageX: 100,
      pageY: 100
    }]
  };

  view.$().trigger(touchEvent);

  gestures = get(get(view, 'eventManager'), 'gestures');
  equals(get(gestures[0], 'state'),SC.Gesture.CHANGED, "gesture should be changed");

  equals(scale,1,'scale should be doubled again');

  touchEvent = new jQuery.Event();
  touchEvent.type='touchend';
  touchEvent['originalEvent'] = {
    changedTouches: [{ 
      identifier: 0,
      pageX: 10, 
      pageY: 20 
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = new jQuery.Event();
  touchEvent.type='touchend';
  touchEvent['originalEvent'] = {
    changedTouches: [{ 
      identifier: 1,
      pageX: 10, 
      pageY: 20 
    }]
  };

  view.$().trigger(touchEvent);

  gestures = get(get(view, 'eventManager'), 'gestures');
  equals(get(gestures[0], 'state'),SC.Gesture.ENDED, "gesture should be ended");

  equals(numEnded,1,"pinchEnd should be called once");

  touchEvent = new jQuery.Event();
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [{ 
      identifier: 0,
      pageX: 0, 
      pageY: 100 
    },
    { 
      identifier: 1, 
      pageX: 100, 
      pageY: 100 
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 50,
      pageY: 100
    }]
  };

  view.$().trigger(touchEvent);

  equals(scale,0.5,'scale should be halved');
});

test("If a gesture event returns false, reject the change", function() {
  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [{
      identifier: 0,
      pageX: 0,
      pageY: 10
    },
    {
      identifier: 1,
      pageX: 10,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 7.5,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures');
  equals(get(gestures[0], 'scale'),1, "state should not change");
});

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

module("Pan Test",{
  setup: function() {
    numEnded = 0;

    application = SC.Application.create();

    view = SC.View.create({
      elementId: 'gestureTest',

      panStart: function(recognizer, change) {
        if (change.x > 10) return false;
        translation = change;
      },

      panChange: function(recognizer, change) {
        if (change.x > 10) return false;
        translation = change;
      },

      panEnd: function(recognizer, change) {
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
      targetTouches: []
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
      identifier: 0,
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

test("If the touches move, the translation should reflect the change", function() {
  var touchEvent = new jQuery.Event();
  touchEvent.type='touchstart';
  touchEvent['originalEvent'] = {
    targetTouches: [ {
      identifier: 0,
      pageX: 0,
      pageY: 10
    }, 
    {
      identifier: 1,
      pageX: 0,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 10,
      pageY: 10
    },
    {
      identifier: 1,
      pageX: 10,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  equals(translation.x,10,'changed x value');

  touchEvent = new jQuery.Event();
  touchEvent.type='touchmove';
  touchEvent['originalEvent'] = {
    changedTouches: [ { 
      identifier: 0,
      pageX: 10, 
      pageY: 20 
    }, 
    { 
      identifier: 1,
      pageX: 10, 
      pageY: 20 
    }]
  };

  view.$().trigger(touchEvent);

  equals(translation.y,10,'changed y value');

  touchEvent = new jQuery.Event();
  touchEvent.type='touchend';
  touchEvent['originalEvent'] = {
    targetTouches: [{ 
      identifier: 0,
      pageX: 10, 
      pageY: 20 
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = new jQuery.Event();
  touchEvent.type='touchend';
  touchEvent['originalEvent'] = {
    targetTouches: []
  };

  view.$().trigger(touchEvent);

  equals(numEnded,1,"panEnd should be called once");
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
      pageX: 0,
      pageY: 10
    }]
  };

  view.$().trigger(touchEvent);

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [{
      identifier: 0,
      pageX: 20, 
      pageY: 10 
    }, 
    { 
      identifier: 1,
      pageX: 20, 
      pageY: 10 
    }]
  };

  view.$().trigger(touchEvent);

  var gestures = get(get(view, 'eventManager'), 'gestures'); 
  equals(get(gestures[0], 'translation').x,0, "state should not change");
  equals(get(gestures[0], 'translation').y,0, "state should not change");
});

//// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;
var outerdiv;
var application;

var pinchStartWasCalled = false;
var pinchChangeWasCalled = false;
var pinchEndWasCalled = false;

var panStartWasCalled = false;
var panChangeWasCalled = false;
var panEndWasCalled = false;

var tapStartWasCalled = false;
var tapCancelWasCalled = false;
var tapEndWasCalled = false;

module("Nested gesture recognizers", {
  setup: function() {
    application = SC.Application.create();

    pinchStartWasCalled = false;
    pinchChangeWasCalled = false;
    pinchEndWasCalled = false;

    panStartWasCalled = false;
    panChangeWasCalled = false;
    panEndWasCalled = false;

    tapStartWasCalled = false;
    tapCancelWasCalled = false;
    tapEndWasCalled = false;

    application.PinchPanView = SC.ContainerView.extend({
      scale: 1,

      translate: {
        x: 0,
        y: 0
      },

      pinchStart: function(recognizer) {
        pinchStartWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchChange: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchEnd: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      panOptions: {
        numberOfRequiredTouches: 2
      },

      panStart: function(recognizer) {
        panStartWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panChange: function(recognizer) {
        panChangeWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panEnd: function(recognizer) {
        panEndWasCalled = true;
        this.translate = recognizer.get('translation');
      },
    });

    application.OuterView = application.PinchPanView.extend({
      elementId: 'outer-div',
      childViews: ['nestedView'],

      nestedView: application.PinchPanView.extend({
      elementId: 'nested-div',
        classNames: ['nestedId'],

        tapStart: function(recognizer) {
          tapStartWasCalled = true;
        },

        tapCancel: function(recognizer) {
          tapCancelWasCalled = true;
        },

        tapEnd: function(recognizer) {
          tapEndWasCalled = true;
        },

        panOptions: {
          numberOfRequiredTouches: 2
        }
      })
    });

    SC.run(function() {
      outerdiv = application.OuterView.create();
      outerdiv.append();
    });

  },

  teardown: function() {
    application.destroy();
  }
});

test("Tap on the nested div", function() {

  // ====================================
  // Make it start

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  var gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 3, 'should be three gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'tap should be started');
      break;
    }
  }

  ok(tapStartWasCalled, 'tap start should have been called');

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pinch should be ended');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pan should be ended');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'tap should be ended');
      break;
    }
  }

  ok(tapEndWasCalled, 'tap end should have been called');
});

test("Simultaneous pinch and pan on the outer div", function() {

  // ====================================
  // Make it possible

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  // ====================================
  // Start with pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 20
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 20
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 2, 'should be two gestures defined');

  if (get(gestures[0], 'name') === 'pinch') {
    equals(get(gestures[0], 'state'), SC.Gesture.POSSIBLE, 'pinch should be possible');
    equals(get(gestures[1], 'state'), SC.Gesture.BEGAN, 'pan should have started');
  } 
  else if (get(gestures[0], 'name') === 'pan') {
    equals(get(gestures[0], 'state'), SC.Gesture.BEGAN, 'pinch should be possible');
    equals(get(gestures[1], 'state'), SC.Gesture.POSSIBLE, 'pan should have started');
  }

  ok(panStartWasCalled, "Pan start was called");
  equals(outerdiv.translate.x,10,'move right 5px');
  equals(outerdiv.translate.y,10,'move down 10px');

  // ===================================
  // Pan and pinch simultaneously

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 30
      },
      {
        identifier: 1,
        pageX: 40,
        pageY: 30
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 2, 'should be two gestures defined');

  // I don't know what order they're in
  if (get(gestures[0], 'name') === 'pinch') {
    equals(get(gestures[0], 'state'), SC.Gesture.BEGAN, 'pinch should be possible');
    equals(get(gestures[1], 'state'), SC.Gesture.CHANGED, 'pan should have started');
  } 
  else if (get(gestures[0], 'name') === 'pan') {
    equals(get(gestures[0], 'state'), SC.Gesture.CHANGED, 'pinch should be possible');
    equals(get(gestures[1], 'state'), SC.Gesture.BEGAN, 'pan should have started');
  }

  ok(panChangeWasCalled, "panChange was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equals(outerdiv.translate.x,25,'move right another 10px');
  equals(outerdiv.translate.y,20,'move down another 10px');

  equals(outerdiv.scale,2,'double the scale');
});

test("one finger down on nested one, other on outer", function() {

  // ====================================
  // Put first finger down on nested div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  var gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 3, 'should be three gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'tap should be started');
      break;
    }
  }

  ok(tapStartWasCalled, 'tap start should have been called');

  // ====================================
  // put second finger on outer div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 1,
        pageX: 10,
        pageY: 20
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 2, 'should be two gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.POSSIBLE, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.POSSIBLE, 'pan should be waiting for touches');
      break;
    }
  }
  
  // ====================================
  // pinch and pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 5
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 25
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  equals(gestures.length, 2, 'should be two gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'pan should be waiting for touches');
      break;
    }
  }

  ok(panStartWasCalled, "panStart was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equals(outerdiv.translate.x,10,'move right another 10px');
  equals(outerdiv.translate.y,0,'no y axis change');

  equals(outerdiv.scale,2,'double the scale');

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pinch should be ended');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pan should be ended');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'tap should be ended');
      break;
    }
  }

});

test("one finger down on container view, other on nested view", function() {

  // ====================================
  // Put first finger down on nested div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 2, 'should be two gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
    }
  }

  // ====================================
  // put second finger on nested div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 1,
        pageX: 10,
        pageY: 20
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  var gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equals(gestures.length, 3, 'should be three gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.POSSIBLE, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.POSSIBLE, 'pan should be waiting for touches');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.POSSIBLE, 'tap should be possible');
      break;
    }
  }
  
  // ====================================
  // pinch and pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 5
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 25
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  equals(gestures.length, 2, 'should be two gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.BEGAN, 'pan should be waiting for touches');
      break;
    }
  }

  ok(panStartWasCalled, "panStart was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equals(outerdiv.translate.x,10,'move right another 10px');
  equals(outerdiv.translate.y,0,'no y axis change');

  equals(outerdiv.scale,2,'double the scale');

  equals(tapStartWasCalled, false, 'tapStart should not have been called');
  equals(tapEndWasCalled, false, 'tapEnd should not have been called');
  equals(tapCancelWasCalled, false, 'tapCancel should not have been called');

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for (var i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i], 'name'){
      case 'pinch': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pinch should be ended');
      break;
      case 'pan': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'pan should be ended');
      break;
      case 'tap': 
        equals(get(gestures[i], 'state'), SC.Gesture.ENDED, 'tap should be ended');
      break;
    }
  }

});

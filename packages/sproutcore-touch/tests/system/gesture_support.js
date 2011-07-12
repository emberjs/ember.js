// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;
var application = null;

function generateTouchEvent(touches) {

}

module("Test Gesture Recognizer",{
  setup: function() {
    application = SC.Application.create();
    application.ready();
  },

  teardown: function() {
    application.destroy();
  }  
});

test("views can mix in SC.Gesturable", function() {
  var view = SC.View.create(SC.GestureSupport);
  ok(view.isGesturable);
  view.destroy();
});

test("gesturable views that implement pinch methods get a pinch recognizer", function() {
  var view = SC.View.create(SC.GestureSupport, {
    pinchStart: function(evt) {
      
    },      
    pinchChange: function(evt) {

    },      
    pinchEnd: function(evt) {

    }
  });

  var gestures = get(view, 'gestures'); 
  
  ok(gestures,'Should have a gestures property');
  equals(gestures.length,1,'Should have one gesture');
  ok(gestures[0] instanceof SC.PinchGestureRecognizer,'gesture should be pinch');
});

test("when finger touches inside, gesture should be in waiting state", function() {
  var numStart = 0;
  var view = SC.View.create(SC.GestureSupport, {
    elementId: 'gestureTest',

    pinchStart: function(evt) {
      console.log('pinchstart in view');
    },

    touchStart: function(evt) {
      console.log('touchStart in view');
      numStart++;
    },

    mouseDown: function(evt) {
      console.log('mouseDown');
      numStart++;
    }
  });

  SC.run(function(){
    view.append();
  });

  var gesture = get(view, 'gestures')[0]; 
  
  var touchEvent = {
    originalEvent: {
      targetTouches: [{
      }]
    }
  };

  view.$().trigger('touchstart');

  equals(numStart,1,"touchStart called once")

});

// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

function generateTouchEvent(touches) {

}

module("Test Gesture Recognizer",{
  setup: function() {

  },

  teardown: function() {

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
  var view = SC.View.create(SC.GestureSupport, {
    pinchStart: function(evt) {
      
    }
  });

  var gesture = get(view, 'gestures')[0]; 
  
  var touchEvent = {
    originalEvent: {
      targetTouches: [{
      }]
    }
  };
});

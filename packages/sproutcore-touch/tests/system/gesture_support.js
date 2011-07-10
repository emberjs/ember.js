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
  var view = SC.View.create(SC.Gesturable);
  ok(view.isGesturable);
  view.destroy();
});

test("gesturable views that implement pinch methods get a pinch recognizer", function() {
  var view = SC.View.extend(SC.Gesturable, {
    pinchStart: function(evt) {
      
    },      
    pinchChanged: function(evt) {

    },      
    pinchEnded: function(evt) {

    }
  });

  var gestures = get(view, 'gestures'); 
  
  //equals(gestures.length,1,'Should have one gesture (pinch)');
});

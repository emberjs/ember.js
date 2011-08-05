// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

module("SC.View extensions", {
  setup: function() {
    SC.Gestures.register('viewTestGesture',SC.Object.extend());
  },

  teardown: function() {
    SC.Gestures.unregister('viewTestGesture');
  }  
});

test("should detect gesture", function() {

  var view = SC.View.create({
    viewTestGestureStart: function() {

    },
    viewTestGestureChange: function() {

    },
    viewTestGestureEnd: function() {

    },
    viewTestGestureCancel: function() {

    }
  });

  var eventManager = get(view, 'eventManager');
  ok(eventManager,'view has an eventManager');

  var gestures = get(eventManager, 'gestures');
  equals(gestures.length,1,'gesture exists');
});

test("should apply options", function() {

  var view = SC.View.create({
    viewTestGestureOptions: {
      numberOfRequiredTouches: 4
    },

    viewTestGestureStart: function() {

    }
  });

  var eventManager = get(view, 'eventManager');
  ok(eventManager,'view has an eventManager');

  var gestures = get(eventManager, 'gestures');
  equals(gestures.length,1,'gesture exists');

  equals(gestures[0].numberOfRequiredTouches,4, "should apply options hash");
});

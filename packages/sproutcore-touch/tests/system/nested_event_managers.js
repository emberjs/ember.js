// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;
var application;

module("Nested event managers", {
  setup: function() {
    application = SC.Application.create();
  },

  teardown: function() {
    application.destroy();
  }
});

test("Nested event managers should get called appropriately", function() {

  SC.Gestures.register('nestedEventManagerTestGesture',SC.Gesture.extend({
    touchStart: function(evt, view, manager) {
      this.notifyViewOfGestureEvent(view, 'nestedEventManagerTestGestureStart');
      manager.redispatchEventToView(view,'touchstart');
    }
  }));

  SC.Gestures.register('nestedViewTestGesture',SC.Gesture.extend({
    touchStart: function(evt, view, manager) {
      this.notifyViewOfGestureEvent(view, 'nestedViewTestGestureStart');
      manager.redispatchEventToView(view,'touchstart');
    }
  }));

  var callNumber = 0;

  var view = SC.ContainerView.create({

    childViews: ['nestedView'],

    nestedView: SC.View.extend({
      elementId: 'nestedTestView',

      nestedViewTestGestureStart: function() {
        equals(callNumber,0,'nested manager called first');
        callNumber++;
      },

      touchStart: function() {
        equals(callNumber,1,'nested view called second');
        callNumber++;
      }
    }),

    nestedEventManagerTestGestureStart: function() {
      equals(callNumber,2,'parent manager called third');
      callNumber++;
    },

    touchStart: function() {
      equals(callNumber,3,'parent view called fourth');
      callNumber++;
    }
  });

  SC.run(function(){
    view.append();
  });

  var gestures = get(get(view, 'eventManager'), 'gestures');

  ok(gestures);
  equals(gestures.length,1);

  $('#nestedTestView').trigger('touchstart');
  SC.Gestures.unregister('nestedViewTestGesture');
  SC.Gestures.unregister('nestedEventManagerTestGestureStart');

});


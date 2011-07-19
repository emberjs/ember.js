// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

var application;
var manager;
var numStart, numMove, numEnd, numCancel;

var gesture = SC.Object.extend({
  touchStart: function(evt, view, manager) {
    numStart++;            
    if (view) manager.redispatchEventToView(view, 'touchstart')
  },
  touchMove: function(evt, view, manager) {
    numMove++;            
    if (view) manager.redispatchEventToView(view, 'touchmove')
  },
  touchEnd: function(evt, view, manager) {
    numEnd++;            
    if (view) manager.redispatchEventToView(view, 'touchend')
  },
  touchCancel: function(evt, view, manager) {
    numCancel++;            
    if (view) manager.redispatchEventToView(view, 'touchcancel')
  }
});

module("Gesture Manager",{
  setup: function() {
    numStart = numMove = numEnd = numCancel = 0;

    application = SC.Application.create();

    manager = SC.GestureManager.create({
      gestures: [
        gesture.create(),
        gesture.create()
      ]
    });
  },

  teardown: function() {
    manager.destroy();
    application.destroy();
  }
});

test("manager should re-dispatch events to all gestures", function() {
  manager.touchStart();
  equals(numStart,2,"dispatch start event to all gestures");

  manager.touchMove();
  equals(numMove,2,"dispatch move event to all gestures");

  manager.touchEnd();
  equals(numEnd,2,"dispatch end event to all gestures");

  manager.touchCancel();
  equals(numCancel,2,"dispatch cancel event to all gestures");
});

test("manager should re-dispatch event to view", function() {
  var numViewStart =  numViewMove = numViewEnd = numViewCancel = 0;

  var view = SC.View.create({
    eventManager: manager,

    touchStart: function(evt, view, manager) {
      numViewStart++;            
    },
    touchMove: function(evt, view, manager) {
      numViewMove++;            
    },
    touchEnd: function(evt, view, manager) {
      numViewEnd++;            
    },
    touchCancel: function(evt, view, manager) {
      numViewCancel++;            
    }
  });

  SC.run(function() {
    view.append();
  });

  view.$().trigger('touchstart');
  equals(numStart,2,"start event goes to event manager");
  equals(numViewStart,1,"redispatch start event back to view");

  view.$().trigger('touchmove');
  equals(numMove,2,"move event goes to event manager");
  equals(numViewMove,1,"redispatch move event back to view");

  view.$().trigger('touchend');
  equals(numEnd,2,"end event goes to event manager");
  equals(numViewEnd,1,"redispatch end event back to view");

  view.$().trigger('touchcancel');
  equals(numCancel,2,"cancel event goes to event manager");
  equals(numViewCancel,1,"redispatch cancel event back to view");
});

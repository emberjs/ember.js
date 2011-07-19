// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;
var set = SC.set, get = SC.get;

module("SC.EventDispatcher", {
  setup: function() {
    application = SC.Application.create();
  },

  teardown: function() {
    if (view) { view.destroy(); }
    application.destroy();
  }
});

test("should dispatch events to views", function() {
  var receivedEvent;
  var parentMouseDownCalled = 0;
  var childKeyDownCalled = 0;
  var parentKeyDownCalled = 0;

  view = SC.ContainerView.create({
    childViews: ['child'],

    child: SC.View.extend({
      render: function(buffer) {
        buffer.push('<span id="wot">ewot</span>');
      },

      keyDown: function(evt) {
        childKeyDownCalled++;

        return false;
      }
    }),

    render: function(buffer) {
      buffer.push('some <span id="awesome">awesome</span> content');
      this._super(buffer);
    },

    mouseDown: function(evt) {
      parentMouseDownCalled++;
      receivedEvent = evt;
    },

    keyDown: function(evt) {
      parentKeyDownCalled++;
    }
  });

  SC.run(function() {
    view.append();
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest SC.View");
  equals(parentMouseDownCalled, 1, "does not trigger the parent handlers twice because of browser bubbling");
  receivedEvent = null;

  SC.$('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest SC.View");

  SC.$('#wot').trigger('keydown');
  equals(childKeyDownCalled, 1, "calls keyDown on child view");
  equals(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});

test("should send change events up view hierarchy if view contains form elements", function() {
  var receivedEvent;
  view = SC.View.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = evt;
    }
  });

  SC.run(function() {
    view.append();
  });

  SC.$('#is-done').trigger('change');
  ok(receivedEvent, "calls change method when a child element is changed");
  equals(receivedEvent.target, SC.$('#is-done')[0], "target property is the element that was clicked");
});

test("events should stop propagating if the view is destroyed", function() {
  var parentViewReceived, receivedEvent;

  var parentView = SC.ContainerView.create({
    change: function(evt) {
      parentViewReceived = true;
    }
  });

  view = parentView.createChildView(SC.View, {
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = true;
      get(this, 'parentView').destroy();
    }
  });

  SC.get(parentView, 'childViews').pushObject(view);

  SC.run(function() {
    parentView.append();
  });

  ok(SC.$('#is-done').length, "precond - view is in the DOM");
  SC.$('#is-done').trigger('change');
  ok(!SC.$('#is-done').length, "precond - view is not in the DOM");
  ok(receivedEvent, "calls change method when a child element is changed");
  ok(!parentViewReceived, "parent view does not receive the event");
});

test("should not interfere with event propagation", function() {
  var receivedEvent;
  view = SC.View.create({
    render: function(buffer) {
      buffer.push('<div id="propagate-test-div"></div>')
    }
  });

  SC.run(function() {
    view.append();
  });

  SC.$(window).bind('click', function(evt) {
    receivedEvent = evt;
  });

  SC.$('#propagate-test-div').click();

  ok(receivedEvent, "allowed event to propagate outside SC")
  same(receivedEvent.target, SC.$('#propagate-test-div')[0], "target property is the element that was clicked");
});

test("should dispatch events to nearest event manager", function() {
  var receivedEvent=0;
  view = SC.ContainerView.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    eventManager: SC.Object.create({
      mouseDown: function() {
        receivedEvent++;
      }
    }),

    mouseDown: function() {}
  });

  SC.run(function() {
    view.append();
  });

  SC.$('#is-done').trigger('mousedown');
  equals(receivedEvent, 1, "event should go to manager and not view");
});

test("event manager should be able to re-dispatch events to view", function() {

  var receivedEvent=0;
  view = SC.ContainerView.create({
    elementId: 'containerView',

    eventManager: SC.Object.create({
      mouseDown: function(evt, view) {
        // Re-dispatch event when you get it.
        //
        // The second parameter tells the dispatcher
        // that this event has been handled. This
        // API will clearly need to be reworked since
        // multiple eventManagers in a single view 
        // hierarchy would break, but it shows that 
        // re-dispatching works
        view.$().trigger('mousedown',this);
      }
    }),

    childViews: ['child'],

    child: SC.View.extend({
      elementId: 'nestedView',

      mouseDown: function(evt) {
        receivedEvent++;
      }
    }),

    mouseDown: function(evt) {
      receivedEvent++;
    }
  });

  SC.run(function() { view.append(); });

  SC.$('#nestedView').trigger('mousedown');
  equals(receivedEvent, 2, "event should go to manager and not view");
});

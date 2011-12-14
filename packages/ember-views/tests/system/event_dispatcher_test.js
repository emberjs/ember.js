// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;
var set = Ember.set, get = Ember.get;

module("Ember.EventDispatcher", {
  setup: function() {
    application = Ember.Application.create();
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

  view = Ember.ContainerView.create({
    childViews: ['child'],

    child: Ember.View.extend({
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

  Ember.run(function() {
    view.append();
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");
  equals(parentMouseDownCalled, 1, "does not trigger the parent handlers twice because of browser bubbling");
  receivedEvent = null;

  Ember.$('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");

  Ember.$('#wot').trigger('keydown');
  equals(childKeyDownCalled, 1, "calls keyDown on child view");
  equals(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});

test("should send change events up view hierarchy if view contains form elements", function() {
  var receivedEvent;
  view = Ember.View.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = evt;
    }
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$('#is-done').trigger('change');
  ok(receivedEvent, "calls change method when a child element is changed");
  equals(receivedEvent.target, Ember.$('#is-done')[0], "target property is the element that was clicked");
});

test("events should stop propagating if the view is destroyed", function() {
  var parentViewReceived, receivedEvent;

  var parentView = Ember.ContainerView.create({
    change: function(evt) {
      parentViewReceived = true;
    }
  });

  view = parentView.createChildView(Ember.View, {
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = true;
      get(this, 'parentView').destroy();
    }
  });

  Ember.get(parentView, 'childViews').pushObject(view);

  Ember.run(function() {
    parentView.append();
  });

  ok(Ember.$('#is-done').length, "precond - view is in the DOM");
  Ember.$('#is-done').trigger('change');
  ok(!Ember.$('#is-done').length, "precond - view is not in the DOM");
  ok(receivedEvent, "calls change method when a child element is changed");
  ok(!parentViewReceived, "parent view does not receive the event");
});

test("should not interfere with event propagation", function() {
  var receivedEvent;
  view = Ember.View.create({
    render: function(buffer) {
      buffer.push('<div id="propagate-test-div"></div>');
    }
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$(window).bind('click', function(evt) {
    receivedEvent = evt;
  });

  Ember.$('#propagate-test-div').click();

  ok(receivedEvent, "allowed event to propagate outside Ember");
  same(receivedEvent.target, Ember.$('#propagate-test-div')[0], "target property is the element that was clicked");
});

test("should dispatch events to nearest event manager", function() {
  var receivedEvent=0;
  view = Ember.ContainerView.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    eventManager: Ember.Object.create({
      mouseDown: function() {
        receivedEvent++;
      }
    }),

    mouseDown: function() {}
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$('#is-done').trigger('mousedown');
  equals(receivedEvent, 1, "event should go to manager and not view");
});

test("event manager should be able to re-dispatch events to view", function() {

  var receivedEvent=0;
  view = Ember.ContainerView.create({
    elementId: 'containerView',

    eventManager: Ember.Object.create({
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

    child: Ember.View.extend({
      elementId: 'nestedView',

      mouseDown: function(evt) {
        receivedEvent++;
      }
    }),

    mouseDown: function(evt) {
      receivedEvent++;
    }
  });

  Ember.run(function() { view.append(); });

  Ember.$('#nestedView').trigger('mousedown');
  equals(receivedEvent, 2, "event should go to manager and not view");
});

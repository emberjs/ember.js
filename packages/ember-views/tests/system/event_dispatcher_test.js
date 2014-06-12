import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";

import EmberObject from "ember-runtime/system/object";

import jQuery from "ember-views/system/jquery";
import View from "ember-views/views/view";
import EventDispatcher from "ember-views/system/event_dispatcher";
import ContainerView from "ember-views/views/container_view";

var view;
var dispatcher;

QUnit.module("EventDispatcher", {
  setup: function() {
    run(function() {
      dispatcher = EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

test("should dispatch events to views", function() {
  var receivedEvent;
  var parentMouseDownCalled = 0;
  var childKeyDownCalled = 0;
  var parentKeyDownCalled = 0;

  view = ContainerView.createWithMixins({
    childViews: ['child'],

    child: View.extend({
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

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest View");
  equal(parentMouseDownCalled, 1, "does not trigger the parent handlers twice because of browser bubbling");
  receivedEvent = null;

  jQuery('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest View");

  jQuery('#wot').trigger('keydown');
  equal(childKeyDownCalled, 1, "calls keyDown on child view");
  equal(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});

test("should not dispatch events to views not inDOM", function() {
  var receivedEvent;

  view = View.createWithMixins({
    render: function(buffer) {
      buffer.push('some <span id="awesome">awesome</span> content');
      this._super(buffer);
    },

    mouseDown: function(evt) {
      receivedEvent = evt;
    }
  });

  run(function() {
    view.append();
  });

  var $element = view.$();

  run(function() {
    view.set('element', null); // Force into preRender
  });

  $element.trigger('mousedown');

  ok(!receivedEvent, "does not pass event to associated event method");
  receivedEvent = null;

  $element.find('span#awesome').trigger('mousedown');
  ok(!receivedEvent, "event does not bubble up to nearest View");
  receivedEvent = null;

  // Cleanup
  $element.remove();
});

test("should send change events up view hierarchy if view contains form elements", function() {
  var receivedEvent;
  view = View.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = evt;
    }
  });

  run(function() {
    view.append();
  });

  jQuery('#is-done').trigger('change');
  ok(receivedEvent, "calls change method when a child element is changed");
  equal(receivedEvent.target, jQuery('#is-done')[0], "target property is the element that was clicked");
});

test("events should stop propagating if the view is destroyed", function() {
  var parentViewReceived, receivedEvent;

  var parentView = ContainerView.create({
    change: function(evt) {
      parentViewReceived = true;
    }
  });

  view = parentView.createChildView(View, {
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = true;
      var self = this;
      run(function() {
        get(self, 'parentView').destroy();
      });
    }
  });

  parentView.pushObject(view);

  run(function() {
    parentView.append();
  });

  ok(jQuery('#is-done').length, "precond - view is in the DOM");
  jQuery('#is-done').trigger('change');
  ok(!jQuery('#is-done').length, "precond - view is not in the DOM");
  ok(receivedEvent, "calls change method when a child element is changed");
  ok(!parentViewReceived, "parent view does not receive the event");
});

test("should not interfere with event propagation", function() {
  var receivedEvent;
  view = View.create({
    render: function(buffer) {
      buffer.push('<div id="propagate-test-div"></div>');
    }
  });

  run(function() {
    view.append();
  });

  jQuery(window).bind('click', function(evt) {
    receivedEvent = evt;
  });

  jQuery('#propagate-test-div').click();

  ok(receivedEvent, "allowed event to propagate outside Ember");
  deepEqual(receivedEvent.target, jQuery('#propagate-test-div')[0], "target property is the element that was clicked");
});

test("should dispatch events to nearest event manager", function() {
  var receivedEvent=0;
  view = ContainerView.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    eventManager: EmberObject.create({
      mouseDown: function() {
        receivedEvent++;
      }
    }),

    mouseDown: function() {}
  });

  run(function() {
    view.append();
  });

  jQuery('#is-done').trigger('mousedown');
  equal(receivedEvent, 1, "event should go to manager and not view");
});

test("event manager should be able to re-dispatch events to view", function() {

  var receivedEvent=0;
  view = ContainerView.createWithMixins({
    elementId: 'containerView',

    eventManager: EmberObject.create({
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

    child: View.extend({
      elementId: 'nestedView',

      mouseDown: function(evt) {
        receivedEvent++;
      }
    }),

    mouseDown: function(evt) {
      receivedEvent++;
    }
  });

  run(function() { view.append(); });

  jQuery('#nestedView').trigger('mousedown');
  equal(receivedEvent, 2, "event should go to manager and not view");
});

test("event handlers should be wrapped in a run loop", function() {
  expect(1);

  view = View.createWithMixins({
    elementId: 'test-view',

    eventManager: EmberObject.create({
      mouseDown: function() {
        ok(run.currentRunLoop, 'a run loop should have started');
      }
    })
  });

  run(function() { view.append(); });

  jQuery('#test-view').trigger('mousedown');
});

QUnit.module("EventDispatcher#setup", {
  setup: function() {
    run(function() {
      dispatcher = EventDispatcher.create({
        rootElement: "#qunit-fixture"
      });
    });
  },

  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

test("additional events which should be listened on can be passed", function () {
  expect(1);

  run(function () {
    dispatcher.setup({ myevent: "myEvent" });

    view = View.create({
      elementId: "leView",
      myEvent: function() {
        ok(true, "custom event has been triggered");
      }
    }).appendTo( dispatcher.get("rootElement") );
  });

  jQuery("#leView").trigger("myevent");
});

test("additional events and rootElement can be specified", function () {
  expect(3);

  jQuery("#qunit-fixture").append("<div class='custom-root'></div>");

  run(function () {
    dispatcher.setup({ myevent: "myEvent" }, ".custom-root");

    view = View.create({
      elementId: "leView",
      myEvent: function() {
        ok(true, "custom event has been triggered");
      }
    }).appendTo( dispatcher.get("rootElement") );
  });

  ok(jQuery(".custom-root").hasClass("ember-application"), "the custom rootElement is used");
  equal(dispatcher.get("rootElement"), ".custom-root", "the rootElement is updated");

  jQuery("#leView").trigger("myevent");
});

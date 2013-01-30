var view;
var dispatcher;
var set = Ember.set, get = Ember.get;

module("Ember.EventDispatcher", {
  setup: function() {
    Ember.run(function() {
      dispatcher = Ember.EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown: function() {
    Ember.run(function() {
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

  view = Ember.ContainerView.createWithMixins({
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
    view.appendTo('#qunit-fixture');
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");
  equal(parentMouseDownCalled, 1, "does not trigger the parent handlers twice because of browser bubbling");
  receivedEvent = null;

  Ember.$('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");

  Ember.$('#wot').trigger('keydown');
  equal(childKeyDownCalled, 1, "calls keyDown on child view");
  equal(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});

test("should not dispatch events to views not inDOM", function() {
  var receivedEvent;

  view = Ember.View.createWithMixins({
    render: function(buffer) {
      buffer.push('some <span id="awesome">awesome</span> content');
      this._super(buffer);
    },

    mouseDown: function(evt) {
      receivedEvent = evt;
    }
  });

  Ember.run(function() {
    view.append();
  });

  var $element = view.$();

  Ember.run(function() {
    view.set('element', null); // Force into preRender
  });

  $element.trigger('mousedown');

  ok(!receivedEvent, "does not pass event to associated event method");
  receivedEvent = null;

  $element.find('span#awesome').trigger('mousedown');
  ok(!receivedEvent, "event does not bubble up to nearest Ember.View");
  receivedEvent = null;

  // Cleanup
  $element.remove();
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
  equal(receivedEvent.target, Ember.$('#is-done')[0], "target property is the element that was clicked");
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
      var self = this;
      Ember.run(function() {
        get(self, 'parentView').destroy();
      });
    }
  });

  parentView.pushObject(view);

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
  deepEqual(receivedEvent.target, Ember.$('#propagate-test-div')[0], "target property is the element that was clicked");
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
  equal(receivedEvent, 1, "event should go to manager and not view");
});

test("event manager should be able to re-dispatch events to view", function() {

  var receivedEvent=0;
  view = Ember.ContainerView.createWithMixins({
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
  equal(receivedEvent, 2, "event should go to manager and not view");
});

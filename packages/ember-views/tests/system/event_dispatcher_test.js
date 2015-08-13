import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';

import EmberObject from 'ember-runtime/system/object';

import jQuery from 'ember-views/system/jquery';
import View from 'ember-views/views/view';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import ContainerView from 'ember-views/views/container_view';
import compile from 'ember-template-compiler/system/compile';
import isEnabled from 'ember-metal/features';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import { subscribe, unsubscribe } from 'ember-metal/instrumentation';

var view, originalViewKeyword;
var dispatcher;

QUnit.module('EventDispatcher', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    run(function() {
      dispatcher = EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should dispatch events to views', function() {
  var receivedEvent;
  var parentMouseDownCalled = 0;
  var childKeyDownCalled = 0;
  var parentKeyDownCalled = 0;

  var childView = View.extend({
    keyDown(evt) {
      childKeyDownCalled++;

      return false;
    }
  }).create({
    template: compile('<span id="wot">ewot</span>')
  });

  view = View.extend({
    mouseDown(evt) {
      parentMouseDownCalled++;
      receivedEvent = evt;
    },

    keyDown(evt) {
      parentKeyDownCalled++;
    }
  }).create({
    template: compile('some <span id="awesome">awesome</span> content {{view view.childView}}'),
    childView: childView
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, 'passes event to associated event method');
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, 'event bubbles up to nearest View');
  equal(parentMouseDownCalled, 1, 'does not trigger the parent handlers twice because of browser bubbling');
  receivedEvent = null;

  jQuery('#wot').trigger('mousedown');
  ok(receivedEvent, 'event bubbles up to nearest View');

  jQuery('#wot').trigger('keydown');
  equal(childKeyDownCalled, 1, 'calls keyDown on child view');
  equal(parentKeyDownCalled, 0, 'does not call keyDown on parent if child handles event');
});

if (isEnabled('ember-improved-instrumentation')) {
  QUnit.test('should instrument triggered events', function() {
    let clicked = 0;
    view = View.extend({
      click(evt) {
        clicked++;
      },

      template: compile('<p>hello</p>')
    }).create();

    run(view, 'appendTo', '#qunit-fixture');

    view.$().trigger('click');

    equal(clicked, 1, 'precond - The click handler was invoked');

    let clickInstrumented = 0;
    let clickSubscriber = subscribe('interaction.click', {
      before() {
        clickInstrumented++;
        equal(clicked, 1, 'invoked before event is handled');
      },
      after() {
        clickInstrumented++;
        equal(clicked, 2, 'invoked after event is handled');
      }
    });

    let keypressInstrumented = 0;
    let keypressSubscriber = subscribe('interaction.keypress', {
      before() {
        keypressInstrumented++;
      },
      after() {
        keypressInstrumented++;
      }
    });

    try {
      view.$().trigger('click');
      view.$().trigger('change');
      equal(clicked, 2, 'precond - The click handler was invoked');
      equal(clickInstrumented, 2, 'The click was instrumented');
      strictEqual(keypressInstrumented, 0, 'The keypress was not instrumented');
    } finally {
      unsubscribe(clickSubscriber);
      unsubscribe(keypressSubscriber);
    }
  });
}

QUnit.test('should not dispatch events to views not inDOM', function() {
  var receivedEvent;

  view = View.extend({
    mouseDown(evt) {
      receivedEvent = evt;
    }
  }).create({
    template: compile('some <span id="awesome">awesome</span> content')
  });

  run(function() {
    view.append();
  });

  var $element = view.$();

  run(function() {
    // TODO change this test not to use private API
    // Force into preRender
    view.renderer.remove(view, false, true);
  });

  $element.trigger('mousedown');

  ok(!receivedEvent, 'does not pass event to associated event method');
  receivedEvent = null;

  $element.find('span#awesome').trigger('mousedown');
  ok(!receivedEvent, 'event does not bubble up to nearest View');
  receivedEvent = null;

  // Cleanup
  $element.remove();
});

QUnit.test('should send change events up view hierarchy if view contains form elements', function() {
  var receivedEvent;
  view = View.create({
    template: compile('<input id="is-done" type="checkbox">'),

    change(evt) {
      receivedEvent = evt;
    }
  });

  run(function() {
    view.append();
  });

  jQuery('#is-done').trigger('change');
  ok(receivedEvent, 'calls change method when a child element is changed');
  equal(receivedEvent.target, jQuery('#is-done')[0], 'target property is the element that was clicked');
});

QUnit.test('events should stop propagating if the view is destroyed', function() {
  var parentViewReceived, receivedEvent;

  var parentView = ContainerView.create({
    change(evt) {
      parentViewReceived = true;
    }
  });

  view = parentView.createChildView(View, {
    template: compile('<input id="is-done" type="checkbox">'),

    change(evt) {
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

  ok(jQuery('#is-done').length, 'precond - view is in the DOM');
  jQuery('#is-done').trigger('change');
  ok(!jQuery('#is-done').length, 'precond - view is not in the DOM');
  ok(receivedEvent, 'calls change method when a child element is changed');
  ok(!parentViewReceived, 'parent view does not receive the event');
});

QUnit.test('should dispatch events to nearest event manager', function() {
  var receivedEvent = 0;
  view = View.create({
    template: compile('<input id="is-done" type="checkbox">'),

    eventManager: EmberObject.create({
      mouseDown() {
        receivedEvent++;
      }
    }),

    mouseDown() {}
  });

  run(function() {
    view.append();
  });

  jQuery('#is-done').trigger('mousedown');
  equal(receivedEvent, 1, 'event should go to manager and not view');
});

QUnit.test('event manager should be able to re-dispatch events to view', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  var receivedEvent = 0;
  view = ContainerView.extend({

    eventManager: EmberObject.extend({
      mouseDown(evt, view) {
        // Re-dispatch event when you get it.
        //
        // The second parameter tells the dispatcher
        // that this event has been handled. This
        // API will clearly need to be reworked since
        // multiple eventManagers in a single view
        // hierarchy would break, but it shows that
        // re-dispatching works
        view.$().trigger('mousedown', this);
      }
    }).create(),

    child: View.extend({
      elementId: 'nestedView',

      mouseDown(evt) {
        receivedEvent++;
      }
    }),

    mouseDown(evt) {
      receivedEvent++;
    }
  }).create({
    elementId: 'containerView',
    childViews: ['child']
  });

  run(function() { view.append(); });

  jQuery('#nestedView').trigger('mousedown');
  equal(receivedEvent, 2, 'event should go to manager and not view');
});

QUnit.test('event handlers should be wrapped in a run loop', function() {
  expect(1);

  view = View.extend({
    eventManager: EmberObject.extend({
      mouseDown() {
        ok(run.currentRunLoop, 'a run loop should have started');
      }
    }).create()
  }).create({
    elementId: 'test-view'
  });

  run(function() { view.append(); });

  jQuery('#test-view').trigger('mousedown');
});

QUnit.module('EventDispatcher#setup', {
  setup() {
    run(function() {
      dispatcher = EventDispatcher.create({
        rootElement: '#qunit-fixture'
      });
    });
  },

  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

QUnit.test('additional events which should be listened on can be passed', function () {
  expect(1);

  run(function () {
    dispatcher.setup({ myevent: 'myEvent' });

    view = View.create({
      elementId: 'leView',
      myEvent() {
        ok(true, 'custom event has been triggered');
      }
    }).appendTo(dispatcher.get('rootElement'));
  });

  jQuery('#leView').trigger('myevent');
});

QUnit.test('additional events and rootElement can be specified', function () {
  expect(3);

  jQuery('#qunit-fixture').append('<div class=\'custom-root\'></div>');

  run(function () {
    dispatcher.setup({ myevent: 'myEvent' }, '.custom-root');

    view = View.create({
      elementId: 'leView',
      myEvent() {
        ok(true, 'custom event has been triggered');
      }
    }).appendTo(dispatcher.get('rootElement'));
  });

  ok(jQuery('.custom-root').hasClass('ember-application'), 'the custom rootElement is used');
  equal(dispatcher.get('rootElement'), '.custom-root', 'the rootElement is updated');

  jQuery('#leView').trigger('myevent');
});

QUnit.test('default events can be disabled via `customEvents`', function () {
  expect(1);

  run(function () {
    dispatcher.setup({
      click: null
    });

    view = View.create({
      elementId: 'leView',

      null() {
        // yes, at one point `click: null` made an event handler
        // for `click` that called `null` on the view
        ok(false, 'null event has been triggered');
      },

      click() {
        ok(false, 'click event has been triggered');
      },

      doubleClick() {
        ok(true, 'good event was still triggered');
      }
    }).appendTo(dispatcher.get('rootElement'));
  });

  jQuery('#leView').trigger('click');
  jQuery('#leView').trigger('dblclick');
});

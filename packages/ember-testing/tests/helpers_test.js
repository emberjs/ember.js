import Ember from 'ember-metal/core';
import Route from 'ember-routing/system/route';
import Controller from 'ember-runtime/controllers/controller';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import RSVP from 'ember-runtime/ext/rsvp';
import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';

import Test from 'ember-testing/test';
import 'ember-testing/helpers';  // ensure that the helpers are loaded
import 'ember-testing/initializers'; // ensure the initializer is setup
import setupForTesting from 'ember-testing/setup_for_testing';
import EmberRouter from 'ember-routing/system/router';
import EmberRoute from 'ember-routing/system/route';
import EmberApplication from 'ember-application/system/application';
import compile from 'ember-template-compiler/system/compile';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import isEnabled from 'ember-metal/features';

var App;
var instance;
var originalAdapter = Test.adapter;
var originalViewKeyword;

function cleanup() {
  // Teardown setupForTesting

  Test.adapter = originalAdapter;
  run(function() {
    jQuery(document).off('ajaxSend');
    jQuery(document).off('ajaxComplete');
  });
  Test.pendingAjaxRequests = null;
  Test.waiters = null;

  // Other cleanup

  if (instance) {
    run(instance, 'destroy');
    instance = null;
  }

  if (App) {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }

  Ember.TEMPLATES = {};
}

function assertHelpers(application, helperContainer, expected) {
  if (!helperContainer) { helperContainer = window; }
  if (expected === undefined) { expected = true; }

  function checkHelperPresent(helper, expected) {
    if (!application.isApplicationInstance) {
      var presentInHelperContainer = !!helperContainer[helper];
      ok(presentInHelperContainer === expected, 'Expected \'' + helper + '\' to be present in the helper container (defaults to window).');
    }

    var presentInTestHelpers = !!(application.testHelpers && application.testHelpers[helper]);
    ok(presentInTestHelpers === expected, 'Expected \'' + helper + '\' to be present in App.testHelpers.');
  }

  checkHelperPresent('visit', expected);
  checkHelperPresent('click', expected);
  checkHelperPresent('keyEvent', expected);
  checkHelperPresent('fillIn', expected);
  checkHelperPresent('wait', expected);
  checkHelperPresent('triggerEvent', expected);
}

function assertNoHelpers(application, helperContainer) {
  assertHelpers(application, helperContainer, false);
}

function currentRouteName(app) {
  return app.testHelpers.currentRouteName();
}

function currentPath(app) {
  return app.testHelpers.currentPath();
}

function currentURL(app) {
  return app.testHelpers.currentURL();
}

function setupApp() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();

    App.injectTestHelpers();
  });
}

QUnit.module('ember-testing: Helper setup', {
  setup() { cleanup(); },
  teardown() { cleanup(); }
});

function registerHelper() {
  Test.registerHelper('LeakyMcLeakLeak', function(app) {
  });
}

QUnit.test('Ember.Application#injectTestHelpers/#removeTestHelpers', function() {
  App = run(EmberApplication, EmberApplication.create);
  assertNoHelpers(App);

  registerHelper();

  App.injectTestHelpers();
  assertHelpers(App);
  ok(Ember.Test.Promise.prototype.LeakyMcLeakLeak, 'helper in question SHOULD be present');

  App.removeTestHelpers();
  assertNoHelpers(App);

  equal(Ember.Test.Promise.prototype.LeakyMcLeakLeak, undefined, 'should NOT leak test promise extensions');
});

if (isEnabled('ember-testing-instances')) {
  QUnit.test('Ember.ApplicationInstance#injectTestHelpers/#removeTestHelpers', function() {
    App = run(EmberApplication, EmberApplication.create);
    instance = run(App, 'buildInstance');
    assertNoHelpers(instance);
    assertNoHelpers(App);

    registerHelper();

    instance.injectTestHelpers();
    assertHelpers(instance);
    assertNoHelpers(App);
    ok(instance.testHelpers.LeakyMcLeakLeak, 'helper in question SHOULD be present');

    instance.removeTestHelpers();
    assertNoHelpers(instance);
    ok(!instance.LeakyMcLeakLeak, 'helper in question SHOULD NOT be present');
  });

  QUnit.test('Ember.Application#buildTestInstance', function() {
    var MyApplication = EmberApplication.extend();

    run(function() {
      App = MyApplication.create({ autoboot: false });
      App.Router = EmberRouter.extend();
    });

    registerHelper();

    // Should register helpers on build
    instance = run(App, 'buildTestInstance');
    assertHelpers(instance);
    ok(instance.testHelpers.LeakyMcLeakLeak, 'helper in question SHOULD be present');

    // Should remove helpers on destroy
    run(instance, 'destroy');
    assertNoHelpers(instance);
    ok(!instance.testHelpers, 'helpers SHOULD NOT be present');

    instance = null;
  });
}

QUnit.test('Ember.Application#setupForTesting', function() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location, 'none');
});

QUnit.test('Ember.Application.setupForTesting sets the application to `testing`.', function() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App.testing, true, 'Application instance is set to testing.');
});

QUnit.test('Ember.Application.setupForTesting leaves the system in a deferred state.', function() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, 'App is in deferred state after setupForTesting.');
});

QUnit.test('App.reset() after Application.setupForTesting leaves the system in a deferred state.', function() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, 'App is in deferred state after setupForTesting.');

  App.reset();
  equal(App._readinessDeferrals, 1, 'App is in deferred state after setupForTesting.');
});

QUnit.test('Ember.Application#setupForTesting attaches ajax listeners', function() {
  var documentEvents;

  documentEvents = jQuery._data(document, 'events');

  if (!documentEvents) {
    documentEvents = {};
  }

  ok(documentEvents['ajaxSend'] === undefined, 'there are no ajaxSend listers setup prior to calling injectTestHelpers');
  ok(documentEvents['ajaxComplete'] === undefined, 'there are no ajaxComplete listers setup prior to calling injectTestHelpers');

  run(function() {
    setupForTesting();
  });

  documentEvents = jQuery._data(document, 'events');

  equal(documentEvents['ajaxSend'].length, 1, 'calling injectTestHelpers registers an ajaxSend handler');
  equal(documentEvents['ajaxComplete'].length, 1, 'calling injectTestHelpers registers an ajaxComplete handler');
});

QUnit.test('Ember.Application#setupForTesting attaches ajax listeners only once', function() {
  var documentEvents;

  documentEvents = jQuery._data(document, 'events');

  if (!documentEvents) {
    documentEvents = {};
  }

  ok(documentEvents['ajaxSend'] === undefined, 'there are no ajaxSend listeners setup prior to calling injectTestHelpers');
  ok(documentEvents['ajaxComplete'] === undefined, 'there are no ajaxComplete listeners setup prior to calling injectTestHelpers');

  run(function() {
    setupForTesting();
  });
  run(function() {
    setupForTesting();
  });

  documentEvents = jQuery._data(document, 'events');

  equal(documentEvents['ajaxSend'].length, 1, 'calling injectTestHelpers registers an ajaxSend handler');
  equal(documentEvents['ajaxComplete'].length, 1, 'calling injectTestHelpers registers an ajaxComplete handler');
});

QUnit.test('Ember.Application#injectTestHelpers calls callbacks registered with onInjectHelpers', function() {
  var injected = 0;

  Test.onInjectHelpers(function() {
    injected++;
  });

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(injected, 0, 'onInjectHelpers are not called before injectTestHelpers');

  App.injectTestHelpers();

  equal(injected, 1, 'onInjectHelpers are called after injectTestHelpers');
});

if (isEnabled('ember-testing-instances')) {
  QUnit.test('Ember.ApplicationInstance#injectTestHelpers calls callbacks registered with onInjectHelpers', function() {
    var injected = 0;

    Test.onInjectHelpers(function() {
      injected++;
    });

    run(function() {
      App = EmberApplication.create();
      instance = App.buildInstance();
    });

    equal(injected, 0, 'onInjectHelpers are not called before injectTestHelpers');

    instance.injectTestHelpers();

    equal(injected, 1, 'onInjectHelpers are called after injectTestHelpers');
  });
}

QUnit.test('Ember.Application#injectTestHelpers adds helpers to provided object.', function() {
  var helpers = {};

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers(helpers);
  assertHelpers(App, helpers);

  App.removeTestHelpers();
  assertNoHelpers(App, helpers);
});

QUnit.test('Ember.Application#removeTestHelpers resets the helperContainer\'s original values', function() {
  var helpers = { visit: 'snazzleflabber' };

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers(helpers);

  ok(helpers.visit !== 'snazzleflabber', 'helper added to container');
  App.removeTestHelpers();

  ok(helpers.visit === 'snazzleflabber', 'original value added back to container');
});

QUnit.module('ember-testing: Helper methods', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    setupApp();
  },
  teardown() {
    cleanup();
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('`wait` respects registerWaiters', function(assert) {
  assert.expect(3);

  let done = assert.async();

  var counter = 0;
  function waiter() {
    return ++counter > 2;
  }

  var other = 0;
  function otherWaiter() {
    return ++other > 2;
  }

  run(App, App.advanceReadiness);
  Test.registerWaiter(waiter);
  Test.registerWaiter(otherWaiter);

  App.testHelpers.wait()
    .then(function() {
      equal(waiter(), true, 'should not resolve until our waiter is ready');
      Test.unregisterWaiter(waiter);
      equal(Test.waiters.length, 1, 'should not leave the waiter registered');
      other = 0;
      return App.testHelpers.wait();
    })
    .then(function() {
      equal(otherWaiter(), true, 'other waiter is still registered');
    })
    .finally(done);
});

QUnit.test('`visit` advances readiness.', function() {
  expect(2);

  equal(App._readinessDeferrals, 1, 'App is in deferred state after setupForTesting.');

  return App.testHelpers.visit('/').then(function() {
    equal(App._readinessDeferrals, 0, 'App\'s readiness was advanced by visit.');
  });
});

QUnit.test('`wait` helper can be passed a resolution value', function() {
  expect(4);

  var promise, wait;

  promise = new RSVP.Promise(function(resolve) {
    run(null, resolve, 'promise');
  });

  run(App, App.advanceReadiness);

  wait = App.testHelpers.wait;

  return wait('text').then(function(val) {
    equal(val, 'text', 'can resolve to a string');
    return wait(1);
  }).then(function(val) {
    equal(val, 1, 'can resolve to an integer');
    return wait({ age: 10 });
  }).then(function(val) {
    deepEqual(val, { age: 10 }, 'can resolve to an object');
    return wait(promise);
  }).then(function(val) {
    equal(val, 'promise', 'can resolve to a promise resolution value');
  });
});

QUnit.test('`click` triggers appropriate events in order', function() {
  expect(5);

  var click, wait, events;

  App.IndexView = EmberView.extend({
    classNames: 'index-view',

    didInsertElement() {
      this.$().on('mousedown focusin mouseup click', function(e) {
        events.push(e.type);
      });
    },

    Checkbox: Ember.Checkbox.extend({
      click() {
        events.push('click:' + this.get('checked'));
      },

      change() {
        events.push('change:' + this.get('checked'));
      }
    })
  });

  Ember.TEMPLATES.index = compile('{{input type="text"}} {{view view.Checkbox}} {{textarea}} <div contenteditable="true"> </div>');

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-view');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'mouseup', 'click'],
      'fires events in order');
  }).then(function() {
    events = [];
    return click('.index-view input[type=text]');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on inputs');
  }).then(function() {
    events = [];
    return click('.index-view textarea');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on textareas');
  }).then(function() {
    events = [];
    return click('.index-view div');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on contenteditable');
  }).then(function() {
    // In IE (< 8), the change event only fires when the value changes before element focused.
    jQuery('.index-view input[type=checkbox]').focus();
    events = [];
    return click('.index-view input[type=checkbox]');
  }).then(function() {
    // i.e. mousedown, mouseup, change:true, click, click:true
    // Firefox differs so we can't assert the exact ordering here.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=843554.
    equal(events.length, 5, 'fires click and change on checkboxes');
  });
});

QUnit.test('`wait` waits for outstanding timers', function() {
  expect(1);

  var wait_done = false;

  run(App, App.advanceReadiness);

  run.later(this, function() {
    wait_done = true;
  }, 500);

  return App.testHelpers.wait().then(function() {
    equal(wait_done, true, 'should wait for the timer to be fired.');
  });
});


QUnit.test('`wait` respects registerWaiters with optional context', function() {
  expect(3);

  var obj = {
    counter: 0,
    ready() {
      return ++this.counter > 2;
    }
  };

  var other = 0;
  function otherWaiter() {
    return ++other > 2;
  }

  run(App, App.advanceReadiness);
  Test.registerWaiter(obj, obj.ready);
  Test.registerWaiter(otherWaiter);

  return App.testHelpers.wait().then(function() {
    equal(obj.ready(), true, 'should not resolve until our waiter is ready');
    Test.unregisterWaiter(obj, obj.ready);
    equal(Test.waiters.length, 1, 'should not leave the waiter registered');
    return App.testHelpers.wait();
  }).then(function() {
    equal(otherWaiter(), true, 'other waiter should still be registered');
  });
});

QUnit.test('`wait` does not error if routing has not begun', function() {
  expect(1);

  return App.testHelpers.wait().then(function() {
    ok(true, 'should not error without `visit`');
  });
});

QUnit.test('`triggerEvent accepts an optional options hash without context', function() {
  expect(3);

  var triggerEvent, wait, event;

  App.IndexView = EmberView.extend({
    template: compile('{{input type="text" id="scope" class="input"}}'),

    didInsertElement() {
      this.$('.input').on('blur change', function(e) {
        event = e;
      });
    }
  });

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait().then(function() {
    return triggerEvent('.input', 'blur', { keyCode: 13 });
  }).then(function() {
    equal(event.keyCode, 13, 'options were passed');
    equal(event.type, 'blur', 'correct event was triggered');
    equal(event.target.getAttribute('id'), 'scope', 'triggered on the correct element');
  });
});

QUnit.test('`triggerEvent can limit searching for a selector to a scope', function() {
  expect(2);

  var triggerEvent, wait, event;

  App.IndexView = EmberView.extend({
    template: compile('{{input type="text" id="outside-scope" class="input"}}<div id="limited">{{input type="text" id="inside-scope" class="input"}}</div>'),

    didInsertElement() {
      this.$('.input').on('blur change', function(e) {
        event = e;
      });
    }
  });

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait().then(function() {
    return triggerEvent('.input', '#limited', 'blur');
  }).then(function() {
    equal(event.type, 'blur', 'correct event was triggered');
    equal(event.target.getAttribute('id'), 'inside-scope', 'triggered on the correct element');
  });
});

QUnit.test('`triggerEvent` can be used to trigger arbitrary events', function() {
  expect(2);

  var triggerEvent, wait, event;

  App.IndexView = EmberView.extend({
    template: compile('{{input type="text" id="foo"}}'),

    didInsertElement() {
      this.$('#foo').on('blur change', function(e) {
        event = e;
      });
    }
  });

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait().then(function() {
    return triggerEvent('#foo', 'blur');
  }).then(function() {
    equal(event.type, 'blur', 'correct event was triggered');
    equal(event.target.getAttribute('id'), 'foo', 'triggered on the correct element');
  });
});

QUnit.test('`fillIn` takes context into consideration', function() {
  expect(2);
  var fillIn, find, visit, andThen, wait;

  App.IndexView = EmberView.extend({
    template: compile('<div id="parent">{{input type="text" id="first" class="current"}}</div>{{input type="text" id="second" class="current"}}')
  });

  run(App, App.advanceReadiness);

  fillIn = App.testHelpers.fillIn;
  find = App.testHelpers.find;
  visit = App.testHelpers.visit;
  andThen = App.testHelpers.andThen;
  wait = App.testHelpers.wait;

  visit('/');
  fillIn('.current', '#parent', 'current value');
  andThen(function() {
    equal(find('#first').val(), 'current value');
    equal(find('#second').val(), '');
  });

  return wait();
});

QUnit.test('`fillIn` focuses on the element', function() {
  expect(2);
  var fillIn, find, visit, andThen, wait;

  App.ApplicationRoute = Route.extend({
    actions: {
      wasFocused() {
        ok(true, 'focusIn event was triggered');
      }
    }
  });

  App.IndexView = EmberView.extend({
    template: compile('<div id="parent">{{input type="text" id="first" focus-in="wasFocused"}}</div>')
  });

  run(App, App.advanceReadiness);

  fillIn = App.testHelpers.fillIn;
  find = App.testHelpers.find;
  visit = App.testHelpers.visit;
  andThen = App.testHelpers.andThen;
  wait = App.testHelpers.wait;

  visit('/');
  fillIn('#first', 'current value');
  andThen(function() {
    equal(find('#first').val(), 'current value');
  });

  return wait();
});

QUnit.test('`fillIn` fires `input` and `change` events in the proper order', function() {
  expect(1);

  var fillIn, visit, andThen, wait;
  var events = [];
  App.IndexController = Controller.extend({
    actions: {
      oninputHandler(e) {
        events.push(e.type);
      },
      onchangeHandler(e) {
        events.push(e.type);
      }
    }
  });

  App.IndexView = EmberView.extend({
    template: compile('<input type="text" id="first" oninput={{action "oninputHandler"}} onchange={{action "onchangeHandler"}}>')
  });

  run(App, App.advanceReadiness);

  fillIn = App.testHelpers.fillIn;
  visit = App.testHelpers.visit;
  andThen = App.testHelpers.andThen;
  wait = App.testHelpers.wait;

  visit('/');
  fillIn('#first', 'current value');
  andThen(function() {
    deepEqual(events, ['input', 'change'], '`input` and `change` events are fired in the proper order');
  });

  return wait();
});

QUnit.test('`triggerEvent accepts an optional options hash and context', function() {
  expect(3);

  var triggerEvent, wait, event;

  App.IndexView = EmberView.extend({
    template: compile('{{input type="text" id="outside-scope" class="input"}}<div id="limited">{{input type="text" id="inside-scope" class="input"}}</div>'),

    didInsertElement() {
      this.$('.input').on('blur change', function(e) {
        event = e;
      });
    }
  });

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait()
    .then(function() {
      return triggerEvent('.input', '#limited', 'blur', { keyCode: 13 });
    })
    .then(function() {
      equal(event.keyCode, 13, 'options were passed');
      equal(event.type, 'blur', 'correct event was triggered');
      equal(event.target.getAttribute('id'), 'inside-scope', 'triggered on the correct element');
    });
});

QUnit.module('ember-testing debugging helpers', {
  setup() {
    setupApp();

    run(function() {
      App.Router = EmberRouter.extend({
        location: 'none'
      });
    });

    run(App, 'advanceReadiness');
  },

  teardown() {
    cleanup();
  }
});

QUnit.test('pauseTest pauses', function() {
  expect(1);
  function fakeAdapterAsyncStart() {
    ok(true, 'Async start should be called');
  }

  Test.adapter.asyncStart = fakeAdapterAsyncStart;

  App.testHelpers.pauseTest();
});

QUnit.module('ember-testing routing helpers', {
  setup() {
    run(function() {
      App = EmberApplication.create();
      App.setupForTesting();

      App.injectTestHelpers();

      App.Router = EmberRouter.extend({
        location: 'none'
      });

      App.Router.map(function() {
        this.route('posts', { resetNamespace: true }, function() {
          this.route('new');
        });
      });
    });

    run(App, 'advanceReadiness');
  },

  teardown() {
    cleanup();
  }
});

QUnit.test('currentRouteName for \'/\'', function() {
  expect(3);

  return App.testHelpers.visit('/').then(function() {
    equal(App.testHelpers.currentRouteName(), 'index', 'should equal \'index\'.');
    equal(App.testHelpers.currentPath(), 'index', 'should equal \'index\'.');
    equal(App.testHelpers.currentURL(), '/', 'should equal \'/\'.');
  });
});


QUnit.test('currentRouteName for \'/posts\'', function() {
  expect(3);

  return App.testHelpers.visit('/posts').then(function() {
    equal(App.testHelpers.currentRouteName(), 'posts.index', 'should equal \'posts.index\'.');
    equal(App.testHelpers.currentPath(), 'posts.index', 'should equal \'posts.index\'.');
    equal(App.testHelpers.currentURL(), '/posts', 'should equal \'/posts\'.');
  });
});

QUnit.test('currentRouteName for \'/posts/new\'', function() {
  expect(3);

  return App.testHelpers.visit('/posts/new').then(function() {
    equal(App.testHelpers.currentRouteName(), 'posts.new', 'should equal \'posts.new\'.');
    equal(App.testHelpers.currentPath(), 'posts.new', 'should equal \'posts.new\'.');
    equal(App.testHelpers.currentURL(), '/posts/new', 'should equal \'/posts/new\'.');
  });
});

if (isEnabled('ember-testing-instances')) {
  QUnit.module('ember-testing routing helpers - instance', {
    setup() {
      run(function() {
        App = EmberApplication.create({ autoboot: false });

        App.Router = EmberRouter.extend();
        App.Router.map(function() {
          this.route('posts', { resetNamespace: true }, function() {
            this.route('new');
          });
        });

        instance = App.buildTestInstance();
      });
    },

    teardown() {
      cleanup();
    }
  });

  QUnit.test('currentRouteName for \'/\'', function() {
    expect(3);

    instance.testHelpers.visit('/').then(function() {
      equal(instance.testHelpers.currentRouteName(), 'index', 'should equal \'index\'.');
      equal(instance.testHelpers.currentPath(), 'index', 'should equal \'index\'.');
      equal(instance.testHelpers.currentURL(), '/', 'should equal \'/\'.');
    });
  });

  QUnit.test('currentRouteName for \'/posts\'', function() {
    expect(3);

    instance.testHelpers.visit('/posts').then(function() {
      equal(instance.testHelpers.currentRouteName(), 'posts.index', 'should equal \'posts.index\'.');
      equal(instance.testHelpers.currentPath(), 'posts.index', 'should equal \'posts.index\'.');
      equal(instance.testHelpers.currentURL(), '/posts', 'should equal \'/posts\'.');
    });
  });

  QUnit.test('currentRouteName for \'/posts/new\'', function() {
    expect(3);

    instance.testHelpers.visit('/posts/new').then(function() {
      equal(instance.testHelpers.currentRouteName(), 'posts.new', 'should equal \'posts.new\'.');
      equal(instance.testHelpers.currentPath(), 'posts.new', 'should equal \'posts.new\'.');
      equal(instance.testHelpers.currentURL(), '/posts/new', 'should equal \'/posts/new\'.');
    });
  });
}

QUnit.module('ember-testing pendingAjaxRequests', {
  setup() {
    setupApp();
  },

  teardown() {
    cleanup();
  }
});

QUnit.test('pendingAjaxRequests is maintained for ajaxSend and ajaxComplete events', function() {
  equal(Test.pendingAjaxRequests, 0);
  var xhr = { some: 'xhr' };
  jQuery(document).trigger('ajaxSend', xhr);
  equal(Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');
  jQuery(document).trigger('ajaxComplete', xhr);
  equal(Test.pendingAjaxRequests, 0, 'Ember.Test.pendingAjaxRequests was decremented');
});

QUnit.test('pendingAjaxRequests is ignores ajaxComplete events from past setupForTesting calls', function() {
  equal(Test.pendingAjaxRequests, 0);
  var xhr = { some: 'xhr' };
  jQuery(document).trigger('ajaxSend', xhr);
  equal(Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');

  run(function() {
    setupForTesting();
  });
  equal(Test.pendingAjaxRequests, 0, 'Ember.Test.pendingAjaxRequests was reset');

  var altXhr = { some: 'more xhr' };
  jQuery(document).trigger('ajaxSend', altXhr);
  equal(Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');
  jQuery(document).trigger('ajaxComplete', xhr);
  equal(Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests is not impressed with your unexpected complete');
});

QUnit.test('pendingAjaxRequests is reset by setupForTesting', function() {
  Test.pendingAjaxRequests = 1;
  run(function() {
    setupForTesting();
  });
  equal(Test.pendingAjaxRequests, 0, 'pendingAjaxRequests is reset');
});

QUnit.module('ember-testing async router', {
  setup() {
    cleanup();

    run(function() {
      App = EmberApplication.create();
      App.Router = EmberRouter.extend({
        location: 'none'
      });

      App.Router.map(function() {
        this.route('user', { resetNamespace: true }, function() {
          this.route('profile');
          this.route('edit');
        });
      });

      App.UserRoute = EmberRoute.extend({
        model() {
          return resolveLater();
        }
      });

      App.UserProfileRoute = EmberRoute.extend({
        beforeModel() {
          var self = this;
          return resolveLater().then(function() {
            self.transitionTo('user.edit');
          });
        }
      });

      // Emulates a long-running unscheduled async operation.
      function resolveLater() {
        var promise;

        run(function() {
          promise = new RSVP.Promise(function(resolve) {
            // The wait() helper has a 10ms tick. We should resolve() after at least one tick
            // to test whether wait() held off while the async router was still loading. 20ms
            // should be enough.
            setTimeout(function() {
              run(function() {
                resolve(EmberObject.create({ firstName: 'Tom' }));
              });
            }, 20);
          });
        });

        return promise;
      }

      App.setupForTesting();
    });

    App.injectTestHelpers();
    run(App, 'advanceReadiness');
  },

  teardown() {
    cleanup();
  }
});

QUnit.test('currentRouteName for \'/user\'', function() {
  expect(4);

  return App.testHelpers.visit('/user').then(function() {
    equal(currentRouteName(App), 'user.index', 'should equal \'user.index\'.');
    equal(currentPath(App), 'user.index', 'should equal \'user.index\'.');
    equal(currentURL(App), '/user', 'should equal \'/user\'.');
    equal(App.__container__.lookup('route:user').get('controller.model.firstName'), 'Tom', 'should equal \'Tom\'.');
  });
});

QUnit.test('currentRouteName for \'/user/profile\'', function() {
  expect(4);

  return App.testHelpers.visit('/user/profile').then(function() {
    equal(currentRouteName(App), 'user.edit', 'should equal \'user.edit\'.');
    equal(currentPath(App), 'user.edit', 'should equal \'user.edit\'.');
    equal(currentURL(App), '/user/edit', 'should equal \'/user/edit\'.');
    equal(App.__container__.lookup('route:user').get('controller.model.firstName'), 'Tom', 'should equal \'Tom\'.');
  });
});

var originalVisitHelper, originalFindHelper, originalWaitHelper;

QUnit.module('can override built-in helpers', {
  setup() {
    originalVisitHelper = Test._helpers.visit;
    originalFindHelper  = Test._helpers.find;
    originalWaitHelper  = Test._helpers.wait;

    jQuery('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    jQuery('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    run(function() {
      App = EmberApplication.create({
        rootElement: '#ember-testing'
      });

      App.setupForTesting();
    });
  },

  teardown() {
    App.removeTestHelpers();
    jQuery('#ember-testing-container, #ember-testing').remove();
    run(App, App.destroy);
    App = null;

    Test._helpers.visit = originalVisitHelper;
    Test._helpers.find  = originalFindHelper;
    Test._helpers.wait  = originalWaitHelper;
  }
});

QUnit.test('can override visit helper', function() {
  expect(1);

  Test.registerHelper('visit', function() {
    ok(true, 'custom visit helper was called');
  });

  App.injectTestHelpers();

  return App.testHelpers.visit();
});

QUnit.test('can override find helper', function() {
  expect(1);

  Test.registerHelper('find', function() {
    ok(true, 'custom find helper was called');

    return ['not empty array'];
  });

  App.injectTestHelpers();

  return App.testHelpers.findWithAssert('.who-cares');
});

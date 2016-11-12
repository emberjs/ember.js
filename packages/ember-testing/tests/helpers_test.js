import { Route, Router } from 'ember-routing';
import {
  Controller,
  Object as EmberObject,
  RSVP
} from 'ember-runtime';
import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import {
  Component,
  setTemplates,
  setTemplate
} from 'ember-glimmer';

import Test from '../test';
import '../helpers';  // ensure that the helpers are loaded
import '../initializers'; // ensure the initializer is setup
import setupForTesting from '../setup_for_testing';
import { Application as EmberApplication } from 'ember-application';
import { compile } from 'ember-template-compiler';

import {
  pendingRequests,
  incrementPendingRequests,
  clearPendingRequests
} from '../test/pending_requests';
import {
  setAdapter,
  getAdapter
} from '../test/adapter';
import {
  registerWaiter,
  unregisterWaiter
} from '../test/waiters';

var App;
var originalAdapter = getAdapter();

function cleanup() {
  // Teardown setupForTesting

  setAdapter(originalAdapter);
  run(function() {
    jQuery(document).off('ajaxSend');
    jQuery(document).off('ajaxComplete');
  });
  clearPendingRequests();
  // Test.waiters = null;

  // Other cleanup

  if (App) {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }

  setTemplates({});
}

function assertHelpers(application, helperContainer, expected) {
  if (!helperContainer) { helperContainer = window; }
  if (expected === undefined) { expected = true; }

  function checkHelperPresent(helper, expected) {
    var presentInHelperContainer = !!helperContainer[helper];
    var presentInTestHelpers = !!application.testHelpers[helper];

    ok(presentInHelperContainer === expected, 'Expected \'' + helper + '\' to be present in the helper container (defaults to window).');
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
  ok(Test.Promise.prototype.LeakyMcLeakLeak, 'helper in question SHOULD be present');

  App.removeTestHelpers();
  assertNoHelpers(App);

  equal(Test.Promise.prototype.LeakyMcLeakLeak, undefined, 'should NOT leak test promise extensions');
});


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
    setupApp();
  },
  teardown() {
    cleanup();
  }
});

QUnit.test('`wait` respects registerWaiters', function(assert) {
  assert.expect(3);

  let done = assert.async();

  let counter = 0;
  function waiter() {
    return ++counter > 2;
  }

  let other = 0;
  function otherWaiter() {
    return ++other > 2;
  }

  run(App, App.advanceReadiness);
  registerWaiter(waiter);
  registerWaiter(otherWaiter);

  App.testHelpers.wait()
    .then(function() {
      equal(waiter(), true, 'should not resolve until our waiter is ready');
      unregisterWaiter(waiter);
      counter = 0;
      return App.testHelpers.wait();
    })
    .then(function() {
      equal(counter, 0, 'unregistered waiter was not checked');
      equal(otherWaiter(), true, 'other waiter is still registered');
    })
    .finally(() => {
      unregisterWaiter(otherWaiter);
      done();
    });
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

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      this.$().on('mousedown focusin mouseup click', function(e) {
        events.push(e.type);
      });
    }
  });

  App.XCheckboxComponent = Component.extend({
    tagName: 'input',
    attributeBindings: ['type'],
    type: 'checkbox',
    click() {
      events.push('click:' + this.get('checked'));
    },
    change() {
      events.push('change:' + this.get('checked'));
    }
  });

  setTemplate('index', compile('{{#index-wrapper}}{{input type="text"}} {{x-checkbox type="checkbox"}} {{textarea}} <div contenteditable="true"> </div>{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'mouseup', 'click'],
      'fires events in order');
  }).then(function() {
    events = [];
    return click('.index-wrapper input[type=text]');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on inputs');
  }).then(function() {
    events = [];
    return click('.index-wrapper textarea');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on textareas');
  }).then(function() {
    events = [];
    return click('.index-wrapper div');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on contenteditable');
  }).then(function() {
    events = [];
    return click('.index-wrapper input[type=checkbox]');
  }).then(function() {
    // i.e. mousedown, mouseup, change:true, click, click:true
    // Firefox differs so we can't assert the exact ordering here.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=843554.
    equal(events.length, 5, 'fires click and change on checkboxes');
  });
});

QUnit.test('`click` triggers native events with simulated X/Y coordinates', function() {
  expect(15);

  var click, wait, events;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      let pushEvent  = e => events.push(e);
      this.element.addEventListener('mousedown', pushEvent);
      this.element.addEventListener('mouseup', pushEvent);
      this.element.addEventListener('click', pushEvent);
    }
  });

  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper');
  }).then(function() {
    events.forEach(e => {
      ok(e instanceof window.Event, 'The event is an instance of MouseEvent');
      ok(typeof e.screenX === 'number' && e.screenX > 0, 'screenX is correct');
      ok(typeof e.screenY === 'number' && e.screenY > 0, 'screenY is correct');
      ok(typeof e.clientX === 'number' && e.clientX > 0, 'clientX is correct');
      ok(typeof e.clientY === 'number' && e.clientY > 0, 'clientY is correct');
    });
  });
});

QUnit.test('`click` triggers native events with specified X/Y coordinates', function() {
  expect(15);

  var click, wait, events;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      let pushEvent  = e => events.push(e);
      this.element.addEventListener('mousedown', pushEvent);
      this.element.addEventListener('mouseup', pushEvent);
      this.element.addEventListener('click', pushEvent);
    }
  });


  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper', null, { screenX: 1111, screenY: 2222, clientX: 3333, clientY: 4444 });
  }).then(function() {
    events.forEach(e => {
      ok(e instanceof window.Event, 'The event is an instance of MouseEvent');
      ok(typeof e.screenX === 'number' && e.screenX === 1111, 'screenX is correct');
      ok(typeof e.screenY === 'number' && e.screenY === 2222, 'screenY is correct');
      ok(typeof e.clientX === 'number' && e.clientX === 3333, 'clientX is correct');
      ok(typeof e.clientY === 'number' && e.clientY === 4444, 'clientY is correct');
    });
  });
});

QUnit.test('`click` triggers native events with specified X/Y coordinates when coords are falsy', function() {
  expect(15);

  var click, wait, events;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      let pushEvent  = e => events.push(e);
      this.element.addEventListener('mousedown', pushEvent);
      this.element.addEventListener('mouseup', pushEvent);
      this.element.addEventListener('click', pushEvent);
    }
  });

  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper', null, { screenX: 0, screenY: 0, clientX: 0, clientY: 0 });
  }).then(function() {
    events.forEach(e => {
      ok(e instanceof window.Event, 'The event is an instance of MouseEvent');
      ok(typeof e.screenX === 'number' && e.screenX === 0, 'screenX is correct');
      ok(typeof e.screenY === 'number' && e.screenY === 0, 'screenY is correct');
      ok(typeof e.clientX === 'number' && e.clientX === 0, 'clientX is correct');
      ok(typeof e.clientY === 'number' && e.clientY === 0, 'clientY is correct');
    });
  });
});

QUnit.test('`click` triggers native events with specified mouse button', function() {
  expect(9);

  var click, wait, events;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      let pushEvent  = e => events.push(e);
      this.element.addEventListener('mousedown', pushEvent);
      this.element.addEventListener('mouseup', pushEvent);
      this.element.addEventListener('click', pushEvent);
    }
  });


  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper', null, { button: 2 });
  }).then(function() {
    events.forEach(e => {
      ok(e instanceof window.Event, 'The event is an instance of MouseEvent');
      ok(typeof e.button === 'number' && e.button === 2, 'button is correct');
      ok(typeof e.which === 'number' && e.which === 3, 'which is correct');
    });
  });
});

QUnit.test('`click` triggers native events with default left mouse button', function() {
  expect(9);

  var click, wait, events;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      let pushEvent  = e => events.push(e);
      this.element.addEventListener('mousedown', pushEvent);
      this.element.addEventListener('mouseup', pushEvent);
      this.element.addEventListener('click', pushEvent);
    }
  });


  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    events = [];
    return click('.index-wrapper');
  }).then(function() {
    events.forEach(e => {
      ok(e instanceof window.Event, 'The event is an instance of MouseEvent');
      ok(typeof e.button === 'number' && e.button === 0, 'button is correct');
      ok(typeof e.which === 'number' && e.which === 1, 'which is correct');
    });
  });
});

QUnit.test('`triggerEvent` with mouseenter triggers native events with simulated X/Y coordinates', function() {
  expect(5);

  var triggerEvent, wait, evt;

  App.IndexWrapperComponent = Component.extend({
    classNames: 'index-wrapper',

    didInsertElement() {
      this.element.addEventListener('mouseenter', e => evt = e);
    }
  });


  setTemplate('index', compile('{{#index-wrapper}}some text{{/index-wrapper}}'));

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait  = App.testHelpers.wait;

  return wait().then(function() {
    return triggerEvent('.index-wrapper', 'mouseenter');
  }).then(function() {
    ok(evt instanceof window.Event, 'The event is an instance of MouseEvent');
    ok(typeof evt.screenX === 'number' && evt.screenX > 0, 'screenX is correct');
    ok(typeof evt.screenY === 'number' && evt.screenY > 0, 'screenY is correct');
    ok(typeof evt.clientX === 'number' && evt.clientX > 0, 'clientX is correct');
    ok(typeof evt.clientY === 'number' && evt.clientY > 0, 'clientY is correct');
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

  let obj = {
    counter: 0,
    ready() {
      return ++this.counter > 2;
    }
  };

  let other = 0;
  function otherWaiter() {
    return ++other > 2;
  }

  run(App, App.advanceReadiness);
  registerWaiter(obj, obj.ready);
  registerWaiter(otherWaiter);

  return App.testHelpers.wait().then(function() {
    equal(obj.ready(), true, 'should not resolve until our waiter is ready');
    unregisterWaiter(obj, obj.ready);
    obj.counter = 0;
    return App.testHelpers.wait();
  }).then(function() {
    equal(obj.counter, 0, 'the unregistered waiter should still be at 0');
    equal(otherWaiter(), true, 'other waiter should still be registered');
  })
    .finally(() => {
      unregisterWaiter(otherWaiter);
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

  App.IndexWrapperComponent = Component.extend({
    didInsertElement() {
      this.$('.input').on('keydown change', function(e) {
        event = e;
      });
    }
  });

  setTemplate('index', compile('{{index-wrapper}}'));
  setTemplate('components/index-wrapper', compile('{{input type="text" id="scope" class="input"}}'));

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait().then(function() {
    return triggerEvent('.input', 'keydown', { keyCode: 13 });
  }).then(function() {
    equal(event.keyCode, 13, 'options were passed');
    equal(event.type, 'keydown', 'correct event was triggered');
    equal(event.target.getAttribute('id'), 'scope', 'triggered on the correct element');
  });
});

QUnit.test('`triggerEvent can limit searching for a selector to a scope', function() {
  expect(2);

  var triggerEvent, wait, event;

  App.IndexWrapperComponent = Component.extend({

    didInsertElement() {
      this.$('.input').on('blur change', function(e) {
        event = e;
      });
    }
  });

  setTemplate('components/index-wrapper', compile('{{input type="text" id="outside-scope" class="input"}}<div id="limited">{{input type="text" id="inside-scope" class="input"}}</div>'));
  setTemplate('index', compile('{{index-wrapper}}'));

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

  App.IndexWrapperComponent = Component.extend({
    didInsertElement() {
      this.$('#foo').on('blur change', function(e) {
        event = e;
      });
    }
  });

  setTemplate('components/index-wrapper',  compile('{{input type="text" id="foo"}}'));
  setTemplate('index', compile('{{index-wrapper}}'));

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

  setTemplate('index', compile('<div id="parent">{{input type="text" id="first" class="current"}}</div>{{input type="text" id="second" class="current"}}'));

  run(App, App.advanceReadiness);

  fillIn = App.testHelpers.fillIn;
  find = App.testHelpers.find;
  visit = App.testHelpers.visit;
  andThen = App.testHelpers.andThen;
  wait = App.testHelpers.wait;

  visit('/');
  fillIn('.current', '#parent', 'current value');

  return andThen(function() {
    equal(find('#first').val(), 'current value');
    equal(find('#second').val(), '');
  });
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

  setTemplate('index', compile('<div id="parent">{{input type="text" id="first" focus-in="wasFocused"}}</div>'));

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

  setTemplate('index', compile('<input type="text" id="first" oninput={{action "oninputHandler"}} onchange={{action "onchangeHandler"}}>'));

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

QUnit.test('`fillIn` only sets the value in the first matched element', function() {
  let fillIn, find, visit, andThen, wait;

  setTemplate('index', compile('<input type="text" id="first" class="in-test"><input type="text" id="second" class="in-test">'));
  run(App, App.advanceReadiness);

  fillIn = App.testHelpers.fillIn;
  find = App.testHelpers.find;
  visit = App.testHelpers.visit;
  andThen = App.testHelpers.andThen;
  wait = App.testHelpers.wait;

  visit('/');
  fillIn('input.in-test', 'new value');
  andThen(function() {
    equal(find('#first').val(), 'new value');
    equal(find('#second').val(), '');
  });

  return wait();
});

QUnit.test('`triggerEvent accepts an optional options hash and context', function() {
  expect(3);

  var triggerEvent, wait, event;

  App.IndexWrapperComponent = Component.extend({
    didInsertElement() {
      this.$('.input').on('keydown change', function(e) {
        event = e;
      });
    }
  });

  setTemplate('components/index-wrapper', compile('{{input type="text" id="outside-scope" class="input"}}<div id="limited">{{input type="text" id="inside-scope" class="input"}}</div>'));
  setTemplate('index', compile('{{index-wrapper}}'));

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  return wait()
    .then(function() {
      return triggerEvent('.input', '#limited', 'keydown', { keyCode: 13 });
    })
    .then(function() {
      equal(event.keyCode, 13, 'options were passed');
      equal(event.type, 'keydown', 'correct event was triggered');
      equal(event.target.getAttribute('id'), 'inside-scope', 'triggered on the correct element');
    });
});


QUnit.module('ember-testing debugging helpers', {
  setup() {
    setupApp();

    run(function() {
      App.Router = Router.extend({
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
    ok(true, 'Async start should be called after waiting for other helpers');
  }

  App.testHelpers.andThen(() => {
    Test.adapter.asyncStart = fakeAdapterAsyncStart;
  });

  App.testHelpers.pauseTest();
});

QUnit.module('ember-testing routing helpers', {
  setup() {
    run(function() {
      App = EmberApplication.create();
      App.setupForTesting();

      App.injectTestHelpers();

      App.Router = Router.extend({
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

QUnit.module('ember-testing pendingRequests', {
  setup() {
    setupApp();
  },

  teardown() {
    cleanup();
  }
});

QUnit.test('pendingRequests is maintained for ajaxSend and ajaxComplete events', function() {
  equal(pendingRequests(), 0);
  var xhr = { some: 'xhr' };
  jQuery(document).trigger('ajaxSend', xhr);
  equal(pendingRequests(), 1, 'Ember.Test.pendingRequests was incremented');
  jQuery(document).trigger('ajaxComplete', xhr);
  equal(pendingRequests(), 0, 'Ember.Test.pendingRequests was decremented');
});

QUnit.test('pendingRequests is ignores ajaxComplete events from past setupForTesting calls', function() {
  equal(pendingRequests(), 0);
  var xhr = { some: 'xhr' };
  jQuery(document).trigger('ajaxSend', xhr);
  equal(pendingRequests(), 1, 'Ember.Test.pendingRequests was incremented');

  run(function() {
    setupForTesting();
  });
  equal(pendingRequests(), 0, 'Ember.Test.pendingRequests was reset');

  var altXhr = { some: 'more xhr' };
  jQuery(document).trigger('ajaxSend', altXhr);
  equal(pendingRequests(), 1, 'Ember.Test.pendingRequests was incremented');
  jQuery(document).trigger('ajaxComplete', xhr);
  equal(pendingRequests(), 1, 'Ember.Test.pendingRequests is not impressed with your unexpected complete');
});

QUnit.test('pendingRequests is reset by setupForTesting', function() {
  incrementPendingRequests();
  run(function() {
    setupForTesting();
  });
  equal(pendingRequests(), 0, 'pendingRequests is reset');
});

QUnit.module('ember-testing async router', {
  setup() {
    cleanup();

    run(function() {
      App = EmberApplication.create();
      App.Router = Router.extend({
        location: 'none'
      });

      App.Router.map(function() {
        this.route('user', { resetNamespace: true }, function() {
          this.route('profile');
          this.route('edit');
        });
      });

      App.UserRoute = Route.extend({
        model() {
          return resolveLater();
        }
      });

      App.UserProfileRoute = Route.extend({
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
    cleanup();

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

var App;

function cleanup(){
  if (App) {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }

  Ember.run(function(){
    Ember.$(document).off('ajaxStart');
    Ember.$(document).off('ajaxStop');
  });

  Ember.TEMPLATES = {};
}

module("ember-testing Helpers", {
  setup: function(){ cleanup(); },
  teardown: function() { cleanup(); }
});

test("Ember.Application#injectTestHelpers/#removeTestHelpers", function() {
  App = Ember.run(Ember.Application, Ember.Application.create);
  ok(!window.visit);
  ok(!App.testHelpers.visit);
  ok(!window.click);
  ok(!App.testHelpers.click);
  ok(!window.keyEvent);
  ok(!App.testHelpers.keyEvent);
  ok(!window.fillIn);
  ok(!App.testHelpers.fillIn);
  ok(!window.wait);
  ok(!App.testHelpers.wait);

  App.injectTestHelpers();

  ok(window.visit);
  ok(App.testHelpers.visit);
  ok(window.click);
  ok(App.testHelpers.click);
  ok(window.keyEvent);
  ok(App.testHelpers.keyEvent);
  ok(window.fillIn);
  ok(App.testHelpers.fillIn);
  ok(window.wait);
  ok(App.testHelpers.wait);

  App.removeTestHelpers();

  ok(!window.visit);
  ok(!App.testHelpers.visit);
  ok(!window.click);
  ok(!App.testHelpers.click);
  ok(!window.keyEvent);
  ok(!App.testHelpers.keyEvent);
  ok(!window.fillIn);
  ok(!App.testHelpers.fillIn);
  ok(!window.wait);
  ok(!App.testHelpers.wait);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
});

test("Ember.Test.registerHelper/unregisterHelper", function() {
  expect(5);
  var appBooted = false;

  Ember.Test.registerHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
    appBooted = true;
    return window.wait();
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
    App.injectTestHelpers();
  });

  ok(App.testHelpers.boot);
  ok(window.boot);

  window.boot().then(function() {
    ok(appBooted);

    App.removeTestHelpers();
    Ember.Test.unregisterHelper('boot');

    ok(!App.testHelpers.boot);
    ok(!window.boot);
  });

});

test("`wait` helper can be passed a resolution value", function() {
  expect(4);

  var promise, wait;

  promise = new Ember.RSVP.Promise(function(resolve) {
    Ember.run(null, resolve, 'promise');
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);

  wait = App.testHelpers.wait;

  wait('text').then(function(val) {
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

test("`click` triggers appropriate events in order", function() {
  expect(4);

  var click, wait, events;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.IndexView = Ember.View.extend({
    classNames: 'index-view',

    didInsertElement: function() {
      this.$().on('mousedown focusin mouseup click', function(e) {
        events.push(e.type);
      });
    },

    Checkbox: Ember.Checkbox.extend({
      click: function() {
        events.push('click:' + this.get('checked'));
      },

      change: function() {
        events.push('change:' + this.get('checked'));
      }
    })
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{input type="text"}} {{view view.Checkbox}} {{textarea}}');

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  wait().then(function() {
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
    // In IE (< 8), the change event only fires when the value changes before element focused.
    Ember.$('.index-view input[type=checkbox]').focus();
    events = [];
    return click('.index-view input[type=checkbox]');
  }).then(function() {
    // i.e. mousedown, mouseup, change:true, click, click:true
    // Firefox differs so we can't assert the exact ordering here.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=843554.
    equal(events.length, 5, 'fires click and change on checkboxes');
  });
});

test("Ember.Application#injectTestHelpers", function() {
  var documentEvents;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  documentEvents = Ember.$._data(document, 'events');

  if (!documentEvents) {
    documentEvents = {};
  }

  ok(documentEvents['ajaxStart'] === undefined, 'there are no ajaxStart listers setup prior to calling injectTestHelpers');
  ok(documentEvents['ajaxStop'] === undefined, 'there are no ajaxStop listers setup prior to calling injectTestHelpers');

  App.injectTestHelpers();
  documentEvents = Ember.$._data(document, 'events');

  equal(documentEvents['ajaxStart'].length, 1, 'calling injectTestHelpers registers an ajaxStart handler');
  equal(documentEvents['ajaxStop'].length, 1, 'calling injectTestHelpers registers an ajaxStop handler');
});

test("Ember.Application#injectTestHelpers calls callbacks registered with onInjectHelpers", function(){
  var injected = 0;

  Ember.Test.onInjectHelpers(function(){
    injected++;
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(injected, 0, 'onInjectHelpers are not called before injectTestHelpers');

  App.injectTestHelpers();

  equal(injected, 1, 'onInjectHelpers are called after injectTestHelpers');
});

if (Ember.FEATURES.isEnabled("ember-testing-wait-hooks")) {
  test("`wait` respects registerWaiters", function() {
    expect(2);

    var counter=0;
    function waiter() {
      return ++counter > 2;
    }

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();

    Ember.run(App, App.advanceReadiness);
    Ember.Test.registerWaiter(waiter);

    App.testHelpers.wait().then(function() {
      equal(waiter(), true, 'should not resolve until our waiter is ready');
      Ember.Test.unregisterWaiter(waiter);
      equal(Ember.Test.waiters.length, 0, 'should not leave a waiter registered');
    });
  });

  test("`wait` waits for outstanding timers", function() {
    expect(1);

    var wait_done = false;

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();

    Ember.run(App, App.advanceReadiness);

    Ember.run.later(this, function() {
      wait_done = true;
    }, 500);

    App.testHelpers.wait().then(function() {
      equal(wait_done, true, 'should wait for the timer to be fired.');
    });
  });


  test("`wait` respects registerWaiters with optional context", function() {
    expect(2);

    var obj = {
      counter: 0,
      ready: function() {
	return ++this.counter > 2;
      }
    };

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();

    Ember.run(App, App.advanceReadiness);
    Ember.Test.registerWaiter(obj, obj.ready);

    App.testHelpers.wait().then(function() {
      equal(obj.ready(), true, 'should not resolve until our waiter is ready');
      Ember.Test.unregisterWaiter(obj, obj.ready);
      equal(Ember.Test.waiters.length, 0, 'should not leave a waiter registered');
    });


  });
}

module("ember-testing pendingAjaxRequests", {
  setup: function(){
    cleanup();

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();
  },

  teardown: function() { cleanup(); }
});

test("pendingAjaxRequests is incremented on each document ajaxStart event", function() {
  Ember.Test.pendingAjaxRequests = 0;

  Ember.run(function(){
    Ember.$(document).trigger('ajaxStart');
  });

  equal(Ember.Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');
});

test("pendingAjaxRequests is decremented on each document ajaxStop event", function() {
  Ember.Test.pendingAjaxRequests = 1;

  Ember.run(function(){
    Ember.$(document).trigger('ajaxStop');
  });

  equal(Ember.Test.pendingAjaxRequests, 0, 'Ember.Test.pendingAjaxRequests was decremented');
});

test("it should raise an assertion error if ajaxStop is called without pendingAjaxRequests", function() {
  Ember.Test.pendingAjaxRequests = 0;

  expectAssertion(function() {
    Ember.run(function(){
      Ember.$(document).trigger('ajaxStop');
    });
  });
});

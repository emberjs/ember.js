import Ember from "ember-metal/core";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import RSVP from "ember-runtime/ext/rsvp";
import {View as EmberView} from "ember-views/views/view";
import jQuery from "ember-views/system/jquery";

import Test from "ember-testing/test";
import "ember-testing/helpers";  // ensure that the helpers are loaded
import "ember-testing/initializers"; // ensure the initializer is setup
import setupForTesting from "ember-testing/setup_for_testing";
import EmberRouter from "ember-routing/system/router";
import EmberRoute from "ember-routing/system/route";
import EmberApplication from "ember-application/system/application";

var App, originalAdapter = Test.adapter;

function cleanup(){

  // Teardown setupForTesting

  Test.adapter = originalAdapter;
  run(function(){
    jQuery(document).off('ajaxSend');
    jQuery(document).off('ajaxComplete');
  });
  Test.pendingAjaxRequests = null;

  // Other cleanup

  if (App) {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }

  Ember.TEMPLATES = {};
}

function assertHelpers(application, helperContainer, expected){
  if (!helperContainer) { helperContainer = window; }
  if (expected === undefined) { expected = true; }

  function checkHelperPresent(helper, expected){
    var presentInHelperContainer = !!helperContainer[helper],
        presentInTestHelpers = !!application.testHelpers[helper];

    ok(presentInHelperContainer === expected, "Expected '" + helper + "' to be present in the helper container (defaults to window).");
    ok(presentInTestHelpers === expected, "Expected '" + helper + "' to be present in App.testHelpers.");
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

function currentRouteName(app){
  if(Ember.FEATURES.isEnabled('ember-testing-route-helpers')) {
    return app.testHelpers.currentRouteName();
  } else {
    var appController = app.__container__.lookup('controller:application');

    return get(appController, 'currentRouteName');
  }
}

function currentPath(app){
  if(Ember.FEATURES.isEnabled('ember-testing-route-helpers')) {
    return app.testHelpers.currentPath();
  } else {
    var appController = app.__container__.lookup('controller:application');

    return get(appController, 'currentPath');
  }
}

function currentURL(app){
  if(Ember.FEATURES.isEnabled('ember-testing-route-helpers')) {
    return app.testHelpers.currentURL();
  } else {
    var router = app.__container__.lookup('router:main');

    return get(router, 'location').getURL();
  }
}

module("ember-testing Helpers", {
  setup: function(){ cleanup(); },
  teardown: function() { cleanup(); }
});

test("Ember.Application#injectTestHelpers/#removeTestHelpers", function() {
  App = run(EmberApplication, EmberApplication.create);
  assertNoHelpers(App);

  App.injectTestHelpers();
  assertHelpers(App);

  App.removeTestHelpers();
  assertNoHelpers(App);
});

test("Ember.Application#setupForTesting", function() {
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
});

test("Ember.Application.setupForTesting sets the application to `testing`.", function(){
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App.testing, true, "Application instance is set to testing.");
});

test("Ember.Application.setupForTesting leaves the system in a deferred state.", function(){
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");
});

test("App.reset() after Application.setupForTesting leaves the system in a deferred state.", function(){
  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");

  App.reset();
  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");
});

test("`visit` advances readiness.", function(){
  expect(2);

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
    App.injectTestHelpers();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");

  App.testHelpers.visit('/').then(function(){
    equal(App._readinessDeferrals, 0, "App's readiness was advanced by visit.");
  });
});

test("`wait` helper can be passed a resolution value", function() {
  expect(4);

  var promise, wait;

  promise = new RSVP.Promise(function(resolve) {
    run(null, resolve, 'promise');
  });

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  run(App, App.advanceReadiness);

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

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.IndexView = EmberView.extend({
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

  run(App, App.advanceReadiness);

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

test("Ember.Application#setupForTesting attaches ajax listeners", function() {
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

test("Ember.Application#setupForTesting attaches ajax listeners only once", function() {
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
  run(function() {
    setupForTesting();
  });

  documentEvents = jQuery._data(document, 'events');

  equal(documentEvents['ajaxSend'].length, 1, 'calling injectTestHelpers registers an ajaxSend handler');
  equal(documentEvents['ajaxComplete'].length, 1, 'calling injectTestHelpers registers an ajaxComplete handler');
});

test("Ember.Application#injectTestHelpers calls callbacks registered with onInjectHelpers", function(){
  var injected = 0;

  Test.onInjectHelpers(function(){
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

test("Ember.Application#injectTestHelpers adds helpers to provided object.", function(){
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

test("Ember.Application#removeTestHelpers resets the helperContainer's original values", function(){
  var helpers = {visit: 'snazzleflabber'};

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers(helpers);

  ok(helpers['visit'] !== 'snazzleflabber', "helper added to container");
  App.removeTestHelpers();

  ok(helpers['visit'] === 'snazzleflabber', "original value added back to container");
});

test("`wait` respects registerWaiters", function() {
  expect(2);

  var counter=0;
  function waiter() {
    return ++counter > 2;
  }

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  run(App, App.advanceReadiness);
  Test.registerWaiter(waiter);

  App.testHelpers.wait().then(function() {
    equal(waiter(), true, 'should not resolve until our waiter is ready');
    Test.unregisterWaiter(waiter);
    equal(Test.waiters.length, 0, 'should not leave a waiter registered');
  });
});

test("`wait` waits for outstanding timers", function() {
  expect(1);

  var wait_done = false;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  run(App, App.advanceReadiness);

  run.later(this, function() {
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

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  run(App, App.advanceReadiness);
  Test.registerWaiter(obj, obj.ready);

  App.testHelpers.wait().then(function() {
    equal(obj.ready(), true, 'should not resolve until our waiter is ready');
    Test.unregisterWaiter(obj, obj.ready);
    equal(Test.waiters.length, 0, 'should not leave a waiter registered');
  });


});

module("ember-testing routing helpers", {
  setup: function(){
    cleanup();

    run(function() {
      App = EmberApplication.create();
      App.Router = EmberRouter.extend({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("posts", function() {
          this.route("new");
        });
      });

      App.setupForTesting();
    });

    App.injectTestHelpers();
    run(App, 'advanceReadiness');
  },

  teardown: function(){
    cleanup();
  }
});

test("currentRouteName for '/'", function(){
  expect(3);

  App.testHelpers.visit('/').then(function(){
    equal(App.testHelpers.currentRouteName(), 'index', "should equal 'index'.");
    equal(App.testHelpers.currentPath(), 'index', "should equal 'index'.");
    equal(App.testHelpers.currentURL(), '/', "should equal '/'.");
  });
});


test("currentRouteName for '/posts'", function(){
  expect(3);

  App.testHelpers.visit('/posts').then(function(){
    equal(App.testHelpers.currentRouteName(), 'posts.index', "should equal 'posts.index'.");
    equal(App.testHelpers.currentPath(), 'posts.index', "should equal 'posts.index'.");
    equal(App.testHelpers.currentURL(), '/posts', "should equal '/posts'.");
  });
});

test("currentRouteName for '/posts/new'", function(){
  expect(3);

  App.testHelpers.visit('/posts/new').then(function(){
    equal(App.testHelpers.currentRouteName(), 'posts.new', "should equal 'posts.new'.");
    equal(App.testHelpers.currentPath(), 'posts.new', "should equal 'posts.new'.");
    equal(App.testHelpers.currentURL(), '/posts/new', "should equal '/posts/new'.");
  });
});

module("ember-testing pendingAjaxRequests", {
  setup: function(){
    cleanup();

    run(function() {
      App = EmberApplication.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();
  },

  teardown: function() { cleanup(); }
});

test("pendingAjaxRequests is incremented on each document ajaxSend event", function() {
  Test.pendingAjaxRequests = 0;
  jQuery(document).trigger('ajaxSend');
  equal(Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');
});

test("pendingAjaxRequests is decremented on each document ajaxComplete event", function() {
  Test.pendingAjaxRequests = 1;
  jQuery(document).trigger('ajaxComplete');
  equal(Test.pendingAjaxRequests, 0, 'Ember.Test.pendingAjaxRequests was decremented');
});

test("pendingAjaxRequests is not reset by setupForTesting", function() {
  Test.pendingAjaxRequests = 1;
  Ember.run(function(){
    setupForTesting();
  });
  equal(Test.pendingAjaxRequests, 1, 'pendingAjaxRequests is not reset');
});

test("it should raise an assertion error if ajaxComplete is called without pendingAjaxRequests", function() {
  Test.pendingAjaxRequests = 0;
  expectAssertion(function() {
    jQuery(document).trigger('ajaxComplete');
  });
});

test("`trigger` can be used to trigger arbitrary events", function() {
  expect(2);

  var triggerEvent, wait, event;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  App.IndexView = EmberView.extend({
    template: Ember.Handlebars.compile('{{input type="text" id="foo"}}'),

    didInsertElement: function() {
      this.$('#foo').on('blur change', function(e) {
        event = e;
      });
    }
  });

  App.injectTestHelpers();

  run(App, App.advanceReadiness);

  triggerEvent = App.testHelpers.triggerEvent;
  wait         = App.testHelpers.wait;

  wait().then(function() {
    return triggerEvent('#foo', 'blur');
  }).then(function() {
    equal(event.type, 'blur', 'correct event was triggered');
    equal(event.target.getAttribute('id'), 'foo', 'triggered on the correct element');
  });
});

module("ember-testing async router", {
  setup: function(){
    cleanup();

    run(function() {
      App = EmberApplication.create();
      App.Router = EmberRouter.extend({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("user", function() {
          this.route("profile");
          this.route("edit");
        });
      });

      App.UserRoute = EmberRoute.extend({
        model: function() {
          return resolveLater();
        }
      });

      App.UserProfileRoute = EmberRoute.extend({
        beforeModel: function() {
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
                resolve(EmberObject.create({firstName: 'Tom'}));
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

  teardown: function(){
    cleanup();
  }
});

test("currentRouteName for '/user'", function(){
  expect(4);

  App.testHelpers.visit('/user').then(function(){
    equal(currentRouteName(App), 'user.index', "should equal 'user.index'.");
    equal(currentPath(App), 'user.index', "should equal 'user.index'.");
    equal(currentURL(App), '/user', "should equal '/user'.");
    equal(App.__container__.lookup('route:user').get('controller.content.firstName'), 'Tom', "should equal 'Tom'.");
  });
});

test("currentRouteName for '/user/profile'", function(){
  expect(4);

  App.testHelpers.visit('/user/profile').then(function(){
    equal(currentRouteName(App), 'user.edit', "should equal 'user.edit'.");
    equal(currentPath(App), 'user.edit', "should equal 'user.edit'.");
    equal(currentURL(App), '/user/edit', "should equal '/user/edit'.");
    equal(App.__container__.lookup('route:user').get('controller.content.firstName'), 'Tom', "should equal 'Tom'.");
  });
});

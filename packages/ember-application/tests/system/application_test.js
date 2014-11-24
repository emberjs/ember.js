/*globals EmberDev */

import Ember from "ember-metal/core";
import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import DefaultResolver from "ember-application/system/resolver";
import Router from "ember-routing/system/router";
import View from "ember-views/views/view";
import Controller from "ember-runtime/controllers/controller";
import NoneLocation from "ember-routing/location/none_location";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";

var trim = jQuery.trim;

var app, application, originalLookup, originalDebug;

var compile = EmberHandlebars.compile;


QUnit.module("Ember.Application", {
  setup: function() {
    originalLookup = Ember.lookup;
    originalDebug = Ember.debug;

    jQuery("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    run(function() {
      application = Application.create({ rootElement: '#one', router: null });
    });
  },

  teardown: function() {
    jQuery("#qunit-fixture").empty();
    Ember.debug = originalDebug;

    Ember.lookup = originalLookup;

    if (application) {
      run(application, 'destroy');
    }

    if (app) {
      run(app, 'destroy');
    }
  }
});

test("you can make a new application in a non-overlapping element", function() {
  run(function() {
    app = Application.create({ rootElement: '#two', router: null });
  });

  run(app, 'destroy');
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  expectAssertion(function() {
    run(function() {
      Application.create({ rootElement: '#qunit-fixture' });
    });
  });
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  expectAssertion(function() {
    run(function() {
      Application.create({ rootElement: '#one-child' });
    });
  });
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  expectAssertion(function() {
    run(function() {
      Application.create({ rootElement: '#one' });
    });
  });
});

test("you cannot make two default applications without a rootElement error", function() {
  expectAssertion(function() {
    run(function() {
      Application.create({ router: false });
    });
  });
});

test("acts like a namespace", function() {
  var lookup = Ember.lookup = {};
  var app;

  run(function() {
    app = lookup.TestApp = Application.create({ rootElement: '#two', router: false });
  });

  Ember.BOOTED = false;
  app.Foo = EmberObject.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
});

QUnit.module("Ember.Application initialization", {
  teardown: function() {
    if (app) {
      run(app, 'destroy');
    }
    Ember.TEMPLATES = {};
  }
});

test('initialized application go to initial route', function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application',
      compile("{{outlet}}")
    );

    Ember.TEMPLATES.index = compile(
      "<h1>Hi from index</h1>"
    );
  });

  equal(jQuery('#qunit-fixture h1').text(), "Hi from index");
});

test("initialize application via initialize call", function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.ApplicationView = View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });
  });

  // This is not a public way to access the container; we just
  // need to make some assertions about the created router
  var router = app.__container__.lookup('router:main');
  equal(router instanceof Router, true, "Router was set from initialize call");
  equal(router.location instanceof NoneLocation, true, "Location was set from location implementation name");
});

test("initialize application with stateManager via initialize call from Router class", function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application', function() {
      return "<h1>Hello!</h1>";
    });
  });

  var router = app.__container__.lookup('router:main');
  equal(router instanceof Router, true, "Router was set from initialize call");
  equal(jQuery("#qunit-fixture h1").text(), "Hello!");
});

test("ApplicationView is inserted into the page", function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.ApplicationView = View.extend({
      render: function(buffer) {
        buffer.push("<h1>Hello!</h1>");
      }
    });

    app.ApplicationController = Controller.extend();

    app.Router.reopen({
      location: 'none'
    });
  });

  equal(jQuery("#qunit-fixture h1").text(), "Hello!");
});

test("Minimal Application initialized with just an application template", function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">Hello World</script>');
  run(function () {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(jQuery('#qunit-fixture').text()), 'Hello World');
});

test('enable log of libraries with an ENV var', function() {
  if (EmberDev && EmberDev.runningProdBuild){
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  var debug = Ember.debug;
  var messages = [];

  Ember.LOG_VERSION = true;

  Ember.debug = function(message) {
    messages.push(message);
  };

  Ember.libraries.register("my-lib", "2.0.0a");

  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(messages[1], "Ember      : " + Ember.VERSION);
  equal(messages[2], "Handlebars : " + EmberHandlebars.VERSION);
  equal(messages[3], "jQuery     : " + jQuery().jquery);
  equal(messages[4], "my-lib     : " + "2.0.0a");

  Ember.libraries.deRegister("my-lib");
  Ember.LOG_VERSION = false;
  Ember.debug = debug;
});

test('disable log version of libraries with an ENV var', function() {
  var logged = false;

  Ember.LOG_VERSION = false;

  Ember.debug = function(message) {
    logged = true;
  };

  jQuery("#qunit-fixture").empty();

  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });
  });

  ok(!logged, 'library version logging skipped');
});

test("can resolve custom router", function(){
  var CustomRouter = Router.extend();

  var CustomResolver = DefaultResolver.extend({
    resolveOther: function(parsedName){
      if (parsedName.type === "router") {
        return CustomRouter;
      } else {
        return this._super(parsedName);
      }
    }
  });

  app = run(function(){
    return Application.create({
      Resolver: CustomResolver
    });
  });

  ok(app.__container__.lookup('router:main') instanceof CustomRouter, 'application resolved the correct router');
});

test("throws helpful error if `app.then` is used", function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  expectDeprecation(function() {
    run(app, 'then', function() { return this; });
  }, /Do not use `.then` on an instance of Ember.Application.  Please use the `.ready` hook instead./);
});

test("registers controls onto to container", function() {
  run(function() {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  ok(app.__container__.lookup('view:select'), "Select control is registered into views");
});

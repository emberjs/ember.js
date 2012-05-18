// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;
var set = Ember.set, get = Ember.get, getPath = Ember.getPath;

module("Ember.Application", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one' });
    });
  },

  teardown: function() {
    Ember.run(function(){ application.destroy(); });
  }
});

test("you can make a new application in a non-overlapping element", function() {
  var app;
  Ember.run(function() {
    app = Ember.Application.create({ rootElement: '#two' });
  });
  Ember.run(function() {
    app.destroy();
  });
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#qunit-fixture' });
    });
  }, Error);
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one-child' });
    });
  }, Error);
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one' });
    });
  }, Error);
});

test("you cannot make two default applications without a rootElement error", function() {
  // Teardown existing
  Ember.run(function() {
    application.destroy();
  });

  Ember.run(function() {
    application = Ember.Application.create();
  });
  raises(function() {
    Ember.run(function() {
      Ember.Application.create();
    });
  }, Error);
});

test("acts like a namespace", function() {
  var app;
  Ember.run(function() {
    app = window.TestApp = Ember.Application.create({rootElement: '#two'});
  });
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
  Ember.run(function() {
    app.destroy();
  });
  window.TestApp = undefined;
});

var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(function(){ app.destroy(); });
  }
});

test("initialize controllers into a state manager", function() {
  Ember.run(function() {
    app = Ember.Application.create();
  });

  app.FooController = Ember.Object.extend();
  app.BarController = Ember.ArrayController.extend();
  app.Foo = Ember.Object.create();
  app.fooController = Ember.Object.create();

  var stateManager = Ember.Object.create();

  app.initialize(stateManager);

  ok(get(stateManager, 'fooController') instanceof app.FooController, "fooController was assigned");
  ok(get(stateManager, 'barController') instanceof app.BarController, "barController was assigned");
  ok(get(stateManager, 'foo') === undefined, "foo was not assigned");

  equal(getPath(stateManager, 'fooController.target'), stateManager, "the state manager is assigned");
  equal(getPath(stateManager, 'barController.target'), stateManager, "the state manager is assigned");
});

module("Ember.Application initial route", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.stateManager = Ember.StateManager.create({
      location: {
        getURL: function() {
          return '/';
        }
      },

      start: Ember.State.extend({
        index: Ember.State.extend({
          route: '/'
        })
      })
    });
  });

  equal(app.getPath('stateManager.currentState.path'), 'start.index', "The router moved the state into the right place");
});

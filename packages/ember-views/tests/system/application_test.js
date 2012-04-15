// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;
var set = Ember.set, get = Ember.get;

module("Ember.Application", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    application = Ember.Application.create({ rootElement: '#one' });
  },

  teardown: function() {
    Ember.run(function(){ application.destroy(); });
  }
});

test("you can make a new application in a non-overlapping element", function() {
  var app = Ember.Application.create({ rootElement: '#two' });
  app.destroy();
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  raises(function() {
    Ember.Application.create({ rootElement: '#qunit-fixture' });
  }, Error);
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  raises(function() {
    Ember.Application.create({ rootElement: '#one-child' });
  }, Error);
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  raises(function() {
    Ember.Application.create({ rootElement: '#one' });
  }, Error);
});

test("you cannot make two default applications without a rootElement error", function() {
  // Teardown existing
  application.destroy();

  application = Ember.Application.create();
  raises(function() {
    Ember.Application.create();
  }, Error);
});

test("acts like a namespace", function() {
  var app = window.TestApp = Ember.Application.create({rootElement: '#two'});
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
  app.destroy();
  window.TestApp = undefined;
});

var FirstApp, SecondApp;

module("Ember#defaultApplication", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div class='first' ></div><div class='second' ></div>");
    Ember.run(function() { set(Ember, 'defaultApplication', undefined); });
    Ember.Application.APPLICATIONS = [];
  },

  teardown: function() {
    if (FirstApp) {
      Ember.run(function() { FirstApp.destroy(); });
    }
    if (SecondApp) {
      Ember.run(function() { SecondApp.destroy(); });
    }

    Ember.run(function() { set(Ember, 'defaultApplication', undefined); });
    Ember.Application.APPLICATIONS = [];
  }
});

test("is set to undefined when no application has been created", function() {
  var defaultApplication = get(Ember, 'defaultApplication');
  equal(Ember.typeOf(defaultApplication), 'undefined', 'defaultApplication is undefined');
});

test("is set when a new application is created", function() {
  FirstApp = Ember.Application.create({ rootElement: '.first' });

  var defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, FirstApp, 'defaultApplication is the created application');
});

test("is set to the first created application", function() {
  FirstApp = Ember.Application.create({ rootElement: '.first' });
  SecondApp = Ember.Application.create({ rootElement: '.second' });

  var defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, FirstApp, 'defaultApplication is the first created application');
});

test("is overwritten when a new application is created with flag isDefaultApplication", function() {
  FirstApp = Ember.Application.create({ rootElement: '.first' });

  var defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, FirstApp, 'defaultApplication is defined');

  SecondApp = Ember.Application.create({ rootElement: '.second', isDefaultApplication: true });

  defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, SecondApp, 'defaultApplication is the second created application');
});

test("is set to the next available appliation if the default application is destroyed", function() {
  FirstApp = Ember.Application.create({ rootElement: '.first' });
  SecondApp = Ember.Application.create({ rootElement: '.second' });

  var defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, FirstApp, 'defaultApplication is the first created application');

  Ember.run(function() { FirstApp.destroy(); });
  
  defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, SecondApp, 'defaultApplication is the second created application');
});

test("is set to undefined when the default application is destroyed and there are no more applications available", function() {
  FirstApp = Ember.Application.create({ rootElement: '.first' });

  var defaultApplication = get(Ember, 'defaultApplication');
  ok(defaultApplication, 'defaultApplication is defined');
  equal(defaultApplication, FirstApp, 'defaultApplication is defined');

  Ember.run(function() { FirstApp.destroy(); });

  defaultApplication = get(Ember, 'defaultApplication');
  ok(!defaultApplication, 'defaultApplication is undefined');
});

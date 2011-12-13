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
    $("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    application = Ember.Application.create({ rootElement: '#one' });
  },

  teardown: function() {
    application.destroy();
  }
});

test("you can make a new application in a non-overlapping element", function() {
  var app = Ember.Application.create({ rootElement: '#two' });
  app.destroy();
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

test("acts like a namespace", function() {
  var app = window.TestApp = Ember.Application.create({rootElement: '#two'});
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
  app.destroy();
  window.TestApp = undefined;
});

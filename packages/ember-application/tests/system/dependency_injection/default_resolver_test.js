import Ember from "ember-metal/core"; // Ember.TEMPLATES
import run from "ember-metal/run_loop";
import Logger from "ember-metal/logger";
import Controller from "ember-runtime/controllers/controller";
import EmberObject from "ember-runtime/system/object";
import EmberHandlebars from "ember-handlebars";
import Namespace from "ember-runtime/system/namespace";
import Application from "ember-application/system/application";

var locator, application, lookup, originalLookup, originalLoggerInfo;

QUnit.module("Ember.Application Depedency Injection", {
  setup: function() {
    originalLookup = Ember.lookup;
    application = run(Application, 'create');

    locator = application.__container__;
    originalLoggerInfo = Logger.info;
  },

  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    run(application, 'destroy');
    var UserInterfaceNamespace = Namespace.NAMESPACES_BY_ID['UserInterface'];
    if (UserInterfaceNamespace) { run(UserInterfaceNamespace, 'destroy'); }

    Logger.info = originalLoggerInfo;
  }
});

test('the default resolver can look things up in other namespaces', function() {
  var UserInterface = Ember.lookup.UserInterface = Namespace.create();
  UserInterface.NavigationController = Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, "the result should be an instance of the specified class");
});

test('the default resolver looks up templates in Ember.TEMPLATES', function() {
  function fooTemplate() {}
  function fooBarTemplate() {}
  function fooBarBazTemplate() {}

  Ember.TEMPLATES['foo'] = fooTemplate;
  Ember.TEMPLATES['fooBar'] = fooBarTemplate;
  Ember.TEMPLATES['fooBar/baz'] = fooBarBazTemplate;

  equal(locator.lookup('template:foo'), fooTemplate, "resolves template:foo");
  equal(locator.lookup('template:fooBar'), fooBarTemplate, "resolves template:foo_bar");
  equal(locator.lookup('template:fooBar.baz'), fooBarBazTemplate, "resolves template:foo_bar.baz");
});

test('the default resolver looks up basic name as no prefix', function() {
  ok(Controller.detect(locator.lookup('controller:basic')), 'locator looksup correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = EmberObject.extend({});

  detectEqual(application.FooManager, locator.resolver('manager:foo'),"looks up FooManager on application");
});

test("the default resolver resolves models on the namespace", function() {
  application.Post = EmberObject.extend({});

  detectEqual(application.Post, locator.lookupFactory('model:post'), "looks up Post model on application");
});

test("the default resolver resolves helpers from EmberHandlebars.helpers", function(){
  function fooresolvertestHelper(){ return 'FOO'; }
  function barBazResolverTestHelper(){ return 'BAZ'; }
  EmberHandlebars.registerHelper('fooresolvertest', fooresolvertestHelper);
  EmberHandlebars.registerHelper('bar-baz-resolver-test', barBazResolverTestHelper);
  equal(fooresolvertestHelper, locator.lookup('helper:fooresolvertest'), "looks up fooresolvertestHelper helper");
  equal(barBazResolverTestHelper, locator.lookup('helper:bar-baz-resolver-test'), "looks up barBazResolverTestHelper helper");
});

test("the default resolver resolves container-registered helpers", function(){
  function gooresolvertestHelper(){ return 'GOO'; }
  function gooGazResolverTestHelper(){ return 'GAZ'; }
  application.register('helper:gooresolvertest', gooresolvertestHelper);
  application.register('helper:goo-baz-resolver-test', gooGazResolverTestHelper);
  equal(gooresolvertestHelper, locator.lookup('helper:gooresolvertest'), "looks up gooresolvertest helper");
  equal(gooGazResolverTestHelper, locator.lookup('helper:goo-baz-resolver-test'), "looks up gooGazResolverTestHelper helper");
});

test("the default resolver throws an error if the fullName to resolve is invalid", function(){
  raises(function(){ locator.resolve(undefined);}, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(null);     }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':');      }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model');  }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model:'); }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':type');  }, TypeError, /Invalid fullName/ );
});

test("the default resolver logs hits if `LOG_RESOLVER` is set", function() {
  expect(3);

  application.LOG_RESOLVER = true;
  application.ScoobyDoo = EmberObject.extend();
  application.toString = function() { return 'App'; };

  Logger.info = function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[✓]', 'proper symbol is printed when a module is found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  };

  locator.resolve('doo:scooby');
});

test("the default resolver logs misses if `LOG_RESOLVER` is set", function() {
  expect(3);

  application.LOG_RESOLVER = true;
  application.toString = function() { return 'App'; };

  Logger.info = function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[ ]', 'proper symbol is printed when a module is not found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  };

  locator.resolve('doo:scooby');
});

test("doesn't log without LOG_RESOLVER", function(){
  var infoCount = 0;

  application.ScoobyDoo = EmberObject.extend();

  Logger.info = function(symbol, name) {
    infoCount = infoCount + 1;
  };

  locator.resolve('doo:scooby');
  locator.resolve('doo:scrappy');
  equal(infoCount, 0, 'Logger.info should not be called if LOG_RESOLVER is not set');
});

import Ember from "ember-metal/core"; // Ember.TEMPLATES
import run from "ember-metal/run_loop";
import Logger from "ember-metal/logger";
import Controller from "ember-runtime/controllers/controller";
import EmberObject from "ember-runtime/system/object";
import Namespace from "ember-runtime/system/namespace";
import Application from "ember-application/system/application";
import {
  registerHelper
} from "ember-htmlbars/helpers";

var registry, locator, application, originalLookup, originalLoggerInfo;

QUnit.module("Ember.Application Dependency Injection - default resolver", {
  setup() {
    originalLookup = Ember.lookup;
    application = run(Application, 'create');

    registry = application.registry;
    locator = application.__container__;
    originalLoggerInfo = Logger.info;
  },

  teardown() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    run(application, 'destroy');
    var UserInterfaceNamespace = Namespace.NAMESPACES_BY_ID['UserInterface'];
    if (UserInterfaceNamespace) { run(UserInterfaceNamespace, 'destroy'); }

    Logger.info = originalLoggerInfo;
  }
});

QUnit.test('the default resolver can look things up in other namespaces', function() {
  var UserInterface = Ember.lookup.UserInterface = Namespace.create();
  UserInterface.NavigationController = Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, "the result should be an instance of the specified class");
});

QUnit.test('the default resolver looks up templates in Ember.TEMPLATES', function() {
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

QUnit.test('the default resolver looks up basic name as no prefix', function() {
  ok(Controller.detect(locator.lookup('controller:basic')), 'locator looksup correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

QUnit.test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = EmberObject.extend({});

  detectEqual(application.FooManager, registry.resolver('manager:foo'), "looks up FooManager on application");
});

QUnit.test("the default resolver resolves models on the namespace", function() {
  application.Post = EmberObject.extend({});

  detectEqual(application.Post, locator.lookupFactory('model:post'), "looks up Post model on application");
});

QUnit.test("the default resolver resolves *:main on the namespace", function() {
  application.FooBar = EmberObject.extend({});

  detectEqual(application.FooBar, locator.lookupFactory('foo-bar:main'), "looks up FooBar type without name on application");
});

QUnit.test("the default resolver resolves helpers", function() {
  expect(2);

  function fooresolvertestHelper() {
    ok(true, 'found fooresolvertestHelper');
  }
  function barBazResolverTestHelper() {
    ok(true, 'found barBazResolverTestHelper');
  }
  registerHelper('fooresolvertest', fooresolvertestHelper);
  registerHelper('bar-baz-resolver-test', barBazResolverTestHelper);

  fooresolvertestHelper();
  barBazResolverTestHelper();
});

QUnit.test("the default resolver resolves container-registered helpers", function() {
  function gooresolvertestHelper() { return 'GOO'; }
  function gooGazResolverTestHelper() { return 'GAZ'; }
  application.register('helper:gooresolvertest', gooresolvertestHelper);
  application.register('helper:goo-baz-resolver-test', gooGazResolverTestHelper);
  equal(gooresolvertestHelper, locator.lookup('helper:gooresolvertest'), "looks up gooresolvertest helper");
  equal(gooGazResolverTestHelper, locator.lookup('helper:goo-baz-resolver-test'), "looks up gooGazResolverTestHelper helper");
});

QUnit.test("the default resolver throws an error if the fullName to resolve is invalid", function() {
  throws(function() { registry.resolve(undefined);}, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(null);     }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('');       }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('');       }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(':');      }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('model');  }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('model:'); }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(':type');  }, TypeError, /Invalid fullName/ );
});

QUnit.test("the default resolver logs hits if `LOG_RESOLVER` is set", function() {
  expect(3);

  application.LOG_RESOLVER = true;
  application.ScoobyDoo = EmberObject.extend();
  application.toString = function() { return 'App'; };

  Logger.info = function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[✓]', 'proper symbol is printed when a module is found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  };

  registry.resolve('doo:scooby');
});

QUnit.test("the default resolver logs misses if `LOG_RESOLVER` is set", function() {
  expect(3);

  application.LOG_RESOLVER = true;
  application.toString = function() { return 'App'; };

  Logger.info = function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[ ]', 'proper symbol is printed when a module is not found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  };

  registry.resolve('doo:scooby');
});

QUnit.test("doesn't log without LOG_RESOLVER", function() {
  var infoCount = 0;

  application.ScoobyDoo = EmberObject.extend();

  Logger.info = function(symbol, name) {
    infoCount = infoCount + 1;
  };

  registry.resolve('doo:scooby');
  registry.resolve('doo:scrappy');
  equal(infoCount, 0, 'Logger.info should not be called if LOG_RESOLVER is not set');
});

QUnit.test("lookup description", function() {
  application.toString = function() { return 'App'; };

  equal(registry.describe('controller:foo'), 'App.FooController', 'Type gets appended at the end');
  equal(registry.describe('controller:foo.bar'), 'App.FooBarController', 'dots are removed');
  equal(registry.describe('model:foo'), 'App.Foo', "models don't get appended at the end");

});

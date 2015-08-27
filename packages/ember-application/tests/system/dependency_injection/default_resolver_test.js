/* globals EmberDev */
import Ember from 'ember-metal/core'; // Ember.TEMPLATES
import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import run from 'ember-metal/run_loop';
import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import Component from 'ember-views/components/component';
import View from 'ember-views/views/view';
import Service from 'ember-runtime/system/service';
import EmberObject from 'ember-runtime/system/object';
import Namespace from 'ember-runtime/system/namespace';
import Application from 'ember-application/system/application';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';
import makeHTMLBarsBoundHelper from 'ember-htmlbars/system/make_bound_helper';
import {
  registerHelper
} from 'ember-htmlbars/helpers';

var registry, locator, application, originalLookup, originalInfo;

QUnit.module('Ember.Application Dependency Injection - default resolver', {
  setup() {
    originalLookup = Ember.lookup;
    application = run(Application, 'create');

    registry = application.__registry__;
    locator = application.__container__;
    originalInfo = getDebugFunction('info');
  },

  teardown() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    run(application, 'destroy');
    var UserInterfaceNamespace = Namespace.NAMESPACES_BY_ID['UserInterface'];
    if (UserInterfaceNamespace) { run(UserInterfaceNamespace, 'destroy'); }

    setDebugFunction('info', originalInfo);
  }
});

QUnit.test('the default resolver can look things up in other namespaces', function() {
  var UserInterface = Ember.lookup.UserInterface = Namespace.create();
  UserInterface.NavigationController = Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, 'the result should be an instance of the specified class');
});

QUnit.test('the default resolver looks up templates in Ember.TEMPLATES', function() {
  function fooTemplate() {}
  function fooBarTemplate() {}
  function fooBarBazTemplate() {}

  Ember.TEMPLATES['foo'] = fooTemplate;
  Ember.TEMPLATES['fooBar'] = fooBarTemplate;
  Ember.TEMPLATES['fooBar/baz'] = fooBarBazTemplate;

  equal(locator.lookup('template:foo'), fooTemplate, 'resolves template:foo');
  equal(locator.lookup('template:fooBar'), fooBarTemplate, 'resolves template:foo_bar');
  equal(locator.lookup('template:fooBar.baz'), fooBarBazTemplate, 'resolves template:foo_bar.baz');
});

QUnit.test('the default resolver looks up basic name as no prefix', function() {
  ok(Controller.detect(locator.lookup('controller:basic')), 'locator looksup correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

QUnit.test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = EmberObject.extend({});

  detectEqual(application.FooManager, registry.resolver('manager:foo'), 'looks up FooManager on application');
});

QUnit.test('the default resolver resolves models on the namespace', function() {
  application.Post = EmberObject.extend({});

  detectEqual(application.Post, locator.lookupFactory('model:post'), 'looks up Post model on application');
});

QUnit.test('the default resolver resolves *:main on the namespace', function() {
  application.FooBar = EmberObject.extend({});

  detectEqual(application.FooBar, locator.lookupFactory('foo-bar:main'), 'looks up FooBar type without name on application');
});

QUnit.test('the default resolver resolves helpers', function() {
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

QUnit.test('the default resolver resolves container-registered helpers', function() {
  let shorthandHelper = makeHelper(function() {});
  let helper = Helper.extend();

  application.register('helper:shorthand', shorthandHelper);
  application.register('helper:complete', helper);

  let lookedUpShorthandHelper = locator.lookupFactory('helper:shorthand');
  ok(lookedUpShorthandHelper.isHelperInstance, 'shorthand helper isHelper');

  let lookedUpHelper = locator.lookupFactory('helper:complete');
  ok(lookedUpHelper.isHelperFactory, 'complete helper is factory');
  ok(helper.detect(lookedUpHelper), 'looked up complete helper');
});

QUnit.test('the default resolver resolves helpers on the namespace', function() {
  let ShorthandHelper = makeHelper(function() {});
  let CompleteHelper = Helper.extend();
  let LegacyHTMLBarsBoundHelper;

  expectDeprecation(function() {
    LegacyHTMLBarsBoundHelper = makeHTMLBarsBoundHelper(function() {});
  }, 'Using `Ember.HTMLBars.makeBoundHelper` is deprecated. Please refactor to using `Ember.Helper` or `Ember.Helper.helper`.');

  application.ShorthandHelper = ShorthandHelper;
  application.CompleteHelper = CompleteHelper;
  application.LegacyHtmlBarsBoundHelper = LegacyHTMLBarsBoundHelper; // Must use lowered "tml" in "HTMLBars" for resolver to find this

  let resolvedShorthand = registry.resolve('helper:shorthand');
  let resolvedComplete = registry.resolve('helper:complete');
  let resolvedLegacyHTMLBars = registry.resolve('helper:legacy-html-bars-bound');

  equal(resolvedShorthand, ShorthandHelper, 'resolve fetches the shorthand helper factory');
  equal(resolvedComplete, CompleteHelper, 'resolve fetches the complete helper factory');
  equal(resolvedLegacyHTMLBars, LegacyHTMLBarsBoundHelper, 'resolves legacy HTMLBars bound helper');
});

QUnit.test('the default resolver resolves to the same instance no matter the notation ', function() {
  application.NestedPostController = Controller.extend({});

  equal(locator.lookup('controller:nested-post'), locator.lookup('controller:nested_post'), 'looks up NestedPost controller on application');
});

QUnit.test('the default resolver throws an error if the fullName to resolve is invalid', function() {
  throws(function() { registry.resolve(undefined);}, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(null);     }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('');       }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('');       }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(':');      }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('model');  }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve('model:'); }, TypeError, /Invalid fullName/ );
  throws(function() { registry.resolve(':type');  }, TypeError, /Invalid fullName/ );
});

QUnit.test('the default resolver logs hits if `LOG_RESOLVER` is set', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(3);

  application.LOG_RESOLVER = true;
  application.ScoobyDoo = EmberObject.extend();
  application.toString = function() { return 'App'; };

  setDebugFunction('info', function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[✓]', 'proper symbol is printed when a module is found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  });

  registry.resolve('doo:scooby');
});

QUnit.test('the default resolver logs misses if `LOG_RESOLVER` is set', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(3);

  application.LOG_RESOLVER = true;
  application.toString = function() { return 'App'; };

  setDebugFunction('info', function(symbol, name, padding, lookupDescription) {
    equal(symbol, '[ ]', 'proper symbol is printed when a module is not found');
    equal(name, 'doo:scooby', 'proper lookup value is logged');
    equal(lookupDescription, 'App.ScoobyDoo');
  });

  registry.resolve('doo:scooby');
});

QUnit.test('doesn\'t log without LOG_RESOLVER', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  var infoCount = 0;

  application.ScoobyDoo = EmberObject.extend();

  setDebugFunction('info', function(symbol, name) {
    infoCount = infoCount + 1;
  });

  registry.resolve('doo:scooby');
  registry.resolve('doo:scrappy');
  equal(infoCount, 0, 'Logger.info should not be called if LOG_RESOLVER is not set');
});

QUnit.test('lookup description', function() {
  application.toString = function() { return 'App'; };

  equal(registry.describe('controller:foo'), 'App.FooController', 'Type gets appended at the end');
  equal(registry.describe('controller:foo.bar'), 'App.FooBarController', 'dots are removed');
  equal(registry.describe('model:foo'), 'App.Foo', 'models don\'t get appended at the end');
});

QUnit.test('assertion for routes without isRouteFactory property', function() {
  application.FooRoute = Component.extend();

  expectAssertion(function() {
    registry.resolve(`route:foo`);
  }, /to resolve to an Ember.Route/, 'Should assert');
});

QUnit.test('no assertion for routes that extend from Ember.Route', function() {
  expect(0);
  application.FooRoute = Route.extend();
  registry.resolve(`route:foo`);
});

QUnit.test('deprecation warning for service factories without isServiceFactory property', function() {
  expectDeprecation(/service factories must have an `isServiceFactory` property/);
  application.FooService = EmberObject.extend();
  registry.resolve('service:foo');
});

QUnit.test('no deprecation warning for service factories that extend from Ember.Service', function() {
  expectNoDeprecation();
  application.FooService = Service.extend();
  registry.resolve('service:foo');
});

QUnit.test('deprecation warning for view factories without isViewFactory property', function() {
  expectDeprecation(/view factories must have an `isViewFactory` property/);
  application.FooView = EmberObject.extend();
  registry.resolve('view:foo');
});

QUnit.test('no deprecation warning for view factories that extend from Ember.View', function() {
  expectNoDeprecation();
  application.FooView = View.extend();
  registry.resolve('view:foo');
});

QUnit.test('deprecation warning for component factories without isComponentFactory property', function() {
  expectDeprecation(/component factories must have an `isComponentFactory` property/);
  application.FooComponent = View.extend();
  registry.resolve('component:foo');
});

QUnit.test('no deprecation warning for component factories that extend from Ember.Component', function() {
  expectNoDeprecation();
  application.FooView = Component.extend();
  registry.resolve('component:foo');
});

QUnit.test('knownForType returns each item for a given type found', function() {
  application.FooBarHelper = 'foo';
  application.BazQuxHelper = 'bar';

  let found = registry.resolver.knownForType('helper');

  deepEqual(found, {
    'helper:foo-bar': true,
    'helper:baz-qux': true
  });
});

QUnit.test('knownForType is not required to be present on the resolver', function() {
  delete registry.resolver.__resolver__.knownForType;

  registry.resolver.knownForType('helper', function() { });

  ok(true, 'does not error');
});

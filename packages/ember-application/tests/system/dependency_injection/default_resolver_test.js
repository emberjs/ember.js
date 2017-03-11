/* globals EmberDev */
import { context } from 'ember-environment';
import {
  getDebugFunction,
  setDebugFunction
} from 'ember-debug';
import {
  run
} from 'ember-metal';
import { EMBER_FACTORY_FOR } from 'ember-features';
import {
  Controller,
  Service,
  Object as EmberObject,
  Namespace
} from 'ember-runtime';
import { Route } from 'ember-routing';
import Application from '../../../system/application';
import {
  Component,
  setTemplates,
  setTemplate,
  Helper,
  helper as makeHelper,
  makeBoundHelper as makeHTMLBarsBoundHelper
} from 'ember-glimmer';
import { compile } from 'ember-template-compiler';

let registry, locator, application, originalLookup, originalInfo;

QUnit.module('Ember.Application Dependency Injection - default resolver', {
  setup() {
    originalLookup = context.lookup;
    application = run(Application, 'create');

    registry = application.__registry__;
    locator = application.__container__;
    originalInfo = getDebugFunction('info');
  },

  teardown() {
    setTemplates({});
    context.lookup = originalLookup;
    run(application, 'destroy');
    let UserInterfaceNamespace = Namespace.NAMESPACES_BY_ID['UserInterface'];
    if (UserInterfaceNamespace) { run(UserInterfaceNamespace, 'destroy'); }

    setDebugFunction('info', originalInfo);
  }
});

QUnit.test('the default resolver can look things up in other namespaces', function() {
  let UserInterface = context.lookup.UserInterface = Namespace.create();
  UserInterface.NavigationController = Controller.extend();

  let nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, 'the result should be an instance of the specified class');
});

QUnit.test('the default resolver looks up templates in Ember.TEMPLATES', function() {
  let fooTemplate = compile('foo template');
  let fooBarTemplate = compile('fooBar template');
  let fooBarBazTemplate = compile('fooBar/baz template');

  setTemplate('foo', fooTemplate);
  setTemplate('fooBar', fooBarTemplate);
  setTemplate('fooBar/baz', fooBarBazTemplate);

  ignoreDeprecation(() => {
    equal(locator.lookupFactory('template:foo'), fooTemplate, 'resolves template:foo');
    equal(locator.lookupFactory('template:fooBar'), fooBarTemplate, 'resolves template:foo_bar');
    equal(locator.lookupFactory('template:fooBar.baz'), fooBarBazTemplate, 'resolves template:foo_bar.baz');
  });

  if (EMBER_FACTORY_FOR) {
    equal(locator.factoryFor('template:foo').class, fooTemplate, 'resolves template:foo');
    equal(locator.factoryFor('template:fooBar').class, fooBarTemplate, 'resolves template:foo_bar');
    equal(locator.factoryFor('template:fooBar.baz').class, fooBarBazTemplate, 'resolves template:foo_bar.baz');
  }
});

QUnit.test('the default resolver looks up basic name as no prefix', function() {
  ok(Controller.detect(locator.lookup('controller:basic')), 'locator looks up correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

QUnit.test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = EmberObject.extend({});

  detectEqual(application.FooManager, registry.resolve('manager:foo'), 'looks up FooManager on application');
});

QUnit.test('the default resolver resolves models on the namespace', function() {
  application.Post = EmberObject.extend({});

  ignoreDeprecation(() => {
    detectEqual(application.Post, locator.lookupFactory('model:post'), 'looks up Post model on application');
  });
  if (EMBER_FACTORY_FOR) {
    detectEqual(application.Post, locator.factoryFor('model:post').class, 'looks up Post model on application');
  }
});

QUnit.test('the default resolver resolves *:main on the namespace', function() {
  application.FooBar = EmberObject.extend({});

  ignoreDeprecation(() => {
    detectEqual(application.FooBar, locator.lookupFactory('foo-bar:main'), 'looks up FooBar type without name on application');
  });
  if (EMBER_FACTORY_FOR) {
    detectEqual(application.FooBar, locator.factoryFor('foo-bar:main').class, 'looks up FooBar type without name on application');
  }
});

if (EMBER_FACTORY_FOR) {
  QUnit.test('the default resolver resolves container-registered helpers', function() {
    let shorthandHelper = makeHelper(() => {});
    let helper = Helper.extend();

    application.register('helper:shorthand', shorthandHelper);
    application.register('helper:complete', helper);

    let lookedUpShorthandHelper = locator.factoryFor('helper:shorthand').class;

    ok(lookedUpShorthandHelper.isHelperInstance, 'shorthand helper isHelper');

    let lookedUpHelper = locator.factoryFor('helper:complete').class;

    ok(lookedUpHelper.isHelperFactory, 'complete helper is factory');
    ok(helper.detect(lookedUpHelper), 'looked up complete helper');
  });
}

QUnit.test('the default resolver resolves container-registered helpers via lookupFor', function() {
  let shorthandHelper = makeHelper(() => {});
  let helper = Helper.extend();

  application.register('helper:shorthand', shorthandHelper);
  application.register('helper:complete', helper);

  ignoreDeprecation(() => {
    let lookedUpShorthandHelper = locator.lookupFactory('helper:shorthand');

    ok(lookedUpShorthandHelper.isHelperInstance, 'shorthand helper isHelper');

    let lookedUpHelper = locator.lookupFactory('helper:complete');

    ok(lookedUpHelper.isHelperFactory, 'complete helper is factory');
    ok(helper.detect(lookedUpHelper), 'looked up complete helper');
  });
});

QUnit.test('the default resolver resolves helpers on the namespace', function() {
  let ShorthandHelper = makeHelper(() =>  {});
  let CompleteHelper = Helper.extend();
  let LegacyHTMLBarsBoundHelper;

  expectDeprecation(() => {
    LegacyHTMLBarsBoundHelper = makeHTMLBarsBoundHelper(() => {});
  }, 'Using `Ember.HTMLBars.makeBoundHelper` is deprecated. Please refactor to use `Ember.Helper` or `Ember.Helper.helper`.');

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

QUnit.test('the default resolver resolves to the same instance, no matter the notation ', function() {
  application.NestedPostController = Controller.extend({});

  equal(locator.lookup('controller:nested-post'), locator.lookup('controller:nested_post'), 'looks up NestedPost controller on application');
});

QUnit.test('the default resolver throws an error if the fullName to resolve is invalid', function() {
  throws(() => { registry.resolve(undefined);}, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve(null);     }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve('');       }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve('');       }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve(':');      }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve('model');  }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve('model:'); }, TypeError, /Invalid fullName/);
  throws(() => { registry.resolve(':type');  }, TypeError, /Invalid fullName/);
});

QUnit.test('the default resolver logs hits if `LOG_RESOLVER` is set', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(3);

  application.LOG_RESOLVER = true;
  application.ScoobyDoo = EmberObject.extend();
  application.toString = () => 'App';

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
  application.toString = () => 'App';

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

  let infoCount = 0;

  application.ScoobyDoo = EmberObject.extend();

  setDebugFunction('info', (symbol, name) => infoCount = infoCount + 1);

  registry.resolve('doo:scooby');
  registry.resolve('doo:scrappy');
  equal(infoCount, 0, 'Logger.info should not be called if LOG_RESOLVER is not set');
});

QUnit.test('lookup description', function() {
  application.toString = () => 'App';

  equal(registry.describe('controller:foo'), 'App.FooController', 'Type gets appended at the end');
  equal(registry.describe('controller:foo.bar'), 'App.FooBarController', 'dots are removed');
  equal(registry.describe('model:foo'), 'App.Foo', 'models don\'t get appended at the end');
});

QUnit.test('assertion for routes without isRouteFactory property', function() {
  application.FooRoute = Component.extend();

  expectAssertion(() => registry.resolve(`route:foo`), /to resolve to an Ember.Route/, 'Should assert');
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

QUnit.test('deprecation warning for component factories without isComponentFactory property', function() {
  expectDeprecation(/component factories must have an `isComponentFactory` property/);
  application.FooComponent = EmberObject.extend();
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

  // using `Object.keys` and manually confirming values over using `deepEqual`
  // due to an issue in QUnit (through at least 1.20.0) that are unable to properly compare
  // objects with an `undefined` constructor (like ember-metal/empty_object)
  let foundKeys = Object.keys(found);

  deepEqual(foundKeys, ['helper:foo-bar', 'helper:baz-qux']);
  ok(found['helper:foo-bar']);
  ok(found['helper:baz-qux']);
});

QUnit.test('knownForType is not required to be present on the resolver', function() {
  delete registry.resolver.knownForType;

  registry.resolver.knownForType('helper', () => { });

  ok(true, 'does not error');
});

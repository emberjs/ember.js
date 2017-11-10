/* globals EmberDev */
import {
  moduleFor,
  DefaultResolverApplicationTestCase
} from 'internal-test-helpers';

import { context } from 'ember-environment';
import {
  Controller,
  Service,
  Object as EmberObject,
  Namespace
} from 'ember-runtime';
import { Route } from 'ember-routing';
import {
  Component,
  Helper,
  helper as makeHelper,
} from 'ember-glimmer';
import { getDebugFunction, setDebugFunction } from 'ember-debug';

moduleFor('Ember.Application Dependency Injection - Integration - default resolver', class extends DefaultResolverApplicationTestCase {

  beforeEach() {
    this.runTask(() => this.createApplication());
    return this.visit('/');
  }

  get privateRegistry() {
    return this.application.__registry__;
  }

  /*
   * This first batch of tests are integration tests against the public
   * applicationInstance API.
   */

  [`@test the default resolver looks up templates in Ember.TEMPLATES`](assert) {
    let fooTemplate = this.addTemplate('foo', `foo template`);
    let fooBarTemplate = this.addTemplate('fooBar', `fooBar template`);
    let fooBarBazTemplate = this.addTemplate('fooBar/baz', `fooBar/baz template`);

    assert.equal(
      this.applicationInstance.factoryFor('template:foo').class, fooTemplate,
      'resolves template:foo'
    );
    assert.equal(
      this.applicationInstance.factoryFor('template:fooBar').class, fooBarTemplate,
      'resolves template:foo_bar'
    );
    assert.equal(
      this.applicationInstance.factoryFor('template:fooBar.baz').class, fooBarBazTemplate,
      'resolves template:foo_bar.baz'
    );
  }

  [`@test the default resolver looks up basic name as no prefix`](assert) {
    let instance = this.applicationInstance.lookup('controller:basic');
    assert.ok(
      Controller.detect(instance),
      'locator looks up correct controller'
    );
  }

  [`@test the default resolver looks up arbitrary types on the namespace`](assert) {
    let Class = this.application.FooManager = EmberObject.extend();
    let resolvedClass = this.application.resolveRegistration('manager:foo');
    assert.equal(
      Class, resolvedClass,
      'looks up FooManager on application'
    );
  }

  [`@test the default resolver resolves models on the namespace`](assert) {
    let Class = this.application.Post = EmberObject.extend();
    let factoryClass = this.applicationInstance.factoryFor('model:post').class;
    assert.equal(
      Class, factoryClass,
      'looks up Post model on application'
    );
  }

  [`@test the default resolver resolves *:main on the namespace`](assert) {
    let Class = this.application.FooBar = EmberObject.extend();
    let factoryClass = this.applicationInstance.factoryFor('foo-bar:main').class;
    assert.equal(
      Class, factoryClass,
      'looks up FooBar type without name on application'
    );
  }

  [`@test the default resolver resolves container-registered helpers`](assert) {
    let shorthandHelper = makeHelper(() => {});
    let helper = Helper.extend();

    this.application.register('helper:shorthand', shorthandHelper);
    this.application.register('helper:complete', helper);

    let lookedUpShorthandHelper = this.applicationInstance.factoryFor('helper:shorthand').class;

    assert.ok(lookedUpShorthandHelper.isHelperFactory, 'shorthand helper isHelper');

    let lookedUpHelper = this.applicationInstance.factoryFor('helper:complete').class;

    assert.ok(lookedUpHelper.isHelperFactory, 'complete helper is factory');
    assert.ok(helper.detect(lookedUpHelper), 'looked up complete helper');
  }

  [`@test the default resolver resolves container-registered helpers via lookupFor`](assert) {
    let shorthandHelper = makeHelper(() => {});
    let helper = Helper.extend();

    this.application.register('helper:shorthand', shorthandHelper);
    this.application.register('helper:complete', helper);

    let lookedUpShorthandHelper = this.applicationInstance.factoryFor('helper:shorthand').class;

    assert.ok(lookedUpShorthandHelper.isHelperFactory, 'shorthand helper isHelper');

    let lookedUpHelper = this.applicationInstance.factoryFor('helper:complete').class;

    assert.ok(lookedUpHelper.isHelperFactory, 'complete helper is factory');
    assert.ok(helper.detect(lookedUpHelper), 'looked up complete helper');
  }

  [`@test the default resolver resolves helpers on the namespace`](assert) {
    let ShorthandHelper = makeHelper(() =>  {});
    let CompleteHelper = Helper.extend();

    this.application.ShorthandHelper = ShorthandHelper;
    this.application.CompleteHelper = CompleteHelper;

    let resolvedShorthand = this.application.resolveRegistration('helper:shorthand');
    let resolvedComplete = this.application.resolveRegistration('helper:complete');

    assert.equal(resolvedShorthand, ShorthandHelper, 'resolve fetches the shorthand helper factory');
    assert.equal(resolvedComplete, CompleteHelper, 'resolve fetches the complete helper factory');
  }

  [`@test the default resolver resolves to the same instance, no matter the notation `](assert) {
    this.application.NestedPostController = Controller.extend({});

    assert.equal(
      this.applicationInstance.lookup('controller:nested-post'),
      this.applicationInstance.lookup('controller:nested_post'),
      'looks up NestedPost controller on application'
    );
  }

  [`@test the default resolver throws an error if the fullName to resolve is invalid`](assert) {
    assert.throws(() => { this.applicationInstance.resolveRegistration(undefined);}, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration(null);     }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration('');       }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration('');       }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration(':');      }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration('model');  }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration('model:'); }, TypeError, /Invalid fullName/);
    assert.throws(() => { this.applicationInstance.resolveRegistration(':type');  }, TypeError, /Invalid fullName/);
  }

  /*
   * The following are integration tests against the private registry API.
   */

  [`@test lookup description`](assert) {
    this.application.toString = () => 'App';

    assert.equal(
      this.privateRegistry.describe('controller:foo'), 'App.FooController',
      'Type gets appended at the end'
    );
    assert.equal(
      this.privateRegistry.describe('controller:foo.bar'), 'App.FooBarController',
      'dots are removed'
    );
    assert.equal(
      this.privateRegistry.describe('model:foo'), 'App.Foo',
      'models don\'t get appended at the end'
    );
  }

  [`@test assertion for routes without isRouteFactory property`](assert) {
    this.application.FooRoute = Component.extend();

    expectAssertion(() => {
      this.privateRegistry.resolve(`route:foo`)
    }, /to resolve to an Ember.Route/, 'Should assert');
  }

  [`@test no assertion for routes that extend from Ember.Route`](assert) {
    assert.expect(0);
    this.application.FooRoute = Route.extend();
    this.privateRegistry.resolve(`route:foo`);
  }

  [`@test deprecation warning for service factories without isServiceFactory property`](assert) {
    expectAssertion(() =>{
      this.application.FooService = EmberObject.extend();
      this.privateRegistry.resolve('service:foo');
    }, /Expected service:foo to resolve to an Ember.Service but instead it was \.FooService\./);
  }

  [`@test no deprecation warning for service factories that extend from Ember.Service`](assert) {
    assert.expect(0);
    this.application.FooService = Service.extend();
    this.privateRegistry.resolve('service:foo');
  }

  [`@test deprecation warning for component factories without isComponentFactory property`](assert) {
    expectAssertion(() => {
      this.application.FooComponent = EmberObject.extend();
      this.privateRegistry.resolve('component:foo');
    }, /Expected component:foo to resolve to an Ember\.Component but instead it was \.FooComponent\./);
  }

  [`@test no deprecation warning for component factories that extend from Ember.Component`](assert) {
    expectNoDeprecation();
    this.application.FooView = Component.extend();
    this.privateRegistry.resolve('component:foo');
  }

  [`@test knownForType returns each item for a given type found`](assert) {
    this.application.FooBarHelper = 'foo';
    this.application.BazQuxHelper = 'bar';

    let found = this.privateRegistry.resolver.knownForType('helper');

    assert.deepEqual(found, {
      'helper:foo-bar': true,
      'helper:baz-qux': true
    });
  }

  [`@test knownForType is not required to be present on the resolver`](assert) {
    delete this.privateRegistry.resolver.knownForType;

    this.privateRegistry.resolver.knownForType('helper', () => { });

    assert.ok(true, 'does not error');
  }

});

moduleFor('Ember.Application Dependency Injection - Integration - default resolver w/ other namespace', class extends DefaultResolverApplicationTestCase {

  beforeEach() {
    this.UserInterface = context.lookup.UserInterface = Namespace.create();
    this.runTask(() => this.createApplication());
    return this.visit('/');
  }

  teardown() {
    let UserInterfaceNamespace = Namespace.NAMESPACES_BY_ID['UserInterface'];
    if (UserInterfaceNamespace) {
      this.runTask(() => {
        UserInterfaceNamespace.destroy();
      });
    }
    super.teardown();
  }

  [`@test the default resolver can look things up in other namespaces`](assert) {
    this.UserInterface.NavigationController = Controller.extend();

    let nav = this.applicationInstance.lookup('controller:userInterface/navigation');

    assert.ok(
      nav instanceof this.UserInterface.NavigationController,
      'the result should be an instance of the specified class'
    );
  }
});

moduleFor('Ember.Application Dependency Injection - Integration - default resolver', class extends DefaultResolverApplicationTestCase {

  constructor() {
    super();
    this._originalLookup = context.lookup;
    this._originalInfo = getDebugFunction('info');
  }

  beforeEach() {
    this.runTask(() => this.createApplication());
    return this.visit('/');
  }

  teardown() {
    setDebugFunction('info', this._originalInfo);
    context.lookup = this._originalLookup;
    super.teardown();
  }

  [`@test the default resolver logs hits if 'LOG_RESOLVER' is set`](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    assert.expect(3);

    this.application.LOG_RESOLVER = true;
    this.application.ScoobyDoo = EmberObject.extend();
    this.application.toString = () => 'App';

    setDebugFunction('info', function(symbol, name, padding, lookupDescription) {
      assert.equal(symbol, '[✓]', 'proper symbol is printed when a module is found');
      assert.equal(name, 'doo:scooby', 'proper lookup value is logged');
      assert.equal(lookupDescription, 'App.ScoobyDoo');
    });

    this.applicationInstance.resolveRegistration('doo:scooby');
  }

  [`@test the default resolver logs misses if 'LOG_RESOLVER' is set`](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    assert.expect(3);

    this.application.LOG_RESOLVER = true;
    this.application.toString = () => 'App';

    setDebugFunction('info', function(symbol, name, padding, lookupDescription) {
      assert.equal(symbol, '[ ]', 'proper symbol is printed when a module is not found');
      assert.equal(name, 'doo:scooby', 'proper lookup value is logged');
      assert.equal(lookupDescription, 'App.ScoobyDoo');
    });

    this.applicationInstance.resolveRegistration('doo:scooby');
  }

  [`@test doesn't log without LOG_RESOLVER`](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    let infoCount = 0;

    this.application.ScoobyDoo = EmberObject.extend();

    setDebugFunction('info', (symbol, name) => infoCount = infoCount + 1);

    this.applicationInstance.resolveRegistration('doo:scooby');
    this.applicationInstance.resolveRegistration('doo:scrappy');
    assert.equal(infoCount, 0, 'Logger.info should not be called if LOG_RESOLVER is not set');
  }

});

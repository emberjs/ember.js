import lookupHelper, { findHelper } from 'ember-htmlbars/system/lookup-helper';
import ComponentLookup from 'ember-views/component_lookup';
import Registry from 'container/registry';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';

function generateEnv(helpers, container) {
  return {
    container: container,
    helpers: (helpers ? helpers : {}),
    hooks: { keywords: {} },
    knownHelpers: {}
  };
}

function generateContainer() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('component-lookup:main', ComponentLookup);

  return container;
}

QUnit.module('ember-htmlbars: lookupHelper hook');

QUnit.test('looks for helpers in the provided `env.helpers`', function() {
  var env = generateEnv({
    'flubarb'() { }
  });

  var actual = lookupHelper('flubarb', null, env);

  equal(actual, env.helpers.flubarb, 'helpers are looked up on env');
});

QUnit.test('returns undefined if no container exists (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {};

  var actual = findHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

QUnit.test('does not lookup in the container if the name does not contain a dash (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {
    container: {
      lookup() {
        ok(false, 'should not lookup in the container');
      }
    }
  };

  var actual = findHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

QUnit.test('does a lookup in the container if the name contains a dash (and helper is not found in env)', function() {
  var container = generateContainer();
  var env = generateEnv(null, container);
  var view = {
    container: container
  };

  var someName = Helper.extend();
  view.container.registry.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  ok(someName.detect(actual), 'helper is an instance of the helper class');
});

QUnit.test('does a lookup in the container if the name is found in knownHelpers', function() {
  var container = generateContainer();
  var env = generateEnv(null, container);
  var view = {
    container: container
  };

  env.knownHelpers['t'] = true;
  var t = Helper.extend();
  view.container.registry.register('helper:t', t);

  var actual = lookupHelper('t', view, env);

  ok(t.detect(actual), 'helper is an instance of the helper class');
});

QUnit.test('looks up a shorthand helper in the container', function() {
  expect(2);
  var container = generateContainer();
  var env = generateEnv(null, container);
  var view = {
    container: container
  };
  var called;

  function someName() {
    called = true;
  }
  view.container.registry.register('helper:some-name', makeHelper(someName));

  var actual = lookupHelper('some-name', view, env);

  ok(actual.isHelperInstance, 'is a helper');

  actual.compute([], {});

  ok(called, 'HTMLBars compatible wrapper is wraping the provided function');
});

QUnit.test('fails with a useful error when resolving a function', function() {
  expect(2);
  var container = generateContainer();
  var env = generateEnv(null, container);
  var view = {
    container: container
  };

  function someName() {}
  view.container.registry.register('helper:some-name', someName);

  var actual;
  expectAssertion(function() {
    actual = lookupHelper('some-name', view, env);
  }, 'Expected to find an Ember.Helper with the name some-name, but found something else instead.');
});

import lookupHelper, { findHelper } from "ember-htmlbars/system/lookup-helper";
import ComponentLookup from "ember-views/component_lookup";
import Registry from "container/registry";
import Helper from "ember-htmlbars/helper";

function generateEnv(helpers, container) {
  return {
    container: container,
    helpers: (helpers ? helpers : {}),
    hooks: { keywords: {} }
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
  view.container._registry.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  ok(someName.detect(actual), 'helper is an instance of the helper class');
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
  view.container._registry.register('helper:some-name', Helper.helper(someName));

  var actual = lookupHelper('some-name', view, env);

  ok(actual.isHelperInstance, 'is a helper');

  actual.compute([], {});

  ok(called, 'HTMLBars compatible wrapper is wraping the provided function');
});

QUnit.test('fails with a useful error when resolving a function', function() {
  expect(1);
  var container = generateContainer();
  var env = generateEnv(null, container);
  var view = {
    container: container
  };

  function someName() {}
  view.container._registry.register('helper:some-name', someName);

  expectAssertion(function() {
    lookupHelper('some-name', view, env);
  }, /The factory for "some-name" is not an Ember helper/);
});

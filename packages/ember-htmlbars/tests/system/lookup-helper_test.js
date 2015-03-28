import lookupHelper from "ember-htmlbars/system/lookup-helper";
import ComponentLookup from "ember-views/component_lookup";
import Registry from "container/registry";
import Component from "ember-views/views/component";

function generateEnv(helpers) {
  return {
    helpers: (helpers ? helpers : {})
  };
}

function generateContainer() {
  var registry = new Registry();
  var container = registry.container();

  registry.optionsForType('helper', { instantiate: false });
  registry.register('component-lookup:main', ComponentLookup);

  return container;
}

QUnit.module('ember-htmlbars: lookupHelper hook');

QUnit.test('looks for helpers in the provided `env.helpers`', function() {
  var env = generateEnv({
    'flubarb': function() { }
  });

  var actual = lookupHelper('flubarb', null, env);

  equal(actual, env.helpers.flubarb, 'helpers are looked up on env');
});

QUnit.test('returns undefined if no container exists (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {};

  var actual = lookupHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

QUnit.test('does not lookup in the container if the name does not contain a dash (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {
    container: {
      lookup: function() {
        ok(false, 'should not lookup in the container');
      }
    }
  };

  var actual = lookupHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

QUnit.test('does a lookup in the container if the name contains a dash (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  function someName() {}
  someName.isHTMLBars = true;
  view.container._registry.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  equal(actual, someName, 'does not wrap provided function if `isHTMLBars` is truthy');
});

QUnit.test('wraps helper from container in a Handlebars compat helper', function() {
  expect(2);
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };
  var called;

  function someName() {
    called = true;
  }
  view.container._registry.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  ok(actual.isHTMLBars, 'wraps provided helper in an HTMLBars compatible helper');

  var fakeParams = [];
  var fakeHash = {};
  var fakeOptions = {
    morph: { update: function() { } }
  };
  var fakeEnv = {};
  actual.helperFunction(fakeParams, fakeHash, fakeOptions, fakeEnv);

  ok(called, 'HTMLBars compatible wrapper is wraping the provided function');
});

QUnit.test('asserts if component-lookup:main cannot be found', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  view.container._registry.unregister('component-lookup:main');

  expectAssertion(function() {
    lookupHelper('some-name', view, env);
  }, 'Could not find \'component-lookup:main\' on the provided container, which is necessary for performing component lookups');
});

QUnit.test('registers a helper in the container if component is found', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  view.container._registry.register('component:some-name', Component);

  lookupHelper('some-name', view, env);

  ok(view.container.lookup('helper:some-name'), 'new helper was registered');
});

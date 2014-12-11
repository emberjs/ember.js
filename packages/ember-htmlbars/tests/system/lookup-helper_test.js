import lookupHelper from "ember-htmlbars/system/lookup-helper";
import ComponentLookup from "ember-views/component_lookup";
import Container from "container";
import Component from "ember-views/views/component";

function generateView(helpers) {
  return {
    helpers: (helpers ? helpers : {})
  };
}

function generateContainer() {
  var container = new Container();

  container.optionsForType('helper', { instantiate: false });
  container.register('component-lookup:main', ComponentLookup);

  return container;
}

QUnit.module('ember-htmlbars: lookupHelper hook');

test('looks for helpers in the provided `view.helpers`', function() {
  var view = generateView({
    'flubarb': function() { }
  });

  var actual = lookupHelper('flubarb', view);

  equal(actual, view.helpers.flubarb, 'helpers are looked up on env');
});

test('returns undefined if no container exists (and helper is not found in view)', function() {
  var view = generateView();

  var actual = lookupHelper('flubarb', view);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

test('does not lookup in the container if the name does not contain a dash (and helper is not found in view)', function() {
  var view = {
    helpers: {},
    container: {
      lookup: function() {
        ok(false, 'should not lookup in the container');
      }
    }
  };

  var actual = lookupHelper('flubarb', view);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

test('does a lookup in the container if the name contains a dash (and helper is not found in view)', function() {
  var view = {
    container: generateContainer(),
    helpers: {}
  };

  function someName() {}
  someName.isHTMLBars = true;
  view.container.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view);

  equal(actual, someName, 'does not wrap provided function if `isHTMLBars` is truthy');
});

test('wraps helper from container in a Handlebars compat helper', function() {
  expect(2);
  var view = {
    container: generateContainer(),
    helpers: {}
  };
  var called;

  function someName() {
    called = true;
  }
  view.container.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view);

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

test('asserts if component-lookup:main cannot be found', function() {
  var view = {
    container: generateContainer(),
    helpers: { }
  };

  view.container.unregister('component-lookup:main');

  expectAssertion(function() {
    lookupHelper('some-name', view);
  }, 'Could not find \'component-lookup:main\' on the provided container, which is necessary for performing component lookups');
});

test('registers a helper in the container if component is found', function() {
  var view = {
    container: generateContainer(),
    helpers: {}
  };

  view.container.register('component:some-name', Component);

  lookupHelper('some-name', view);

  ok(view.container.lookup('helper:some-name'), 'new helper was registered');
});

test('does not error if view.helpers is not present', function() {
  var view = {
    container: generateContainer()
  };

  var actual = lookupHelper('some-name', view);

  equal(actual, undefined, 'no helper was found');
});

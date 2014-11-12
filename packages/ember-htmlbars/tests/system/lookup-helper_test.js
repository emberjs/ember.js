import {
  concat,
  attribute,
  lookupHelper
} from "ember-htmlbars/system/lookup-helper";
import ComponentLookup from "ember-views/component_lookup";
import Container from "container";
import Component from "ember-views/views/component";

function generateEnv(helpers) {
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

test('returns concat when helper is `concat`', function() {
  var actual = lookupHelper('concat');

  equal(actual, concat, 'concat is a hard-coded helper');
});

test('returns attribute when helper is `attribute`', function() {
  var actual = lookupHelper('attribute');

  equal(actual, attribute, 'attribute is a hard-coded helper');
});

test('looks for helpers in the provided `env.helpers`', function() {
  var env = generateEnv({
    'flubarb': function() { }
  });

  var actual = lookupHelper('flubarb', null, env);

  equal(actual, env.helpers.flubarb, 'helpers are looked up on env');
});

test('returns undefined if no container exists (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {};

  var actual = lookupHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

test('does not lookup in the container if the name does not contain a dash (and helper is not found in env)', function() {
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

test('does a lookup in the container if the name contains a dash (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  function someName() {}
  view.container.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  equal(actual, someName, 'does not blow up if view does not have a container');
});

test('asserts if component-lookup:main cannot be found', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  view.container.unregister('component-lookup:main');

  expectAssertion(function() {
    lookupHelper('some-name', view, env);
  }, 'Could not find \'component-lookup:main\' on the provided container, which is necessary for performing component lookups');
});

test('registers a helper in the container if component is found', function() {
  var env = generateEnv();
  var view = {
    container: generateContainer()
  };

  view.container.register('component:some-name', Component);

  lookupHelper('some-name', view, env);

  ok(view.container.lookup('helper:some-name'), 'new helper was registered');
});

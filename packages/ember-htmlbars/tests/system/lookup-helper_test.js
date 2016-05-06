import lookupHelper, { findHelper } from 'ember-htmlbars/system/lookup-helper';
import ComponentLookup from 'ember-views/component_lookup';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

function generateEnv(helpers, owner) {
  return {
    owner: owner,
    helpers: (helpers ? helpers : {}),
    hooks: { keywords: {} },
    knownHelpers: {}
  };
}

function generateOwner() {
  let owner = buildOwner();

  owner.register('component-lookup:main', ComponentLookup);

  return owner;
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-htmlbars: lookupHelper hook');

test('looks for helpers in the provided `env.helpers`', function() {
  var env = generateEnv({
    'flubarb'() { }
  });

  var actual = lookupHelper('flubarb', null, env);

  equal(actual, env.helpers.flubarb, 'helpers are looked up on env');
});

test('returns undefined if no container exists (and helper is not found in env)', function() {
  var env = generateEnv();
  var view = {};

  var actual = findHelper('flubarb', view, env);

  equal(actual, undefined, 'does not blow up if view does not have a container');
});

test('does not lookup in the container if the name does not contain a dash (and helper is not found in env)', function() {
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

test('does a lookup in the container if the name contains a dash (and helper is not found in env)', function() {
  let owner = generateOwner();
  var env = generateEnv(null, owner);
  var view = {
    [OWNER]: owner
  };

  var someName = Helper.extend();
  owner.register('helper:some-name', someName);

  var actual = lookupHelper('some-name', view, env);

  ok(someName.detect(actual), 'helper is an instance of the helper class');
});

test('does a lookup in the container if the name is found in knownHelpers', function() {
  let owner = generateOwner();
  var env = generateEnv(null, owner);
  var view = {
    [OWNER]: owner
  };

  env.knownHelpers['t'] = true;
  var t = Helper.extend();
  owner.register('helper:t', t);

  var actual = lookupHelper('t', view, env);

  ok(t.detect(actual), 'helper is an instance of the helper class');
});

test('looks up a shorthand helper in the container', function() {
  expect(2);
  let owner = generateOwner();
  var env = generateEnv(null, owner);
  var view = {
    [OWNER]: owner
  };
  var called;

  function someName() {
    called = true;
  }
  owner.register('helper:some-name', makeHelper(someName));

  var actual = lookupHelper('some-name', view, env);

  ok(actual.isHelperInstance, 'is a helper');

  actual.compute([], {});

  ok(called, 'HTMLBars compatible wrapper is wraping the provided function');
});

test('fails with a useful error when resolving a function', function() {
  expect(1);
  let owner = generateOwner();
  var env = generateEnv(null, owner);
  var view = {
    [OWNER]: owner
  };

  function someName() {}
  owner.register('helper:some-name', someName);

  var actual;
  expectAssertion(function() {
    actual = lookupHelper('some-name', view, env);
  }, 'Expected to find an Ember.Helper with the name helper:some-name, but found an object of type function instead.');
});


import { run } from 'ember-metal';
import Test from '../test';
import Adapter from '../adapters/adapter';
import QUnitAdapter from '../adapters/qunit';
import { Application as EmberApplication } from 'ember-application';

var App, originalAdapter;

QUnit.module('ember-testing Adapters', {
  setup() {
    originalAdapter = Test.adapter;
  },
  teardown() {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;

    Test.adapter = originalAdapter;
  }
});

QUnit.test('Setting a test adapter manually', function() {
  expect(1);
  var CustomAdapter;

  CustomAdapter = Adapter.extend({
    asyncStart() {
      ok(true, 'Correct adapter was used');
    }
  });

  run(function() {
    App = EmberApplication.create();
    Test.adapter = CustomAdapter.create();
    App.setupForTesting();
  });

  Test.adapter.asyncStart();
});

QUnit.test('QUnitAdapter is used by default', function() {
  expect(1);

  Test.adapter = null;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  ok(Test.adapter instanceof QUnitAdapter);
});

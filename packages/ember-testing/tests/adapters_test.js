import { run } from 'ember-metal';
import Test from '../test';
import Adapter from '../adapters/adapter';
import QUnitAdapter from '../adapters/qunit';
import { Application as EmberApplication } from 'ember-application';

var App, originalAdapter, originalQUnit;

QUnit.module('ember-testing Adapters', {
  setup() {
    originalAdapter = Test.adapter;
    originalQUnit = window.QUnit;
  },
  teardown() {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;

    Test.adapter = originalAdapter;
    window.QUnit = originalQUnit;
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

QUnit.test('QUnitAdapter is used by default (if QUnit is available)', function() {
  expect(1);

  Test.adapter = null;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  ok(Test.adapter instanceof QUnitAdapter);
});

QUnit.test('Adapter is used by default (if QUnit is not available)', function() {
  expect(2);

  delete window.QUnit;

  Test.adapter = null;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  ok(Test.adapter instanceof Adapter);
  ok(!(Test.adapter instanceof QUnitAdapter));
});

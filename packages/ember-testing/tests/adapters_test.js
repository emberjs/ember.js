import { run } from 'ember-metal';
import Test from '../test';
import Adapter from '../adapters/adapter';
import QUnitAdapter from '../adapters/qunit';
import { Application as EmberApplication } from 'ember-application';

var App, originalAdapter, originalQUnit, originalWindowOnerror;

QUnit.module('ember-testing Adapters', {
  setup() {
    originalAdapter = Test.adapter;
    originalQUnit = window.QUnit;
    originalWindowOnerror = window.onerror;
  },
  teardown() {
    if (App) {
      run(App, App.destroy);
      App.removeTestHelpers();
      App = null;
    }

    Test.adapter = originalAdapter;
    window.QUnit = originalQUnit;
    window.onerror = originalWindowOnerror;
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

QUnit.test('With Ember.Test.adapter set, errors in synchronous Ember.run are bubbled out', function (assert) {
  let thrown = new Error('Boom!');

  let caughtInAdapter, caughtInCatch;
  Test.adapter = QUnitAdapter.create({
    exception(error) {
      caughtInAdapter = error;
    }
  });

  try {
    run(() => { throw thrown; });
  } catch(e) {
    caughtInCatch = e;
  }

  assert.equal(caughtInAdapter, undefined, 'test adapter should never receive synchronous errors');
  assert.equal(caughtInCatch, thrown, 'a "normal" try/catch should catch errors in sync run');
});

import { next, run } from '@ember/runloop';
import { setOnerror } from 'ember-error-handling';
import Test from '../lib/test';
import Adapter from '../lib/adapters/adapter';
import QUnitAdapter from '../lib/adapters/qunit';
import EmberApplication from '@ember/application';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { RSVP } from 'ember-runtime';
import { getDebugFunction, setDebugFunction } from '@ember/debug';

const originalDebug = getDebugFunction('debug');
const noop = function() {};

var App, originalAdapter, originalQUnit, originalWindowOnerror;

var originalConsoleError = console.error; // eslint-disable-line no-console

function runThatThrowsSync(message = 'Error for testing error handling') {
  return run(() => {
    throw new Error(message);
  });
}

function runThatThrowsAsync(message = 'Error for testing error handling') {
  return next(() => {
    throw new Error(message);
  });
}

class AdapterSetupAndTearDown extends AbstractTestCase {
  constructor() {
    setDebugFunction('debug', noop);
    super();
    originalAdapter = Test.adapter;
    originalQUnit = window.QUnit;
    originalWindowOnerror = window.onerror;
  }

  afterEach() {
    console.error = originalConsoleError; // eslint-disable-line no-console
  }

  teardown() {
    setDebugFunction('debug', originalDebug);
    if (App) {
      run(App, App.destroy);
      App.removeTestHelpers();
      App = null;
    }

    Test.adapter = originalAdapter;
    window.QUnit = originalQUnit;
    window.onerror = originalWindowOnerror;
    setOnerror(undefined);
  }
}

moduleFor(
  'ember-testing Adapters',
  class extends AdapterSetupAndTearDown {
    ['@test Setting a test adapter manually'](assert) {
      assert.expect(1);
      var CustomAdapter;

      CustomAdapter = Adapter.extend({
        asyncStart() {
          assert.ok(true, 'Correct adapter was used');
        },
      });

      run(function() {
        App = EmberApplication.create();
        Test.adapter = CustomAdapter.create();
        App.setupForTesting();
      });

      Test.adapter.asyncStart();
    }

    ['@test QUnitAdapter is used by default (if QUnit is available)'](assert) {
      assert.expect(1);

      Test.adapter = null;

      run(function() {
        App = EmberApplication.create();
        App.setupForTesting();
      });

      assert.ok(Test.adapter instanceof QUnitAdapter);
    }

    ['@test Adapter is used by default (if QUnit is not available)'](assert) {
      assert.expect(2);

      delete window.QUnit;

      Test.adapter = null;

      run(function() {
        App = EmberApplication.create();
        App.setupForTesting();
      });

      assert.ok(Test.adapter instanceof Adapter);
      assert.ok(!(Test.adapter instanceof QUnitAdapter));
    }

    ['@test With Ember.Test.adapter set, errors in synchronous Ember.run are bubbled out'](assert) {
      let thrown = new Error('Boom!');

      let caughtInAdapter, caughtInCatch;
      Test.adapter = QUnitAdapter.create({
        exception(error) {
          caughtInAdapter = error;
        },
      });

      try {
        run(() => {
          throw thrown;
        });
      } catch (e) {
        caughtInCatch = e;
      }

      assert.equal(
        caughtInAdapter,
        undefined,
        'test adapter should never receive synchronous errors'
      );
      assert.equal(caughtInCatch, thrown, 'a "normal" try/catch should catch errors in sync run');
    }

    ['@test when both Ember.onerror (which rethrows) and TestAdapter are registered - sync run'](
      assert
    ) {
      assert.expect(2);

      Test.adapter = {
        exception() {
          assert.notOk(true, 'adapter is not called for errors thrown in sync run loops');
        },
      };

      setOnerror(function(error) {
        assert.ok(true, 'onerror is called for sync errors even if TestAdapter is setup');
        throw error;
      });

      assert.throws(runThatThrowsSync, Error, 'error is thrown');
    }

    ['@test when both Ember.onerror (which does not rethrow) and TestAdapter are registered - sync run'](
      assert
    ) {
      assert.expect(2);

      Test.adapter = {
        exception() {
          assert.notOk(true, 'adapter is not called for errors thrown in sync run loops');
        },
      };

      setOnerror(function() {
        assert.ok(true, 'onerror is called for sync errors even if TestAdapter is setup');
      });

      runThatThrowsSync();
      assert.ok(true, 'no error was thrown, Ember.onerror can intercept errors');
    }

    ['@test when TestAdapter is registered and error is thrown - async run'](assert) {
      assert.expect(3);
      let done = assert.async();

      let caughtInAdapter, caughtInCatch, caughtByWindowOnerror;
      Test.adapter = {
        exception(error) {
          caughtInAdapter = error;
        },
      };

      window.onerror = function(message) {
        caughtByWindowOnerror = message;
        // prevent "bubbling" and therefore failing the test
        return true;
      };

      try {
        runThatThrowsAsync();
      } catch (e) {
        caughtInCatch = e;
      }

      setTimeout(() => {
        assert.equal(
          caughtInAdapter,
          undefined,
          'test adapter should never catch errors in run loops'
        );
        assert.equal(
          caughtInCatch,
          undefined,
          'a "normal" try/catch should never catch errors in an async run'
        );

        assert.pushResult({
          result: /Error for testing error handling/.test(caughtByWindowOnerror),
          actual: caughtByWindowOnerror,
          expected: 'to include `Error for testing error handling`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)',
        });

        done();
      }, 20);
    }

    ['@test when both Ember.onerror and TestAdapter are registered - async run'](assert) {
      assert.expect(1);
      let done = assert.async();

      Test.adapter = {
        exception() {
          assert.notOk(true, 'Adapter.exception is not called for errors thrown in next');
        },
      };

      setOnerror(function() {
        assert.ok(true, 'onerror is invoked for errors thrown in next/later');
      });

      runThatThrowsAsync();
      setTimeout(done, 10);
    }
  }
);

function testAdapter(message, generatePromise, timeout = 10) {
  return class PromiseFailureTests extends AdapterSetupAndTearDown {
    [`@test ${message} when TestAdapter without \`exception\` method is present - rsvp`](assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      Test.adapter = QUnitAdapter.create({
        exception: undefined,
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)',
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, timeout));
    }

    [`@test ${message} when both Ember.onerror and TestAdapter without \`exception\` method are present - rsvp`](
      assert
    ) {
      assert.expect(1);

      let thrown = new Error('the error');
      Test.adapter = QUnitAdapter.create({
        exception: undefined,
      });

      setOnerror(function(error) {
        assert.pushResult({
          result: /the error/.test(error.message),
          actual: error.message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)',
        });
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, timeout));
    }

    [`@test ${message} when TestAdapter is present - rsvp`](assert) {
      assert.expect(1);

      console.error = () => {}; // eslint-disable-line no-console
      let thrown = new Error('the error');
      Test.adapter = QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(
            error,
            thrown,
            'Adapter.exception is called for errors thrown in RSVP promises'
          );
        },
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, timeout));
    }

    [`@test ${message} when both Ember.onerror and TestAdapter are present - rsvp`](assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      Test.adapter = QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(
            error,
            thrown,
            'Adapter.exception is called for errors thrown in RSVP promises'
          );
        },
      });

      setOnerror(function() {
        assert.notOk(true, 'Ember.onerror is not called if Test.adapter does not rethrow');
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, timeout));
    }

    [`@test ${message} when both Ember.onerror and TestAdapter are present - rsvp`](assert) {
      assert.expect(2);

      let thrown = new Error('the error');
      Test.adapter = QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(
            error,
            thrown,
            'Adapter.exception is called for errors thrown in RSVP promises'
          );
          throw error;
        },
      });

      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises if Test.adapter rethrows'
        );
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, timeout));
    }
  };
}

moduleFor(
  'Adapter Errors: .then callback',
  testAdapter('errors in promise constructor', error => {
    new RSVP.Promise(() => {
      throw error;
    });
  })
);

moduleFor(
  'Adapter Errors: Promise Contructor',
  testAdapter('errors in promise constructor', error => {
    RSVP.resolve().then(() => {
      throw error;
    });
  })
);

moduleFor(
  'Adapter Errors: Promise chain .then callback',
  testAdapter(
    'errors in promise constructor',
    error => {
      new RSVP.Promise(resolve => setTimeout(resolve, 10)).then(() => {
        throw error;
      });
    },
    20
  )
);
